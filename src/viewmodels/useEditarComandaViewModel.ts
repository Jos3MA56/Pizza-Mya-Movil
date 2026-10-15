import { useCallback, useEffect, useState } from "react";
import type { Pedido } from "../models/Pedido";
import type { PedidoRepository } from "../repositories/PedidoRepository";
import { PedidoRepositorySingleton } from "../services/PedidoRepositorySingleton";

const repositorioPorDefecto =
  PedidoRepositorySingleton.obtenerInstancia().obtenerRepositorio();

export function useEditarComandaViewModel(
  pedidoId: string,
  usuarioId: string,
  repositorio: PedidoRepository = repositorioPorDefecto,
) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [observaciones, setObservaciones] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const actual = await repositorio.obtenerPorId(pedidoId);

      if (!actual) {
        throw new Error("No se encontró la comanda.");
      }

      setPedido(actual);
      setObservaciones(actual.observaciones ?? "");

      setCantidades(
        Object.fromEntries(
          (actual.productos ?? []).map((p) => [p.id, p.cantidad]),
        ),
      );
    } catch (causa: unknown) {
      setError(
        causa instanceof Error ? causa.message : "Error al cargar la comanda.",
      );
    } finally {
      setCargando(false);
    }
  }, [pedidoId, repositorio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiarCantidad = (productoId: string, cambio: number) => {
    if (pedido?.estado !== "borrador") return;

    const producto = pedido.productos?.find((p) => p.id === productoId);
    if (!producto || producto.estado !== "pendiente") return;

    setCantidades((anterior) => ({
      ...anterior,
      [productoId]: Math.max(
        1,
        Math.min(99, (anterior[productoId] ?? producto.cantidad) + cambio),
      ),
    }));
  };

  const guardarCambios = async (): Promise<boolean> => {
    if (guardando) return false;
    setGuardando(true);
    setError(null);

    try {
      if (!pedido || !usuarioId.trim()) {
        throw new Error("No se pudo identificar la comanda o al mesero.");
      }

      // Releer el pedido para evitar sobrescribir cambios recientes.
      const actual = await repositorio.obtenerPorId(pedidoId);

      if (!actual || actual.estado !== "borrador") {
        throw new Error("Esta comanda ya no permite edición local.");
      }

      const cambios: string[] = [];

      const productos = (actual.productos ?? []).map((producto) => {
        const cantidadNueva = cantidades[producto.id] ?? producto.cantidad;

        if (cantidadNueva === producto.cantidad) {
          return { ...producto };
        }

        if (producto.estado !== "pendiente") {
          throw new Error(
            `El producto ${producto.nombre} ya no se puede modificar.`,
          );
        }

        if (!Number.isInteger(cantidadNueva) || cantidadNueva < 1) {
          throw new Error("La cantidad debe ser un número entero positivo.");
        }

        cambios.push(
          `${producto.nombre}: ${producto.cantidad} → ${cantidadNueva}`,
        );

        return {
          ...producto,
          cantidad: cantidadNueva,
          subtotal:
            Math.round(cantidadNueva * producto.precioUnitario * 100) / 100,
        };
      });

      const notasNuevas = observaciones.trim();

      if (notasNuevas !== (actual.observaciones ?? "").trim()) {
        cambios.push("Se actualizaron las observaciones de cocina");
      }

      if (cambios.length === 0) return true;

      const fecha = new Date().toISOString();

      const total =
        Math.round(
          productos
            .filter((p) => p.estado !== "cancelado")
            .reduce((suma, p) => suma + p.subtotal, 0) * 100,
        ) / 100;

      const actualizado: Pedido = {
        ...actual,
        productos,
        observaciones: notasNuevas,
        total,
        actualizadoEn: fecha,
        historial: [
          ...(actual.historial ?? []),
          {
            id: `${pedidoId}-EDICION-${fecha}`,
            fecha,
            usuarioId,
            accion: "editar_producto",
            descripcion: cambios.join("; "),
          },
        ],
      };

      await repositorio.guardar(actualizado);
      return true;
    } catch (causa: unknown) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No se pudieron guardar los cambios.",
      );
      return false;
    } finally {
      setGuardando(false);
    }
  };

  return {
    pedido,
    cantidades,
    observaciones,
    cargando,
    guardando,
    error,
    cambiarCantidad,
    setObservaciones,
    guardarCambios,
  };
}
