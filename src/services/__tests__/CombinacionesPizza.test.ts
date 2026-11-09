import { describe, test, expect } from '@jest/globals';
import { prepararCombinacion, tamaniosCombinables, type RepartoPizza } from '../CombinacionesPizza';
import type { ProductoCatalogo } from '../../models/Catalogo';
import { InMemoryPedidoRepository } from '../../repositories/InMemoryPedidoRepository';
import { agregarProductoCatalogo } from '../AgregarProductoCatalogo';
import { serializarPedido, leerPedido } from '../../repositories/SQLitePedidoRepository';
import { crearPayloadPOS } from '../sync/CrearPayloadPOS';
import { contenidoPOS } from '../sync/PosLanClient';
export const especialidades: ProductoCatalogo[] = ['Hawaiana', 'PP', 'Lovers', 'Pastor'].map((nombre, i) => ({id: `p${i}`, nombre, categoriaId: 'pizzas', descripcion: '', tamanios: ['Individual', 'Mediana', 'Grande', 'Jumbo'].map(t => ({id: `p${i}-${t}`, productoId: `p${i}`, tamanioId: t, nombre: t, precio: 150 + i * 35}))}));

describe('Combinaciones reales de pizzas', () => {
 test.each([
  [2, 'iguales', '', 'Jumbo Hawaiana - PP', ['1/2', '1/2']],
  [2, 'cuarto', 'p0', 'Jumbo 1/4 Hawaiana - PP', ['1/4', '3/4']],
  [3, 'iguales', '', 'Jumbo Hawaiana - PP - Lovers', ['1/3', '1/3', '1/3']],
  [3, 'mitad', 'p0', 'Jumbo 1/2 Hawaiana - PP - Lovers', ['1/2', '1/4', '1/4']],
  [4, 'iguales', '', 'Jumbo Hawaiana - PP - Lovers - Pastor', ['1/4', '1/4', '1/4', '1/4']],
 ] as [number, RepartoPizza, string, string, string[]][])('%i especialidades: conserva el reparto %s', (n, reparto, id, nombre, porciones) => {
  const c = prepararCombinacion(especialidades.slice(0, n), 'Jumbo', reparto, id);
  expect(c.nombre).toBe(nombre);expect(c.combinacion.map(p => p.porcion)).toEqual(porciones);expect(c.precio).toBe(150 + (n - 1) * 35);
 });
 test('mueve la especialidad del cuarto al principio sin alterar el precio', () => {
  const c = prepararCombinacion(especialidades.slice(0, 2), 'Jumbo', 'cuarto', 'p1');
  expect(c.nombre).toBe('Jumbo 1/4 PP - Hawaiana');expect(c.combinacion[0].productoId).toBe('p1');expect(c.precio).toBe(185);
 });
 test('restringe tamaños, disponibilidad y selección explícita de porción', () => {
  expect(tamaniosCombinables(especialidades.slice(0, 2)).map(t => t.nombre)).toEqual(['Mediana', 'Grande', 'Jumbo']);
  expect(tamaniosCombinables(especialidades.slice(0, 3)).map(t => t.nombre)).toEqual(['Jumbo']);
  expect(() => prepararCombinacion(especialidades.slice(0, 2), 'Mediana', 'cuarto', 'p0')).toThrow();
  expect(() => prepararCombinacion(especialidades.slice(0, 2), 'Individual', 'iguales')).toThrow();
  expect(() => prepararCombinacion(especialidades.slice(0, 2), 'Jumbo', 'cuarto')).toThrow(/Elige/);
  expect(tamaniosCombinables([especialidades[0], especialidades[0]])).toEqual([]);
  expect(tamaniosCombinables([especialidades[0], {...especialidades[1], tamanios: []}])).toEqual([]);
 });
 test('persiste porciones y precio más caro con orilla; el recibo distingue repartos', async () => {
  const c = prepararCombinacion(especialidades.slice(0, 2), 'Jumbo', 'cuarto', 'p1');
  const repo = new InMemoryPedidoRepository();const pedido = await repo.crearComanda(3, 'mesero');
  await agregarProductoCatalogo(repo, pedido.id, 'mesero', c.producto, 'Pizzas', c.variante.id, 2, 'linea', {id: 'orilla', nombre: 'Deditos', precios: [{tamanioId: 'Jumbo', precio: 100}]}, c);
  const actual = leerPedido(serializarPedido((await repo.obtenerPorId(pedido.id))!));
  expect(actual.total).toBe(570);expect(actual.productos?.[0].nombre).toBe(c.nombre);expect(actual.productos?.[0].combinacion).toEqual(c.combinacion);
  const payload = crearPayloadPOS(actual, 'combinacion-request');
  expect(payload.productos[0].combinacion).toEqual(c.combinacion);
  const otro = {...payload, productos: [{...payload.productos[0], combinacion: prepararCombinacion(especialidades.slice(0, 2), 'Jumbo', 'iguales').combinacion}]};
  expect(contenidoPOS(payload)).not.toBe(contenidoPOS(otro));
 });
});
