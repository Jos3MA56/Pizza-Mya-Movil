import { describe, test, expect, jest } from '@jest/globals';
import { HttpCatalogoRepository, normalizarCatalogo } from '../CatalogoRepository';
import type { ApiClient } from '../../services/api/ApiClient';

const categorias = { ok: true, data: [{ id: 'cat', nombre: 'Pizzas', orden: 2 }] };
const producto = {
  id: 'pizza', nombre: 'Hawaiana', categoria_id: 'cat', activo: true, disponible: true,
  tamanios: [
    { id: 'var-med', tamanio_id: 'med', tamanio: 'Mediana', precio_base: '159.50', activo: true },
    { id: 'var-gra', tamanio_id: 'gra', tamanio: 'Grande', precio_base: '199.00', activo: true },
  ],
};
const respuesta = (data: unknown[]) => ({ ok: true, data });

describe('Catálogo: contrato público del backend web', () => {
  test('conserva IDs distintos de producto, presentación y tamaño y convierte numeric', () => {
    const result = normalizarCatalogo(categorias, respuesta([producto]));
    expect(result.productos[0]).toMatchObject({ id: 'pizza', categoriaId: 'cat' });
    expect(result.productos[0].tamanios).toMatchObject([
      { id: 'var-med', tamanioId: 'med', nombre: 'Mediana', precio: 159.5 },
      { id: 'var-gra', tamanioId: 'gra', nombre: 'Grande', precio: 199 },
    ]);
  });
  test('excluye inactivos, no disponibles, categorías inactivas y variantes inactivas', () => {
    const result = normalizarCatalogo(respuesta([...categorias.data, { id: 'oculta', nombre: 'Oculta', activo: false }]), respuesta([
      { ...producto, tamanios: [...producto.tamanios, { activo: false }] },
      { ...producto, id: 'no-disponible', disponible: false },
      { ...producto, id: 'inactivo', activo: false },
      { ...producto, id: 'sin-categoria', categoria_id: 'oculta' },
    ]));
    expect(result.productos).toHaveLength(1);
    expect(result.productos[0].tamanios).toHaveLength(2);
  });
  test.each([null, '', 'no es precio', -1, Infinity])('rechaza precio inválido %s sin transformarlo en cero', precio => {
    expect(() => normalizarCatalogo(categorias, respuesta([{ ...producto,
      tamanios: [{ ...producto.tamanios[0], precio_base: precio }] }]))).toThrow('precio inválido');
  });
  test('un producto sin presentaciones no obtiene un precio inventado', () => {
    expect(normalizarCatalogo(categorias, respuesta([{ ...producto, tamanios: [] }])).productos[0].tamanios).toEqual([]);
  });
  test.each([{ ok: false, data: [] }, { ok: true, data: {} }, null])('rechaza respuestas malformadas', data => {
    expect(() => normalizarCatalogo(categorias, data)).toThrow();
  });
  test('admite catálogo vacío y respeta el orden de categorías', () => {
    expect(normalizarCatalogo(respuesta([]), respuesta([]))).toEqual({ categorias: [], productos: [] });
    const result = normalizarCatalogo(respuesta([...categorias.data, { id: 'beb', nombre: 'Bebidas', orden: 1 }]), respuesta([]));
    expect(result.categorias.map(c => c.id)).toEqual(['beb', 'cat']);
  });
  test('consulta rutas públicas con el prefijo configurado', async () => {
    const get = jest.fn<ApiClient['get']>();
    get.mockResolvedValueOnce({ status: 200, data: categorias });
    get.mockResolvedValueOnce({ status: 200, data: respuesta([producto]) });
    const result = await new HttpCatalogoRepository({ get }, '/api/').obtener();
    expect(get.mock.calls.map(c => c[0])).toEqual(['/api/categories', '/api/products']);
    expect(result.productos).toHaveLength(1);
  });
  test('propaga el fallo de red para permitir reintentar', async () => {
    const get = jest.fn<ApiClient['get']>().mockRejectedValue(new Error('Sin red'));
    await expect(new HttpCatalogoRepository({ get }).obtener()).rejects.toThrow('Sin red');
  });
});
