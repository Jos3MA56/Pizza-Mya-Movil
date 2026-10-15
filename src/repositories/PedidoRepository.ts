import type { Pedido, ProductoComanda } from "../models/Pedido";

export type ObservadorPedido = (pedido: Pedido) => void;

export interface PedidoRepository {
  obtenerPorId(id: string): Promise<Pedido | null>;

  guardar(pedido: Pedido): Promise<void>;

  suscribir(id: string, observador: ObservadorPedido): () => void;

  obtenerComandaPorMesa(mesaId: number): Promise<Pedido | null>;

  listarComandasActivas(): Promise<Pedido[]>;

  crearComanda(mesaId: number, usuarioId: string): Promise<Pedido>;

  agregarProducto(
    pedidoId: string,
    producto: ProductoComanda,
    usuarioId: string,
  ): Promise<Pedido>;
}
