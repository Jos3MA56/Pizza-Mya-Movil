import type { ProductoCatalogo, OrillaCatalogo } from '../models/Catalogo';
import type { PartePizza } from '../models/Pedido';
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
  orilla?: OrillaCatalogo,
  configuracion?: { combinacion: PartePizza[]; nombre: string },
) {
  const variante = producto.tamanios.find(t => t.id === varianteId);
  if (!variante || !Number.isFinite(variante.precio) || variante.precio < 0) {
    throw new Error('Selecciona una presentación válida.');
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
    throw new Error('La cantidad debe estar entre 1 y 99.');
  }
  const tarifa = orilla?.precios.find(p => p.tamanioId === variante.tamanioId);
  if (orilla && (!/^pizzas?$/i.test(categoria) || !tarifa || !Number.isFinite(tarifa.precio) || tarifa.precio < 0)) throw new Error('Orilla no disponible para este tamaño.');
  const recargo = Math.round((tarifa?.precio ?? 0) * 100);
  const precio = (Math.round(variante.precio * 100) + recargo) / 100;
  const pedido = await repositorio.obtenerPorId(pedidoId);
  if (!pedido || pedido.estado !== 'borrador') {
    throw new Error('Esta comanda ya no permite agregar productos.');
  }
  return repositorio.agregarProducto(pedidoId, {
    id: idLinea, productoId: variante.productoId ?? producto.id,
    ...(configuracion ? { combinacion: configuracion.combinacion } : {}),
    nombre: configuracion?.nombre ?? producto.nombre, categoria, categoriaId: producto.categoriaId,
    productoTamanioId: variante.id, tamanioId: variante.tamanioId, tamanio: variante.nombre,
    ...(orilla ? { orillaId: orilla.id, orillaNombre: orilla.nombre, orillaCostoCentavos: recargo } : {}),
    cantidad, precioUnitario: precio,
    subtotal: Math.round(precio * cantidad * 100) / 100, estado: 'pendiente',
  }, usuarioId);
}
