import { InMemoryPedidoRepository } from '../repositories/InMemoryPedidoRepository';
import type { PedidoRepository } from '../repositories/PedidoRepository';

/**
 * Patrón Singleton: comparte un único repositorio de demostración entre vistas.
 * No representa un cliente HTTP ni una base de datos persistente.
 */
export class PedidoRepositorySingleton {
  private static instancia: PedidoRepositorySingleton | null = null;
  private readonly repositorio: PedidoRepository;

  private constructor() {
    this.repositorio = new InMemoryPedidoRepository([
      { id: 'DEMO-001', estado: 'borrador', total: 0 },
    ]);
  }

  static obtenerInstancia(): PedidoRepositorySingleton {
    if (PedidoRepositorySingleton.instancia === null) {
      PedidoRepositorySingleton.instancia = new PedidoRepositorySingleton();
    }
    return PedidoRepositorySingleton.instancia;
  }

  obtenerRepositorio(): PedidoRepository {
    return this.repositorio;
  }
}
