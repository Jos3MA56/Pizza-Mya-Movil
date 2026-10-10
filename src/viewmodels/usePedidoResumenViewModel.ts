import { useMemo } from 'react';
import type { Pedido } from '../models/Pedido';

/** ViewModel de ejemplo: transforma un modelo en información para una vista. */
export function usePedidoResumenViewModel(pedido: Pedido) {
  return useMemo(() => ({
    titulo: `Pedido ${pedido.folio ?? pedido.id}`,
    estado: pedido.estado,
    totalFormateado: `$${pedido.total.toFixed(2)}`,
  }), [pedido.id, pedido.folio, pedido.estado, pedido.total]);
}
