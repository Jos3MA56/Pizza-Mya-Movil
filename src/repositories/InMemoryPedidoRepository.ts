import type { Pedido } from '../models/Pedido';
import { PedidoSubject } from '../observers/PedidoSubject';
import type { ObservadorPedido, PedidoRepository } from './PedidoRepository';

/**
 * Patrón Repository: implementación local temporal para validar los patrones.
 * Los datos viven en memoria; no existe persistencia ni comunicación HTTP.
 */
export class InMemoryPedidoRepository implements PedidoRepository {
  private readonly pedidos = new Map<string, Pedido>();
  private readonly eventos = new PedidoSubject();

  constructor(iniciales: Pedido[] = []) {
    for (const pedido of iniciales) {
      this.pedidos.set(pedido.id, { ...pedido });
    }
  }

  async obtenerPorId(id: string): Promise<Pedido | null> {
    const encontrado = this.pedidos.get(id);
    return encontrado ? { ...encontrado } : null;
  }

  async guardar(pedido: Pedido): Promise<void> {
    // Conservar la copia evita que un consumidor modifique el almacenamiento.
    const guardado = { ...pedido };
    this.pedidos.set(guardado.id, guardado);
    this.eventos.notificar(guardado);
  }

  suscribir(id: string, observador: ObservadorPedido): () => void {
    return this.eventos.suscribir(id, observador);
  }
}
