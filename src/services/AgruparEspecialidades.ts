import type { CategoriaCatalogo, ProductoCatalogo } from '../models/Catalogo';
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

/** El backend legado tiene un producto por tamaño. Agrupar solo pizzas, sin cambiar sus IDs de venta. */
export function agruparEspecialidades(productos: ProductoCatalogo[], categorias: CategoriaCatalogo[]): ProductoCatalogo[] {
  const pizzas = new Set(categorias.filter(c => ['pizza', 'pizzas'].includes(normalizar(c.nombre))).map(c => c.id));
  const grupos = new Map<string, ProductoCatalogo>();
  for (const producto of productos) {
    let nombre = producto.nombre;
    const sufijo = nombre.match(/^(.+?)\s*\(([^()]*)\)\s*$/);
    // Quitar únicamente un sufijo de tamaño que también exista en las variantes del registro.
    if (pizzas.has(producto.categoriaId) && sufijo && producto.tamanios.some(t => {
      const detalle = normalizar(sufijo[2]);
      const tamanio = normalizar(t.nombre);
      return detalle === tamanio || detalle.startsWith(tamanio + ' ');
    })) nombre = sufijo[1].trim();
    const clave = pizzas.has(producto.categoriaId)
      ? `${producto.categoriaId}:${normalizar(nombre)}` : `producto:${producto.id}`;
    const variantes = producto.tamanios.map(t => ({ ...t, productoId: t.productoId ?? producto.id }));
    const anterior = grupos.get(clave);
    if (anterior) {
      const existentes = new Set(anterior.tamanios.map(t => t.id));
      anterior.tamanios.push(...variantes.filter(t => !existentes.has(t.id)));
      anterior.imagenUrl ??= producto.imagenUrl;
    } else grupos.set(clave, { ...producto, nombre, tamanios: variantes });
  }
  const orden = ['individual', 'chica', 'mediana', 'grande', 'familiar', 'jumbo'];
  for (const producto of grupos.values()) {
    if (!pizzas.has(producto.categoriaId)) continue;
    producto.tamanios.sort((a, b) => {
      const i = orden.indexOf(normalizar(a.nombre));
      const j = orden.indexOf(normalizar(b.nombre));
      return (i < 0 ? orden.length : i) - (j < 0 ? orden.length : j) || a.precio - b.precio || a.nombre.localeCompare(b.nombre);
    });
  }
  return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}
