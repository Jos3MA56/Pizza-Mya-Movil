import { describe, test, expect, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCatalogoViewModel } from '../useCatalogoViewModel';
import { InMemoryPedidoRepository } from '../../repositories/InMemoryPedidoRepository';
import type { Catalogo } from '../../models/Catalogo';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'linea-uuid' }));
const datos: Catalogo = {
  categorias: [{ id: 'pizzas', nombre: 'Pizzas', orden: 1 }, { id: 'bebidas', nombre: 'Bebidas', orden: 2 }],
  productos: [
    { id: 'pizza', categoriaId: 'pizzas', nombre: 'Hawaiana', descripcion: 'Piña',
      tamanios: [{ id: 'var', tamanioId: 'med', nombre: 'Mediana', precio: 159 }] },
    { id: 'agua', categoriaId: 'bebidas', nombre: 'Agua', descripcion: '', tamanios: [] },
  ],
};
describe('Catálogo ViewModel', () => {
  test('carga, combina búsqueda y categoría, muestra vacío y reintenta un error', async () => {
    const obtener = jest.fn<() => Promise<Catalogo>>().mockRejectedValueOnce(new Error('Sin red')).mockResolvedValue(datos);
    const repo = { obtener };
    const { result } = await renderHook(() => useCatalogoViewModel(undefined, 'mesero', repo, new InMemoryPedidoRepository()));
    await waitFor(() => expect(result.current.error).toBe('Sin red'));
    await act(async () => { await result.current.cargar(); });
    expect(result.current.error).toBeNull();
    expect(result.current.productos).toHaveLength(2);
    await act(async () => { result.current.setCategoriaId('pizzas'); result.current.setBusqueda('piña'); });
    expect(result.current.productos.map(p => p.id)).toEqual(['pizza']);
    await act(async () => { result.current.setBusqueda('agua'); });
    expect(result.current.productos).toEqual([]);
  });
  test('agrega una sola vez aunque se pulse dos veces antes de terminar y conserva la presentación', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const pedido = await pedidos.crearComanda(1, 'mesero');
    const repo = { obtener: async () => datos };
    const { result } = await renderHook(() => useCatalogoViewModel(pedido.id, 'mesero', repo, pedidos));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    await act(async () => { result.current.seleccionar(datos.productos[0]); result.current.setCantidad(2); });
    let resultado: boolean[] = [];
    await act(async () => { resultado = await Promise.all([result.current.agregar(), result.current.agregar()]); });
    expect(resultado).toEqual([true, false]);
    const actual = await pedidos.obtenerPorId(pedido.id);
    expect(actual?.total).toBe(318);
    expect(actual?.productos).toHaveLength(1);
    expect(actual?.productos?.[0].productoTamanioId).toBe('var');
  });
  test('ignora una carga vieja que termina después del reintento', async () => {
    let resolver!: (value: Catalogo) => void;
    const primera = new Promise<Catalogo>(resolve => { resolver = resolve; });
    const obtener = jest.fn<() => Promise<Catalogo>>().mockReturnValueOnce(primera).mockResolvedValue(datos);
    const repo = { obtener };
    const pedidos = new InMemoryPedidoRepository();
    const { result } = await renderHook(() => useCatalogoViewModel(undefined, 'mesero', repo, pedidos));
    await act(async () => { await result.current.cargar(); });
    await act(async () => { resolver({ categorias: [], productos: [] }); await primera; });
    expect(result.current.productos).toHaveLength(2);
  });
});
