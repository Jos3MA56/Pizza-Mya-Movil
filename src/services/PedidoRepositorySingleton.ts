import { SQLitePedidoRepository } from "../repositories/SQLitePedidoRepository";
import type { PedidoRepository } from "../repositories/PedidoRepository";

/**
 * Patrón Singleton: comparte un único repositorio SQLite entre vistas.
 * Persiste las comandas en la conexión compartida.
 */
export class PedidoRepositorySingleton {
  private static instancia: PedidoRepositorySingleton | null = null;
  private repositorio: PedidoRepository;
  private readonly proxy:PedidoRepository={obtenerPorId:id=>this.repositorio.obtenerPorId(id),guardar:p=>this.repositorio.guardar(p),suscribir:(id,fn)=>this.repositorio.suscribir(id,fn),obtenerComandaPorMesa:m=>this.repositorio.obtenerComandaPorMesa(m),listarComandasActivas:()=>this.repositorio.listarComandasActivas(),crearComanda:(m,u)=>this.repositorio.crearComanda(m,u),agregarProducto:(id,p,u)=>this.repositorio.agregarProducto(id,p,u)};

  private constructor() {
    this.repositorio = new SQLitePedidoRepository();
  }

  static obtenerInstancia(): PedidoRepositorySingleton {
    if (PedidoRepositorySingleton.instancia === null) {
      PedidoRepositorySingleton.instancia = new PedidoRepositorySingleton();
    }
    return PedidoRepositorySingleton.instancia;
  }

  usarRepositorio(repo:PedidoRepository){this.repositorio=repo;}

  obtenerRepositorio(): PedidoRepository {
    return this.proxy;
  }
}
