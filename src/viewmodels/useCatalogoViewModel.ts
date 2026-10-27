import { CachedCatalogoRepository } from '../repositories/CachedCatalogoRepository';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import type { Catalogo, ProductoCatalogo } from '../models/Catalogo';
import { HttpCatalogoRepository, type CatalogoRepository } from '../repositories/CatalogoRepository';
import type { PedidoRepository } from '../repositories/PedidoRepository';
import { PedidoRepositorySingleton } from '../services/PedidoRepositorySingleton';
import { agregarProductoCatalogo } from '../services/AgregarProductoCatalogo';

const catalogoPorDefecto = new CachedCatalogoRepository();
const pedidosPorDefecto = PedidoRepositorySingleton.obtenerInstancia().obtenerRepositorio();

export function useCatalogoViewModel(
  pedidoId: string | undefined,
  usuarioId: string,
  repositorio: CatalogoRepository = catalogoPorDefecto,
  pedidos: PedidoRepository = pedidosPorDefecto,
) {
  const [catalogo, setCatalogo] = useState<Catalogo>({ categorias: [], productos: [] });
  const [cache, setCache] = useState<{ guardado: boolean; fecha?: string; aviso?: string }>({ guardado: false });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<ProductoCatalogo | null>(null);
  const [varianteId, setVarianteId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const generacion = useRef(0);
  const guardando = useRef(false);
  const montado = useRef(false);

  const cargar = useCallback(async () => {
    const actual = ++generacion.current;
    setCargando(true);
    setError(null);
    setSeleccionado(null);
    setErrorAgregar(null);
    try {
      const datos = await repositorio.obtener();
      if (actual !== generacion.current) return;
      setCatalogo(datos);
      if (repositorio instanceof CachedCatalogoRepository) setCache({ ...repositorio.estado });
      setCategoriaId(id => datos.categorias.some(c => c.id === id) ? id : '');
    } catch (causa) {
      if (actual === generacion.current) {
        setError(causa instanceof Error ? causa.message : 'No se pudo cargar el catálogo.');
      }
    } finally {
      if (actual === generacion.current) setCargando(false);
    }
  }, [repositorio]);

  useEffect(() => {
    montado.current = true;
    void cargar();
    return () => { montado.current = false; generacion.current += 1; };
  }, [cargar]);

  const productos = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase();
    return catalogo.productos.filter(p => (!categoriaId || p.categoriaId === categoriaId) &&
      `${p.nombre} ${p.descripcion}`.toLocaleLowerCase().includes(q));
  }, [catalogo, categoriaId, busqueda]);

  const seleccionar = (producto: ProductoCatalogo) => {
    setSeleccionado(producto);
    setVarianteId(producto.tamanios[0]?.id ?? '');
    setCantidad(1);
    setErrorAgregar(null);
  };
  const variante = seleccionado?.tamanios.find(t => t.id === varianteId);
  const agregar = async (): Promise<boolean> => {
    if (guardando.current || !seleccionado || !pedidoId || !variante) return false;
    guardando.current = true;
    setAgregando(true);
    setErrorAgregar(null);
    try {
      const categoria = catalogo.categorias.find(c => c.id === seleccionado.categoriaId);
      if (!categoria) throw new Error('La categoría ya no está disponible.');
      await agregarProductoCatalogo(pedidos, pedidoId, usuarioId, seleccionado, categoria.nombre,
        varianteId, cantidad, Crypto.randomUUID());
      return montado.current;
    } catch (causa) {
      if (montado.current) setErrorAgregar(causa instanceof Error ? causa.message : 'No se pudo agregar el producto.');
      return false;
    } finally {
      guardando.current = false;
      if (montado.current) setAgregando(false);
    }
  };

  return { cache, categorias: catalogo.categorias, productos, cargando, error, errorAgregar,
    categoriaId, setCategoriaId, busqueda, setBusqueda, seleccionado, seleccionar,
    varianteId, setVarianteId, variante, cantidad, setCantidad, agregando, agregar, cargar };
}
