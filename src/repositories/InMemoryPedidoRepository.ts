import type { Pedido, ProductoComanda } from "../models/Pedido";

import { PedidoSubject } from "../observers/PedidoSubject";

import type { ObservadorPedido, PedidoRepository } from "./PedidoRepository";

function copiarPedido(pedido: Pedido): Pedido {
  return {
    ...pedido,
    ...(pedido.productos !== undefined
      ? { productos: pedido.productos.map((p) => ({ ...p })) }
      : {}),
    ...(pedido.historial !== undefined
      ? { historial: pedido.historial.map((c) => ({ ...c })) }
      : {}),
  };
}
function validarMesa(mesaId: number): void {
  if (!Number.isInteger(mesaId) || mesaId < 1 || mesaId > 50) {
    throw new Error("La mesa debe estar entre 1 y 50.");
  }
}

function comandaActiva(pedido: Pedido): boolean {
  return pedido.estado !== "cancelado";
}

export class InMemoryPedidoRepository implements PedidoRepository {
  private readonly pedidos = new Map<string, Pedido>();
  private readonly eventos = new PedidoSubject();

  private siguienteId = 1;

  constructor(iniciales: Pedido[] = []) {
    for (const pedido of iniciales) {
      this.pedidos.set(pedido.id, copiarPedido(pedido));
    }
  }

  async obtenerPorId(id: string): Promise<Pedido | null> {
    const encontrado = this.pedidos.get(id);

    return encontrado ? copiarPedido(encontrado) : null;
  }

  async guardar(pedido: Pedido): Promise<void> {
    const guardado = copiarPedido(pedido);

    if (guardado.mesaId !== undefined) {
      validarMesa(guardado.mesaId);

      const duplicado = [...this.pedidos.values()].some(
        (actual) =>
          actual.id !== guardado.id &&
          actual.mesaId === guardado.mesaId &&
          comandaActiva(actual) &&
          comandaActiva(guardado),
      );

      if (duplicado) {
        throw new Error("La mesa ya tiene una comanda activa.");
      }
    }

    this.pedidos.set(guardado.id, guardado);
    this.eventos.notificar(copiarPedido(guardado));
  }

  async obtenerComandaPorMesa(mesaId: number): Promise<Pedido | null> {
    validarMesa(mesaId);

    const encontrada = [...this.pedidos.values()].find(
      (pedido) => pedido.mesaId === mesaId && comandaActiva(pedido),
    );

    return encontrada ? copiarPedido(encontrada) : null;
  }

  async listarComandasActivas(): Promise<Pedido[]> {
    return [...this.pedidos.values()].filter(comandaActiva).map(copiarPedido);
  }

  async crearComanda(mesaId: number, usuarioId: string): Promise<Pedido> {
    validarMesa(mesaId);

    const existente = await this.obtenerComandaPorMesa(mesaId);

    if (existente) {
      return existente;
    }

    if (!usuarioId.trim()) {
      throw new Error("Se requiere identificar al mesero.");
    }

    const fecha = new Date().toISOString();
    const id = `LOCAL-${Date.now()}-${this.siguienteId++}`;

    const pedido: Pedido = {
      id,
      estado: "borrador",
      total: 0,
      mesaId,
      productos: [],
      creadoPor: usuarioId,
      creadoEn: fecha,
      actualizadoEn: fecha,
      historial: [
        {
          id: `${id}-CAMBIO-1`,
          fecha,
          usuarioId,
          accion: "crear",
          descripcion: `Comanda creada para la mesa ${mesaId}`,
        },
      ],
    };

    await this.guardar(pedido);

    return copiarPedido(pedido);
  }

  async agregarProducto(
    pedidoId: string,
    producto: ProductoComanda,
    usuarioId: string,
  ): Promise<Pedido> {
    const pedido = await this.obtenerPorId(pedidoId);

    if (!pedido) {
      throw new Error("La comanda no existe.");
    }

    if (pedido.estado === "cancelado") {
      throw new Error("No se puede modificar una comanda cancelada.");
    }

    if (!usuarioId.trim()) {
      throw new Error("Se requiere identificar al mesero.");
    }

    if (
      !Number.isInteger(producto.cantidad) ||
      producto.cantidad <= 0 ||
      !Number.isFinite(producto.precioUnitario) ||
      producto.precioUnitario < 0
    ) {
      throw new Error("Cantidad o precio inválido.");
    }

    if (pedido.productos?.some((item) => item.id === producto.id)) {
      throw new Error("El producto ya existe en la comanda.");
    }

    const subtotal =
      Math.round(producto.cantidad * producto.precioUnitario * 100) / 100;

    const nuevoProducto: ProductoComanda = {
      ...producto,
      subtotal,
      estado: "pendiente",
    };

    const productos = [...(pedido.productos ?? []), nuevoProducto];

    const total =
      Math.round(
        productos
          .filter((item) => item.estado !== "cancelado")
          .reduce((suma, item) => suma + item.subtotal, 0) * 100,
      ) / 100;

    const fecha = new Date().toISOString();

    const actualizado: Pedido = {
      ...pedido,
      productos,
      total,
      actualizadoEn: fecha,
      historial: [
        ...(pedido.historial ?? []),
        {
          id: `${pedido.id}-CAMBIO-${Date.now()}`,
          fecha,
          usuarioId,
          accion: "agregar_producto",
          descripcion: `Se agregó ${producto.cantidad} x ${producto.nombre}`,
        },
      ],
    };

    await this.guardar(actualizado);

    return copiarPedido(actualizado);
  }

  suscribir(id: string, observador: ObservadorPedido): () => void {
    return this.eventos.suscribir(id, observador);
  }
}
