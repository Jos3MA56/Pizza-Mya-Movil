import { describe, test, expect } from '@jest/globals';
import { agregarProductoCatalogo } from '../AgregarProductoCatalogo';
import { InMemoryPedidoRepository } from '../../repositories/InMemoryPedidoRepository';
import type { ProductoCatalogo } from '../../models/Catalogo';

const producto: ProductoCatalogo = {
  id: 'producto', nombre: 'Pizza', descripcion: '', categoriaId: 'categoria',
  tamanios: [{ id: 'variante', tamanioId: 'grande', nombre: 'Grande', precio: 199.9 }],
};
async function preparar() {
  const repo = new InMemoryPedidoRepository();
  const pedido = await repo.crearComanda(1, 'mesero');
  return { repo, pedido };
}
describe('Agregar catálogo a una comanda', () => {
  test('conserva presentación, precio, productos anteriores, total e historial', async () => {
    const { repo, pedido } = await preparar();
    await agregarProductoCatalogo(repo, pedido.id, 'mesero', producto, 'Pizzas', 'variante', 2, 'linea-1');
    const actualizado = await agregarProductoCatalogo(repo, pedido.id, 'mesero', producto, 'Pizzas', 'variante', 1, 'linea-2');
    expect(actualizado.productos).toHaveLength(2);
    expect(actualizado.productos?.[0]).toMatchObject({ productoId: 'producto', productoTamanioId: 'variante',
      tamanioId: 'grande', tamanio: 'Grande', categoriaId: 'categoria', precioUnitario: 199.9, subtotal: 399.8 });
    expect(actualizado.total).toBe(599.7);
    expect(actualizado.historial).toHaveLength(3);
  });
  test.each([0, -1, 1.5, 100])('rechaza cantidad %s', async cantidad => {
    const { repo, pedido } = await preparar();
    await expect(agregarProductoCatalogo(repo, pedido.id, 'mesero', producto, 'Pizzas', 'variante', cantidad, 'linea')).rejects.toThrow('cantidad');
    expect((await repo.obtenerPorId(pedido.id))?.productos).toEqual([]);
  });
  test('rechaza presentación ajena al producto', async () => {
    const { repo, pedido } = await preparar();
    await expect(agregarProductoCatalogo(repo, pedido.id, 'mesero', producto, 'Pizzas', 'otra', 1, 'linea')).rejects.toThrow('presentación');
  });
  test.each(['enviado', 'cancelado'] as const)('no modifica comanda %s', async estado => {
    const { repo, pedido } = await preparar();
    await repo.guardar({ ...pedido, estado });
    await expect(agregarProductoCatalogo(repo, pedido.id, 'mesero', producto, 'Pizzas', 'variante', 1, 'linea')).rejects.toThrow('ya no permite');
  });
});
