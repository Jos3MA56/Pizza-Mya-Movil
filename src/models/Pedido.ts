/** Modelo de dominio: no depende de React ni de servicios HTTP. */
export type EstadoPedido = 'borrador' | 'enviado' | 'cancelado';

export interface Pedido {
  id: string;
  folio?: string;
  estado: EstadoPedido;
  total: number;
}
