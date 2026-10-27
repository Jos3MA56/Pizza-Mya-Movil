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

// Nombre de categoría del backend; no limitar a las tres categorías del prototipo.
export type CategoriaProducto = string;

export interface ProductoComanda {
  id: string;
  productoId: string;
  nombre: string;
  categoria: CategoriaProducto;
  categoriaId?: string;
  productoTamanioId?: string;
  tamanioId?: string;
  tamanio?: string;
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
  revision?: number;
  preparada?: boolean;
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
