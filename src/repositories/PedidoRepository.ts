import type { Pedido } from '../models/Pedido';

/** Observador que recibe el estado actualizado de un pedido. */
export type ObservadorPedido = (pedido: Pedido) => void;

/**
 * Contrato de acceso a pedidos independiente de su origen de datos.
 * Las implementaciones remotas o persistentes se abordarán en otras tareas.
 */
export interface PedidoRepository {
  obtenerPorId(id: string): Promise<Pedido | null>;
  guardar(pedido: Pedido): Promise<void>;
  suscribir(id: string, observador: ObservadorPedido): () => void;
}
