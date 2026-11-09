import type { ProductoCatalogo, TamanioCatalogo } from '../models/Catalogo';

import type { PartePizza } from '../models/Pedido';
export type RepartoPizza = 'iguales' | 'cuarto' | 'mitad';
const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const clase = (s: string) => ({ md: 'mediana', gd: 'grande', jb: 'jumbo' }[normal(s)] ?? normal(s));

export function tamaniosCombinables(productos: ProductoCatalogo[]): TamanioCatalogo[] {
  if (productos.length < 2 || productos.length > 4 || new Set(productos.map(p => p.id)).size !== productos.length) return [];
  const permitidos = productos.length > 2 ? ['jumbo'] : ['mediana', 'grande', 'jumbo'];
  return productos[0].tamanios.filter(t => permitidos.includes(clase(t.nombre)) && productos.every(p => p.tamanios.some(v => v.tamanioId === t.tamanioId)))
    .sort((a, b) => permitidos.indexOf(clase(a.nombre)) - permitidos.indexOf(clase(b.nombre)));
}

export function prepararCombinacion(productos: ProductoCatalogo[], tamanioId: string, reparto: RepartoPizza, destacadaId = '') {
  const tamanio = tamaniosCombinables(productos).find(t => t.tamanioId === tamanioId);
  if (!tamanio) throw new Error('Las especialidades no comparten un tamaño válido para combinar.');
  const desigual = reparto !== 'iguales';
  if (desigual && (clase(tamanio.nombre) !== 'jumbo' || !((productos.length === 2 && reparto === 'cuarto') || (productos.length === 3 && reparto === 'mitad')))) throw new Error('Reparto no disponible para ese tamaño.');
  if (desigual && !productos.some(p => p.id === destacadaId)) throw new Error('Elige la especialidad que lleva la porción indicada.');
  const orden = desigual ? [...productos.filter(p => p.id === destacadaId), ...productos.filter(p => p.id !== destacadaId)] : productos;
  const variantes = orden.map(p => {
    const v = p.tamanios.find(t => t.tamanioId === tamanioId)!;
    if (!Number.isFinite(v.precio) || v.precio < 0) throw new Error('Precio de especialidad inválido.');
    return { producto: p, variante: v };
  });
  const masCara = variantes.reduce((a, b) => b.variante.precio > a.variante.precio ? b : a);
  const combinacion: PartePizza[] = variantes.map(({ producto, variante }, i) => ({
    productoId: variante.productoId ?? producto.id, productoTamanioId: variante.id,
    porcion: reparto === 'cuarto' ? (i === 0 ? '1/4' : '3/4') : reparto === 'mitad' ? (i === 0 ? '1/2' : '1/4') : productos.length === 2 ? '1/2' : productos.length === 3 ? '1/3' : '1/4',
  }));
  const nombre = `${tamanio.nombre} ${desigual ? combinacion[0].porcion + ' ' : ''}${orden.map(p => p.nombre).join(' - ')}`;
  return { nombre, combinacion, producto: masCara.producto, variante: masCara.variante, especialidades: productos, precio: masCara.variante.precio };
}
export type CombinacionConfigurada = ReturnType<typeof prepararCombinacion>;
