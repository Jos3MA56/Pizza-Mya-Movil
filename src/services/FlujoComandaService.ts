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
    const motivos = ['No existe correspondencia verificada de productoId con el catálogo POS.'];
    if (pedido.productos.some(p => p.productoTamanioId || p.tamanioId || p.tamanio)) motivos.push('El contrato POS no representa presentaciones.');
    if (pedido.observaciones?.trim() || pedido.productos.some(p => p.observaciones?.trim())) motivos.push('El contrato POS no admite observaciones.');
    const motivo = motivos.join(' '), fecha = new Date().toISOString();
    await tx.runAsync('INSERT INTO preparaciones_mvvm(pedido_id, request_id, documento, motivo) VALUES (?,?,?,?)', id, request, fila.documento, motivo);
    await tx.runAsync("INSERT INTO comandas_locales(id_local, mesa_id, mesero_id, estado_sync, creada_en, actualizada_en) VALUES (?,?,?,'BLOQUEADA',?,?)", id, String(pedido.mesaId), usuario.id, fecha, fecha);
    // No convertir la instantánea rica al contrato simple: sería pérdida de información.
    await tx.runAsync("INSERT INTO operaciones_pendientes(id_operacion, comanda_id, mesero_id, tipo, payload_json, estado, ultimo_error, creada_en) VALUES (?,?,?,'COMANDA_CREAR',?,'BLOQUEADA',?,?)", request, id, usuario.id, JSON.stringify({ requestId: request, instantanea: JSON.parse(fila.documento) }), motivo, fecha);
  });
}
export async function listarSeguimiento() {
  const usuario = exigirActorLocal('mesero');
  return (await obtenerBaseDatos()).getAllAsync<OperacionLocal & { id_servidor: string | null; folio_confirmado: string | null; total_confirmado_centavos: number | null; total_local_centavos: number | null }>(`SELECT o.*, c.id_servidor, c.folio_confirmado, c.total_confirmado_centavos, json_extract(p.documento, '$.totalCentavos') AS total_local_centavos FROM operaciones_pendientes o JOIN comandas_locales c ON c.id_local=o.comanda_id LEFT JOIN preparaciones_mvvm p ON p.pedido_id=o.comanda_id WHERE o.mesero_id=? AND o.tipo='COMANDA_CREAR' ORDER BY o.creada_en DESC`, usuario.id);
}
export async function reintentarSeguimiento(id: string) {
  const operacion = (await listarSeguimiento()).find(o => o.id_operacion === id);
  if (!operacion) throw new Error('Operación no autorizada.');
  const config = await obtenerConfiguracionPOS();
  if (!config) throw new Error('Configura la conexión LAN en la pantalla de conexión.');
  if (operacion.estado === 'RESULTADO_DESCONOCIDO') return syncService.conciliarOperacionPOS(id, config.urlBase, config.token);
  if (operacion.intentos >= 6) throw new Error('Límite de intentos alcanzado.');
  if (operacion.estado !== 'PENDIENTE' && operacion.estado !== 'ERROR_REINTENTABLE') throw new Error('Operación bloqueada o finalizada.');
  return syncService.enviarOperacionPOS(id, config.urlBase, config.token);
}
