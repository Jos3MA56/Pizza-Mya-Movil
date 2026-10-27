import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EstadoPedido, Pedido } from '../models/Pedido';
import type { PedidoRepository } from '../repositories/PedidoRepository';
import { PedidoRepositorySingleton } from '../services/PedidoRepositorySingleton';

// Reutilizable e inyectable: las pruebas e implementaciones futuras pueden
// proporcionar otro Repository sin modificar la View.
const repositorioPorDefecto = PedidoRepositorySingleton.obtenerInstancia().obtenerRepositorio();

/** ViewModel: suscribe la vista a cambios, prepara datos y ejecuta acciones. */
export function usePedidoResumenViewModel(
  id: string,
  repositorio: PedidoRepository = repositorioPorDefecto,
) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setPedido(null);
    setCargando(true);
    setError(null);

    // Observer: los cambios notificados por el Repository llegan a esta vista.
    const desuscribir = repositorio.suscribir(id, (actualizado) => {
      if (!activo) return;
      setPedido(actualizado);
      setCargando(false);
    });

    void repositorio.obtenerPorId(id)
      .then((actual) => {
        if (!activo) return;
        // No sobrescribir una notificación más reciente recibida durante la carga.
        setPedido((anterior) => anterior ?? actual);
      })
      .catch((causa: unknown) => {
        if (!activo) return;
        setError(causa instanceof Error ? causa.message : 'Error al leer el pedido');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    const timer = setInterval(() => {
      void repositorio.obtenerPorId(id).then(p => { if (activo) setPedido(p); }).catch(() => undefined);
    }, 3000);
    return () => {
      clearInterval(timer);
      activo = false;
      desuscribir();
    };
  }, [id, repositorio]);

  const marcarEstado = useCallback(async (estado: EstadoPedido) => {
    if (!pedido) {
      setError('No se encontró el pedido');
      return;
    }
    setError(null);
    try {
      await repositorio.guardar({ ...pedido, estado });
    } catch (causa: unknown) {
      setError(causa instanceof Error ? causa.message : 'No se pudo actualizar el pedido');
    }
  }, [pedido, repositorio]);

  const presentacion = useMemo(() => ({
    titulo: pedido ? `Pedido ${pedido.folio ?? pedido.id}` : `Pedido ${id}`,
    estado: pedido?.estado ?? 'sin datos',
    totalFormateado: pedido ? `$${pedido.total.toFixed(2)}` : '—',
  }), [id, pedido]);

  return { pedido, cargando, error, ...presentacion, marcarEstado };
}
