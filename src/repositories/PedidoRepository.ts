import type { Pedido } from '../models/Pedido';

/** Contrato de acceso a pedidos. Las implementaciones remota/local se añadirán en su tarea. */
export interface PedidoRepository {
  obtenerPorId(id: string): Promise<Pedido | null>;
}
