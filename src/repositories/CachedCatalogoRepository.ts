import type { Catalogo } from '../models/Catalogo';
import type { CatalogoRepository } from './CatalogoRepository';
import { HttpCatalogoRepository } from './CatalogoRepository';
import { obtenerBaseDatos } from '../services/storage/database';

export class CachedCatalogoRepository implements CatalogoRepository {
  estado: { guardado: boolean; fecha?: string; aviso?: string } = { guardado: false };
  constructor(private origen: CatalogoRepository = new HttpCatalogoRepository(), private base = obtenerBaseDatos) {}
  async obtener(): Promise<Catalogo> {
    const db = await this.base();
    try {
      // El repositorio HTTP valida ambas respuestas antes de devolver el catálogo.
      const catalogo = await this.origen.obtener();
      const fecha = new Date().toISOString();
      await db.runAsync('INSERT INTO catalogo_cache(id, documento, fecha) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET documento=excluded.documento, fecha=excluded.fecha', JSON.stringify(catalogo), fecha);
      this.estado = { guardado: false, fecha };
      return catalogo;
    } catch (error) {
      const fila = await db.getFirstAsync<{ documento: string; fecha: string }>('SELECT documento, fecha FROM catalogo_cache WHERE id = 1');
      if (!fila) throw new Error('Sin catálogo guardado. Conecta la red y pulsa Reintentar.');
      this.estado = { guardado: true, fecha: fila.fecha, aviso: error instanceof Error ? error.message : 'Sin conexión' };
      return JSON.parse(fila.documento) as Catalogo;
    }
  }
}
