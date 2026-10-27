import type { Catalogo } from '../models/Catalogo';
import { ApiClient } from '../services/api/ApiClient';
import { agruparEspecialidades } from '../services/AgruparEspecialidades';
import { API_BASE_URL } from '../services/api/apiConfig';

export interface CatalogoRepository {
  obtener(): Promise<Catalogo>;
}

type Registro = Record<string, unknown>;
function registro(value: unknown): Registro {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('El catálogo recibió una respuesta inválida del servidor.');
  }
  return value as Registro;
}
function texto(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('El catálogo contiene identificadores o nombres inválidos.');
  }
  return value.trim();
}
function lista(respuesta: unknown): unknown[] {
  const envelope = registro(respuesta);
  if (envelope.ok !== true || !Array.isArray(envelope.data)) {
    throw new Error('No se pudo leer el catálogo del servidor.');
  }
  return envelope.data;
}

/** Contrato público verificado en el ZIP del backend: { ok: true, data: [...] }. */
export function normalizarCatalogo(categorias: unknown, productos: unknown): Catalogo {
  const categoriasNormalizadas = lista(categorias)
    .map(registro)
    .filter(c => c.activo !== false)
    .map(c => ({ id: texto(c.id), nombre: texto(c.nombre), orden: Number(c.orden) || 0 }))
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  const ids = new Set(categoriasNormalizadas.map(c => c.id));
  const productosNormalizados = lista(productos)
    .map(registro)
    .filter(p => p.activo !== false && p.disponible !== false && ids.has(String(p.categoria_id)))
    .map(p => {
      if (!Array.isArray(p.tamanios)) {
        throw new Error('El servidor no devolvió las presentaciones del producto.');
      }
      return {
        id: texto(p.id), categoriaId: texto(p.categoria_id), nombre: texto(p.nombre),
        descripcion: typeof p.descripcion === 'string' ? p.descripcion : '',
        imagenUrl: typeof p.imagen_url === 'string' && /^https?:\/\//i.test(p.imagen_url)
          ? p.imagen_url : undefined,
        tamanios: p.tamanios.map(registro).filter(t => t.activo !== false).map(t => {
          // PostgreSQL puede serializar numeric como texto. null/"" no significan precio cero.
          const precio = typeof t.precio_base === 'number' ||
            (typeof t.precio_base === 'string' && t.precio_base.trim())
            ? Number(t.precio_base) : NaN;
          if (!Number.isFinite(precio) || precio < 0) {
            throw new Error('El catálogo contiene un precio inválido.');
          }
          return { productoId: texto(p.id), imagenUrl: typeof t.imagen_url === 'string' && /^https?:\/\//i.test(t.imagen_url) ? t.imagen_url : undefined, id: texto(t.id), tamanioId: texto(t.tamanio_id), nombre: texto(t.tamanio), precio };
        }),
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { categorias: categoriasNormalizadas, productos: agruparEspecialidades(productosNormalizados, categoriasNormalizadas) };
}

export class HttpCatalogoRepository implements CatalogoRepository {
  constructor(
    private readonly cliente?: { get(path: string): Promise<{ data: unknown }> },
    private readonly prefijo = process.env.EXPO_PUBLIC_API_PREFIX?.trim() || '/api',
  ) {}

  async obtener(): Promise<Catalogo> {
    // Crear al consultar para que una URL ausente aparezca como error recuperable en pantalla.
    const cliente = this.cliente ?? new ApiClient({ baseUrl: API_BASE_URL });
    const prefijo = this.prefijo.replace(/\/+$/, '');
    const [categorias, productos] = await Promise.all([
      cliente.get(`${prefijo}/categories`),
      cliente.get(`${prefijo}/products`),
    ]);
    return normalizarCatalogo(categorias.data, productos.data);
  }
}
