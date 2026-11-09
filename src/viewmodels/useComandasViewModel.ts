import { useCallback, useEffect, useState, useRef } from "react";

import type { Pedido, ProductoComanda } from "../models/Pedido";

import type { PedidoRepository } from "../repositories/PedidoRepository";

import { PedidoRepositorySingleton } from "../services/PedidoRepositorySingleton";

const repositorioPorDefecto =
  PedidoRepositorySingleton.obtenerInstancia().obtenerRepositorio();

export function useComandasViewModel(
  repositorio: PedidoRepository = repositorioPorDefecto,
) {
  const ocupado=useRef(false);
  const [comandas, setComandas] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualizarComandas = useCallback(async (silencioso=false) => {
    if(ocupado.current)return;ocupado.current=true;
    if(!silencioso)setCargando(true);
    setError(null);

    try {
      const resultado = await repositorio.listarComandasActivas();
      setComandas(resultado);
    } catch (causa: unknown) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No se pudieron consultar las comandas.",
      );
    } finally {
      ocupado.current=false;
      if(!silencioso)setCargando(false);
    }
  }, [repositorio]);

  useEffect(() => {
    void actualizarComandas();
    const timer=setInterval(()=>void actualizarComandas(true),2000);
    return()=>clearInterval(timer);
  }, [actualizarComandas]);

  const abrirMesa = useCallback(
    async (mesaId: number, usuarioId: string): Promise<Pedido | null> => {
      setError(null);

      try {
        const pedido = await repositorio.crearComanda(mesaId, usuarioId);

        await actualizarComandas();

        return pedido;
      } catch (causa: unknown) {
        setError(
          causa instanceof Error ? causa.message : "No se pudo abrir la mesa.",
        );

        return null;
      }
    },
    [repositorio, actualizarComandas],
  );

  const agregarProducto = useCallback(
    async (
      pedidoId: string,
      producto: ProductoComanda,
      usuarioId: string,
    ): Promise<Pedido | null> => {
      setError(null);

      try {
        const actualizado = await repositorio.agregarProducto(
          pedidoId,
          producto,
          usuarioId,
        );

        await actualizarComandas();

        return actualizado;
      } catch (causa: unknown) {
        setError(
          causa instanceof Error
            ? causa.message
            : "No se pudo agregar el producto.",
        );

        return null;
      }
    },
    [repositorio, actualizarComandas],
  );

  return {
    comandas,
    cargando,
    error,
    actualizarComandas,
    abrirMesa,
    agregarProducto,
  };
}
