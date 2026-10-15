/**
 * Modelo de dominio de Pizza Mya Móvil.
 * No depende de React ni de servicios HTTP.
 */

export type EstadoPedido = "borrador" | "enviado" | "cancelado";

export type EstadoProducto =
  | "pendiente"
  | "en_preparacion"
  | "listo"
  | "entregado"
  | "cancelado";

export type CategoriaProducto = "pizza" | "complemento" | "bebida";

export interface ProductoComanda {
  id: string;
  productoId: string;
  nombre: string;
  categoria: CategoriaProducto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  estado: EstadoProducto;
  observaciones?: string;
}

export interface CambioComanda {
  id: string;
  fecha: string;
  usuarioId: string;
  accion:
    | "crear"
    | "agregar_producto"
    | "editar_producto"
    | "cancelar_producto";
  descripcion: string;
}

export interface Pedido {
  id: string;
  folio?: string;
  estado: EstadoPedido;
  total: number;

  // Campos adicionales para la Iteración 2.
  mesaId?: number;
  productos?: ProductoComanda[];
  observaciones?: string;
  creadoPor?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  historial?: CambioComanda[];
}
