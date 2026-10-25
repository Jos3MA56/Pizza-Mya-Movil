import {solicitudPOS, consultarPedidoPOS} from './sync/PosLanClient';
import {crearPayloadPOS} from './sync/CrearPayloadPOS';
import * as Crypto from 'expo-crypto';
import { obtenerBaseDatos, transaccionLocal } from './storage/database';
import { leerPedido } from '../repositories/SQLitePedidoRepository';
import { exigirActorLocal } from './SesionLocal';
import { syncService } from './sync/SyncService';
import { obtenerConfiguracionPOS } from './sync/PosLanConfig';
import type { OperacionLocal } from '../repositories/OperacionPendienteRepository';

export async function prepararComanda(id: string) {
  const usuario = exigirActorLocal('mesero');
  const db = await obtenerBaseDatos();
  await transaccionLocal(db, async tx => {
    const fila = await tx.getFirstAsync<{ documento: string }>('SELECT documento FROM pedidos_mvvm WHERE id = ? AND usuario = ?', id, usuario.id);
    if (!fila) throw new Error('Comanda no disponible para este mesero.');
    const pedido = leerPedido(fila.documento);
    if (pedido.estado !== 'borrador' || !pedido.productos?.some(p => p.estado !== 'cancelado')) throw new Error('Se requiere un borrador con productos.');
    if (await tx.getFirstAsync('SELECT pedido_id FROM preparaciones_mvvm WHERE pedido_id = ?', id)) return;
    const request = Crypto.randomUUID();
    const fecha = new Date().toISOString();
    const payload = crearPayloadPOS(pedido,request);
    await tx.runAsync('INSERT INTO preparaciones_mvvm(pedido_id, request_id, documento, motivo) VALUES (?,?,?,?)', id, request, fila.documento, 'Contrato LAN v2');
    await tx.runAsync("INSERT INTO comandas_locales(id_local, mesa_id, mesero_id, estado_sync, creada_en, actualizada_en) VALUES (?,?,?,'PENDIENTE',?,?) ON CONFLICT(id_local) DO UPDATE SET estado_sync='PENDIENTE', actualizada_en=excluded.actualizada_en", id, String(pedido.mesaId), usuario.id, fecha, fecha);
    await tx.runAsync("INSERT INTO operaciones_pendientes(id_operacion, comanda_id, mesero_id, tipo, payload_json, estado, creada_en) VALUES (?,?,?,'COMANDA_CREAR',?,'PENDIENTE',?)", request, id, usuario.id, JSON.stringify(payload), fecha);
  });
}
export async function listarSeguimiento() {
  const usuario = exigirActorLocal('mesero');
  return (await obtenerBaseDatos()).getAllAsync<OperacionLocal & { version_contrato: number | null; id_servidor: string | null; folio_confirmado: string | null; total_confirmado_centavos: number | null; total_local_centavos: number | null }>(`SELECT o.*, json_extract(o.payload_json, '$.versionContrato') AS version_contrato, c.id_servidor, c.folio_confirmado, c.total_confirmado_centavos, json_extract(p.documento, '$.totalCentavos') AS total_local_centavos FROM operaciones_pendientes o JOIN comandas_locales c ON c.id_local=o.comanda_id LEFT JOIN preparaciones_mvvm p ON p.pedido_id=o.comanda_id WHERE o.mesero_id=? AND o.tipo='COMANDA_CREAR' ORDER BY o.creada_en DESC`, usuario.id);
}
export async function reintentarSeguimiento(id: string) {
  const operacion = (await listarSeguimiento()).find(o => o.id_operacion === id);
  if (!operacion) throw new Error('Operación no autorizada.');
  const config = await obtenerConfiguracionPOS();
  if (!config) throw new Error('Configura la conexión LAN en la pantalla de conexión.');
  if (operacion.estado === 'RECHAZADA') {
    if(operacion.intentos>=6)throw new Error('Limite de intentos alcanzado.');
    // Solo un rechazo explicito sin escritura permite este reintento manual.
    // Un timeout/404 de resultado desconocido sigue sin autorizar reenvio.
    if(!/^HTTP_(401|403|422)(:|$)/.test(operacion.ultimo_error??''))throw new Error('Este rechazo necesita revision antes de reintentar.');
    const salud=await solicitudPOS(config.urlBase,config.token,'/health');
    if(!salud?.data?.contratos?.includes(2))throw new Error('Estas conectado al POS anterior. Inicia el receptor nuevo en el puerto 3101 y actualiza la conexion LAN.');
    const existente=await consultarPedidoPOS({...config,requestId:id});
    const db=await obtenerBaseDatos();
    await transaccionLocal(db,async tx=>{
      const cambio=await tx.runAsync("UPDATE operaciones_pendientes SET estado=?,proximo_intento_en=NULL WHERE id_operacion=? AND mesero_id=? AND estado='RECHAZADA'",existente?'RESULTADO_DESCONOCIDO':'PENDIENTE',id,exigirActorLocal('mesero').id);
      if(cambio.changes!==1)throw new Error('La operacion cambio; actualiza Seguimiento.');
    });
    if(existente)return syncService.conciliarOperacionPOS(id,config.urlBase,config.token);
    return syncService.enviarOperacionPOS(id,config.urlBase,config.token);
  }
  if (operacion.estado === 'RESULTADO_DESCONOCIDO') return syncService.conciliarOperacionPOS(id, config.urlBase, config.token);
  if (operacion.intentos >= 6) throw new Error('Límite de intentos alcanzado.');
  if (operacion.estado !== 'PENDIENTE' && operacion.estado !== 'ERROR_REINTENTABLE') throw new Error('Operación bloqueada o finalizada.');
  return syncService.enviarOperacionPOS(id, config.urlBase, config.token);
}

export async function prepararYEnviar(id:string) {
  await prepararComanda(id);
  const operacion=(await listarSeguimiento()).find(o=>o.comanda_id===id&&o.estado!=='CANCELADA');
  if(!operacion)throw new Error('No existe una operacion preparada.');
  if(operacion.estado==='CONFIRMADA')return;
  return reintentarSeguimiento(operacion.id_operacion);
}
export async function cancelarPreparacion(id:string) {
  const usuario=exigirActorLocal('mesero'),db=await obtenerBaseDatos();
  await transaccionLocal(db,async tx=>{
    const o=await tx.getFirstAsync<{comanda_id:string;estado:string;intentos:number}>("SELECT comanda_id,estado,intentos FROM operaciones_pendientes WHERE id_operacion=? AND mesero_id=?",id,usuario.id);
    if(!o||o.intentos!==0||!['BLOQUEADA','PENDIENTE'].includes(o.estado))throw new Error('Solo puedes desbloquear una preparacion que nunca fue enviada. Si hubo intento, requiere conciliacion.');
    await tx.runAsync('INSERT INTO preparaciones_archivo(request_id,documento,cancelada_en) SELECT request_id,documento,? FROM preparaciones_mvvm WHERE request_id=?',new Date().toISOString(),id);
    await tx.runAsync("UPDATE operaciones_pendientes SET estado='CANCELADA',ultimo_error='CANCELADA_ANTES_DE_ENVIO' WHERE id_operacion=?",id);
    await tx.runAsync('DELETE FROM preparaciones_mvvm WHERE request_id=?',id);
    await tx.runAsync("UPDATE comandas_locales SET estado_sync='BORRADOR' WHERE id_local=?",o.comanda_id);
  });
}
