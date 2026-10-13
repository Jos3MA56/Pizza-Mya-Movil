import type { Pedido } from '../models/Pedido';
import type { ObservadorPedido } from '../repositories/PedidoRepository';

/** Patrón Observer: administra suscripciones por identificador de pedido. */
export class PedidoSubject {
  private readonly observadores = new Map<string, Set<ObservadorPedido>>();

  suscribir(id: string, observador: ObservadorPedido): () => void {
    const grupo = this.observadores.get(id) ?? new Set<ObservadorPedido>();
    grupo.add(observador);
    this.observadores.set(id, grupo);

    // Cada suscripción debe poder liberarse para evitar listeners obsoletos.
    return () => {
      grupo.delete(observador);
      if (grupo.size === 0) {
        this.observadores.delete(id);
      }
    };
  }

  notificar(pedido: Pedido): void {
    for (const observador of this.observadores.get(pedido.id) ?? []) {
      // Entregar una copia evita que un observador modifique a los demás.
      observador({ ...pedido });
    }
  }
}
