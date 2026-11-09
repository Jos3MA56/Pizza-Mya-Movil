import * as Crypto from 'expo-crypto';
import { obtenerBaseDatos, transaccionLocal } from './storage/database';
import { exigirActorLocal } from './SesionLocal';
import { leerPedido } from '../repositories/SQLitePedidoRepository';
import type { Pedido } from '../models/Pedido';
export type EstadoCocinaDemo = 'pendiente' | 'en_preparacion' | 'listo';
export type EscenarioDemo = 'confirmar' | 'red' | 'timeout' | 'rechazar' | 'conflicto' | 'perder_respuesta';
export interface EnvioDemo { id: string; origen: string; usuario: string; documento: string; estado: string; intentos: number; siguiente: number; remoto: string | null }
export interface ReciboDemo { id: string; folio: string; totalCentavos: number }
export interface TransporteDemo {
  enviar(envio: EnvioDemo, escenario: EscenarioDemo): Promise<ReciboDemo>;
  consultar(id: string): Promise<ReciboDemo | null>;
}
const transporteLocal: TransporteDemo = {
  async enviar(envio, escenario) {
    if (escenario === 'red' || escenario === 'timeout' || escenario === 'rechazar' || escenario === 'conflicto') throw new Error(escenario);
    const db = await obtenerBaseDatos();
    const recibo = { id: envio.id, folio: `DEMO-${envio.id.slice(0, 8)}`, totalCentavos: JSON.parse(envio.documento).totalCentavos };
    await db.runAsync('INSERT OR IGNORE INTO demo_recibos(id,documento) VALUES (?,?)', envio.id, JSON.stringify(recibo));
    if (escenario === 'perder_respuesta') throw new Error('desconocido');
    return (await this.consultar(envio.id))!;
  },
  async consultar(id) {
    const fila = await (await obtenerBaseDatos()).getFirstAsync<{ documento: string }>('SELECT documento FROM demo_recibos WHERE id=?', id);
    return fila ? JSON.parse(fila.documento) as ReciboDemo : null;
  },
};
let ocupado = false;
export class DemoCocinaService {
  constructor(private transporte: TransporteDemo = transporteLocal, private ahora = Date.now, private base = obtenerBaseDatos) {}
  async crear(origen: string) {
    const usuario = exigirActorLocal('mesero');
    const db = await this.base();
    await transaccionLocal(db, async tx => {
      const fila = await tx.getFirstAsync<{ documento: string }>('SELECT documento FROM pedidos_mvvm WHERE id=? AND usuario=?', origen, usuario.id);
      if (!fila || !leerPedido(fila.documento).productos?.length) throw new Error('Se requiere comanda propia con productos.');
      await tx.runAsync("INSERT OR IGNORE INTO demo_envios(id,origen,usuario,documento,estado) VALUES (?,?,?,?,'PENDIENTE')", Crypto.randomUUID(), origen, usuario.id, fila.documento);
    });
  }
  async listar() {
    const usuario = exigirActorLocal('mesero');
    return (await this.base()).getAllAsync<EnvioDemo>('SELECT * FROM demo_envios WHERE usuario=?', usuario.id);
  }
  private async confirmar(envio: EnvioDemo, recibo: ReciboDemo) {
    if (recibo.id !== envio.id || !recibo.folio.startsWith('DEMO-') || !Number.isSafeInteger(recibo.totalCentavos)) throw new Error('Recibo simulado inválido.');
    const db = await this.base();
    await transaccionLocal(db, async tx => {
      await tx.runAsync("UPDATE demo_envios SET estado='CONFIRMADA', remoto=? WHERE id=?", JSON.stringify(recibo), envio.id);
      await tx.runAsync("INSERT OR IGNORE INTO cocina_demo(id,documento,estado) VALUES (?,?,'pendiente')", envio.id, envio.documento);
    });
  }
  async procesar(id: string, escenario: EscenarioDemo = 'confirmar') {
    if (ocupado) throw new Error('Ya existe una simulación en curso.');
    ocupado = true;
    try {
      const envio = (await this.listar()).find(e => e.id === id);
      if (!envio) throw new Error('Simulación no autorizada.');
      if (envio.estado === 'RESULTADO_DESCONOCIDO' || envio.estado === 'ENVIANDO') {
        const recibo = await this.transporte.consultar(id);
        if (recibo) await this.confirmar(envio, recibo);
        else await (await this.base()).runAsync("UPDATE demo_envios SET estado='RESULTADO_DESCONOCIDO' WHERE id=?", id);
        return; // Un 404 simulado tampoco autoriza reenvío.
      }
      if (!['PENDIENTE','ERROR_REINTENTABLE'].includes(envio.estado) || envio.intentos >= 6 || envio.siguiente > this.ahora()) throw new Error('Espera el siguiente intento o revisa el estado.');
      const db = await this.base();
      const cambio = await db.runAsync("UPDATE demo_envios SET estado='ENVIANDO', intentos=intentos+1 WHERE id=? AND estado IN ('PENDIENTE','ERROR_REINTENTABLE')", id);
      if (cambio.changes !== 1) throw new Error('Simulación ocupada.');
      try { await this.confirmar(envio, await this.transporte.enviar(envio, escenario)); }
      catch (error) {
        const mensaje = error instanceof Error ? error.message : 'desconocido';
        const estado = mensaje === 'red' ? 'ERROR_REINTENTABLE' : mensaje === 'rechazar' ? 'RECHAZADA' : mensaje === 'conflicto' ? 'CONFLICTO' : 'RESULTADO_DESCONOCIDO';
        await db.runAsync('UPDATE demo_envios SET estado=?, siguiente=? WHERE id=?', estado, this.ahora() + Math.min(5000 * 2 ** envio.intentos, 300000), id);
      }
    } finally { ocupado = false; }
  }
  async cocina(): Promise<{ id: string; pedido: Pedido; estado: EstadoCocinaDemo }[]> {
    exigirActorLocal('cocina');
    return (await (await this.base()).getAllAsync<{ id: string; documento: string; estado: EstadoCocinaDemo }>('SELECT * FROM cocina_demo')).map(f => ({ id: f.id, pedido: leerPedido(f.documento), estado: f.estado }));
  }
  async avanzar(id: string, estado: EstadoCocinaDemo) {
    exigirActorLocal('cocina');
    const siguiente = estado === 'pendiente' ? 'en_preparacion' : estado === 'en_preparacion' ? 'listo' : null;
    if (!siguiente) throw new Error('La comanda ya está lista.');
    const resultado = await (await this.base()).runAsync('UPDATE cocina_demo SET estado=? WHERE id=? AND estado=?', siguiente, id, estado);
    if (resultado.changes !== 1) throw new Error('El estado cambió. Actualiza el tablero.');
  }
  async estadoCocina(id: string) {
    if (!(await this.listar()).some(e => e.id === id)) throw new Error('No autorizado.');
    return (await this.base()).getFirstAsync<{ estado: EstadoCocinaDemo }>('SELECT estado FROM cocina_demo WHERE id=?', id);
  }
}
export const demoCocinaService = new DemoCocinaService();
