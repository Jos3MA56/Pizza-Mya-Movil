import { describe, test, expect } from '@jest/globals';
import { agruparEspecialidades } from '../AgruparEspecialidades';
import { agregarProductoCatalogo } from '../AgregarProductoCatalogo';
import { InMemoryPedidoRepository } from '../../repositories/InMemoryPedidoRepository';
import type { ProductoCatalogo } from '../../models/Catalogo';
const categorias = [{ id: 'pizza', nombre: 'Pizzas', orden: 1 }, { id: 'otro', nombre: 'Complementos', orden: 2 }];
const pizza = (id: string, nombre: string, tamanio: string, precio: number): ProductoCatalogo => ({
  id, nombre, categoriaId: 'pizza', descripcion: '', imagenUrl: 'https://example.com/pizza.png',
  tamanios: [{ id: `var-${id}`, tamanioId: tamanio, nombre: tamanio, precio }],
});

describe('Agrupar pizzas por especialidad', () => {
  test('une registros separados por tamaño con productos de varias presentaciones', () => {
    const registros = [pizza('grande', 'Hawaiana (Grande 12")', 'Grande', 199),
      pizza('individual', 'Hawaiana (Individual 14")', 'Individual', 99),
      pizza('mediana', 'Hawaiana (Mediana 16")', 'Mediana', 149),
      pizza('pastor', 'Pastor', 'Grande', 200)];
    const resultado = agruparEspecialidades(registros, categorias);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].nombre).toBe('Hawaiana');
    expect(resultado[0].tamanios.map(t => [t.nombre, t.productoId, t.precio])).toEqual([
      ['Individual', 'individual', 99], ['Mediana', 'mediana', 149], ['Grande', 'grande', 199],
    ]);
    expect(registros[0].nombre).toContain('Grande');
    expect(registros[0].tamanios).toHaveLength(1);
  });
  test('no mezcla categorías ni elimina calificativos que no son tamaños', () => {
    const resultado = agruparEspecialidades([
      pizza('uno', 'Especial (Vegetariana)', 'Mediana', 100),
      pizza('dos', 'Especial', 'Grande', 200),
      { ...pizza('tres', 'Especial', 'Grande', 200), categoriaId: 'otro' },
    ], categorias);
    expect(resultado).toHaveLength(3);
    expect(resultado.some(p => p.nombre === 'Especial (Vegetariana)')).toBe(true);
  });
  test('admite una especialidad sin sufijo y no agrupa complementos por nombre', () => {
    const resultado = agruparEspecialidades([
      pizza('g', 'Pastor', 'Grande', 200), pizza('m', 'Pastor (Mediana 16")', 'Mediana', 150),
      { ...pizza('a', 'Snack (Grande)', 'Estándar', 50), categoriaId: 'otro' },
      { ...pizza('b', 'Snack (Mediana)', 'Estándar', 30), categoriaId: 'otro' },
    ], categorias);
    expect(resultado).toHaveLength(3);
    expect(resultado.find(p => p.nombre === 'Pastor')?.tamanios).toHaveLength(2);
  });
  test('al agregar conserva el productoId del tamaño elegido y no el de la tarjeta agrupada', async () => {
    const [producto] = agruparEspecialidades([
      pizza('prod-grande', 'Hawaiana (Grande)', 'Grande', 199),
      pizza('prod-mediana', 'Hawaiana (Mediana)', 'Mediana', 149),
    ], categorias);
    const repo = new InMemoryPedidoRepository();
    const pedido = await repo.crearComanda(1, 'mesero');
    const actual = await agregarProductoCatalogo(repo, pedido.id, 'mesero', producto, 'Pizzas', 'var-prod-mediana', 2, 'linea');
    expect(actual.productos?.[0]).toMatchObject({ productoId: 'prod-mediana', productoTamanioId: 'var-prod-mediana', tamanio: 'Mediana', precioUnitario: 149 });
    expect(actual.total).toBe(298);
  });
});
