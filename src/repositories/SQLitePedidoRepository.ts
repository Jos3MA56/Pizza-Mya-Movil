import { exigirActorLocal } from '../services/SesionLocal';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Pedido, ProductoComanda } from '../models/Pedido';
import type { PedidoRepository, ObservadorPedido } from './PedidoRepository';
import { PedidoSubject } from '../observers/PedidoSubject';
import { obtenerBaseDatos, transaccionLocal } from '../services/storage/database';

type Documento = Omit<Pedido, 'total' | 'productos'> & { totalCentavos: number; productos: (Omit<ProductoComanda, 'precioUnitario' | 'subtotal'> & { precioCentavos: number; subtotalCentavos: number })[] };
export function serializarPedido(p: Pedido): string {
  const productos = (p.productos ?? []).map(({ precioUnitario, subtotal, ...item }) => {
    const precioCentavos = Math.round(precioUnitario * 100);
    if (!Number.isSafeInteger(precioCentavos) || precioCentavos < 0 || !Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 99) throw new Error('Cantidad o precio inválido.');
    const subtotalCentavos = precioCentavos * item.cantidad;
    if (!Number.isSafeInteger(subtotalCentavos)) throw new Error('Importe fuera de rango.');
    return { ...item, precioCentavos, subtotalCentavos };
  });
  if (new Set(productos.map(p => p.id)).size !== productos.length || productos.some(p => !p.id?.trim() || !p.productoId?.trim())) throw new Error('Identificadores de producto inválidos o repetidos.');
  const totalCentavos = productos.filter(p => p.estado !== 'cancelado').reduce((n, p) => n + p.subtotalCentavos, 0);
  if (!Number.isSafeInteger(totalCentavos)) throw new Error('Total fuera de rango.');
  const { total, productos: anteriores, ...datos } = p;
  return JSON.stringify({ ...datos, productos, totalCentavos });
}
export function leerPedido(json: string): Pedido {
  const { totalCentavos, productos, ...datos } = JSON.parse(json) as Documento;
  return { ...datos, total: totalCentavos / 100, productos: productos.map(({ precioCentavos, subtotalCentavos, ...p }) => ({ ...p, precioUnitario: precioCentavos / 100, subtotal: subtotalCentavos / 100 })) };
}
export class SQLitePedidoRepository implements PedidoRepository {
  private eventos = new PedidoSubject();
  constructor(private base: () => Promise<SQLiteDatabase> = obtenerBaseDatos) {}
  private async leer(db: SQLiteDatabase, id: string) {
    const fila = await db.getFirstAsync<{ documento: string }>('SELECT documento FROM pedidos_mvvm WHERE id = ?', id);
    return fila ? leerPedido(fila.documento) : null;
  }
  async obtenerPorId(id: string) {
    const usuario = exigirActorLocal('mesero');
    const p = await this.leer(await this.base(), id);
    if (p && p.creadoPor !== usuario.id) throw new Error('Comanda de otro mesero.');
    if (p) p.preparada = Boolean(await (await this.base()).getFirstAsync('SELECT pedido_id FROM preparaciones_mvvm WHERE pedido_id=?', id));
    return p;
  }
  async obtenerComandaPorMesa(mesa: number) {
    const usuario = exigirActorLocal('mesero');
    const fila = await (await this.base()).getFirstAsync<{ documento: string }>("SELECT documento FROM pedidos_mvvm WHERE mesa = ? AND estado != 'cancelado'", mesa);
    const p = fila ? leerPedido(fila.documento) : null;
    if (p && p.creadoPor !== usuario.id) throw new Error('Mesa de otro mesero.');
    return p;
  }
  async listarComandasActivas() {
    const usuario = exigirActorLocal('mesero');
    return (await (await this.base()).getAllAsync<{ documento: string }>("SELECT documento FROM pedidos_mvvm WHERE estado != 'cancelado' AND usuario = ? ORDER BY mesa", usuario.id)).map(f => leerPedido(f.documento));
  }
  private async escribir(db: SQLiteDatabase, pedido: Pedido) {
    if (!Number.isInteger(pedido.mesaId) || pedido.mesaId! < 1 || pedido.mesaId! > 50 || !pedido.creadoPor?.trim()) throw new Error('Mesa o mesero inválido.');
    await db.runAsync('INSERT INTO pedidos_mvvm(id, mesa, usuario, estado, documento) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET estado=excluded.estado, documento=excluded.documento', pedido.id, pedido.mesaId!, pedido.creadoPor, pedido.estado, serializarPedido(pedido));
  }
  async guardar(pedido: Pedido) {
    if (exigirActorLocal('mesero').id !== pedido.creadoPor) throw new Error('Mesero no autorizado.');
    if (pedido.estado === 'enviado') throw new Error('El envío requiere confirmación del POS.');
    const db = await this.base();
    let guardado = pedido;
    await transaccionLocal(db, async tx => {
      const anterior = await this.leer(tx, pedido.id);
      if (anterior && (anterior.estado !== 'borrador' || anterior.creadoPor !== pedido.creadoPor || anterior.mesaId !== pedido.mesaId)) throw new Error('Esta comanda no permite edición local.');
      if (await tx.getFirstAsync('SELECT pedido_id FROM preparaciones_mvvm WHERE pedido_id = ?', pedido.id)) throw new Error('La instantánea está bloqueada.');
      if (anterior && (anterior.revision ?? 0) !== (pedido.revision ?? 0)) throw new Error('La comanda cambió. Vuelve a abrirla antes de guardar.');
      guardado = { ...pedido, revision: (anterior?.revision ?? 0) + 1 };
      await this.escribir(tx, guardado);
    });
    this.eventos.notificar(leerPedido(serializarPedido(guardado)));
  }
  async crearComanda(mesaId: number, usuarioId: string) {
    if (exigirActorLocal('mesero').id !== usuarioId) throw new Error('Mesero no autorizado.');
    const db = await this.base();
    let pedido!: Pedido;
    await transaccionLocal(db, async tx => {
      const fila = await tx.getFirstAsync<{ documento: string }>("SELECT documento FROM pedidos_mvvm WHERE mesa = ? AND estado != 'cancelado'", mesaId);
      if (fila) {
        pedido = leerPedido(fila.documento);
        if (pedido.creadoPor !== usuarioId) throw new Error('La mesa pertenece a otro mesero.');
        return;
      }
      const fecha = new Date().toISOString(), id = (await import('expo-crypto')).randomUUID();
      pedido = { id, revision: 0, mesaId, creadoPor: usuarioId, estado: 'borrador', total: 0, productos: [], creadoEn: fecha, actualizadoEn: fecha, historial: [{ id: (await import('expo-crypto')).randomUUID(), fecha, usuarioId, accion: 'crear', descripcion: `Comanda creada para mesa ${mesaId}` }] };
      await this.escribir(tx, pedido);
    });
    this.eventos.notificar(pedido);
    return pedido;
  }
  async agregarProducto(id: string, producto: ProductoComanda, usuarioId: string) {
    if (exigirActorLocal('mesero').id !== usuarioId) throw new Error('Mesero no autorizado.');
    const db = await this.base();
    let pedido!: Pedido;
    await transaccionLocal(db, async tx => {
      const actual = await this.leer(tx, id);
      if (!actual || actual.creadoPor !== usuarioId || actual.estado !== 'borrador') throw new Error('No puedes editar esta comanda.');
      if (await tx.getFirstAsync('SELECT pedido_id FROM preparaciones_mvvm WHERE pedido_id = ?', id)) throw new Error('La instantánea está bloqueada.');
      if (actual.productos?.some(p => p.id === producto.id)) throw new Error('El registro ya existe.');
      const fecha = new Date().toISOString();
      pedido = leerPedido(serializarPedido({ ...actual, revision: (actual.revision ?? 0) + 1, productos: [...(actual.productos ?? []), producto], actualizadoEn: fecha, historial: [...(actual.historial ?? []), { id: (await import('expo-crypto')).randomUUID(), fecha, usuarioId, accion: 'agregar_producto', descripcion: `${producto.cantidad} x ${producto.nombre} ${producto.tamanio ?? ''}` }] }));
      await this.escribir(tx, pedido);
    });
    this.eventos.notificar(pedido);
    return pedido;
  }
  suscribir(id: string, observador: ObservadorPedido) { return this.eventos.suscribir(id, observador); }
}
