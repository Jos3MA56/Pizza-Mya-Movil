import { SQLitePedidoRepository } from "../repositories/SQLitePedidoRepository";
import type { PedidoRepository } from "../repositories/PedidoRepository";

/**
 * Patrón Singleton: comparte un único repositorio SQLite entre vistas.
 * Persiste las comandas en la conexión compartida.
 */
export class PedidoRepositorySingleton {
  private static instancia: PedidoRepositorySingleton | null = null;
  private readonly repositorio: PedidoRepository;

  private constructor() {
    this.repositorio = new SQLitePedidoRepository();
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
