import type { ProductoCatalogo } from '../models/Catalogo';
import type { PedidoRepository } from '../repositories/PedidoRepository';

/** Usa el precio de la presentación del catálogo; nunca acepta un precio escrito por el usuario. */
export async function agregarProductoCatalogo(
  repositorio: PedidoRepository,
  pedidoId: string,
  usuarioId: string,
  producto: ProductoCatalogo,
  categoria: string,
  varianteId: string,
  cantidad: number,
  idLinea: string,
) {
  const variante = producto.tamanios.find(t => t.id === varianteId);
  if (!variante || !Number.isFinite(variante.precio) || variante.precio < 0) {
    throw new Error('Selecciona una presentación válida.');
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
    throw new Error('La cantidad debe estar entre 1 y 99.');
  }
  const pedido = await repositorio.obtenerPorId(pedidoId);
  if (!pedido || pedido.estado !== 'borrador') {
    throw new Error('Esta comanda ya no permite agregar productos.');
  }
  return repositorio.agregarProducto(pedidoId, {
    id: idLinea, productoId: variante.productoId ?? producto.id,
    nombre: producto.nombre, categoria, categoriaId: producto.categoriaId,
    productoTamanioId: variante.id, tamanioId: variante.tamanioId, tamanio: variante.nombre,
    cantidad, precioUnitario: variante.precio,
    subtotal: Math.round(variante.precio * cantidad * 100) / 100, estado: 'pendiente',
  }, usuarioId);
}
