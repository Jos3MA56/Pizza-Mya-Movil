
export interface ProductoPedidoPOS {
  productoId: string;
  cantidad: number;
}

export interface PayloadPedidoPOS {
  requestId: string;
  mesa: number;
  meseroId: string;
  productos: ProductoPedidoPOS[];
}

export interface PedidoConfirmadoPOS {
  id: string;
  requestId: string;
  folio: string;
  totalCentavos: number;
}

export interface ResultadoEnvioPOS {
  status: 200 | 201;
  duplicado: boolean;
  pedido: PedidoConfirmadoPOS;
}

export class ErrorHTTPPOS extends Error {
  constructor(
    public readonly status: number,
    mensaje: string
  ) {
    super(mensaje);
    this.name = 'ErrorHTTPPOS';
  }
}

interface OpcionesEnvioPOS {
  urlBase: string;
  token: string;
  payload: PayloadPedidoPOS;
}

export async function enviarPedidoPOS(
  opciones: OpcionesEnvioPOS
): Promise<ResultadoEnvioPOS> {
  const { urlBase, token, payload } = opciones;

  if (!/^https?:\/\//.test(urlBase)) {
    throw new Error('La URL del POS no es válida.');
  }

  if (!/^[a-fA-F0-9]{64}$/.test(token)) {
    throw new Error('El token LAN no es válido.');
  }

  if (
    !/^[a-zA-Z0-9_-]{8,100}$/.test(payload.requestId) ||
    !Number.isInteger(payload.mesa) ||
    payload.mesa < 1 ||
    !payload.meseroId?.trim() ||
    payload.meseroId.length > 100 ||
    !Array.isArray(payload.productos) ||
    payload.productos.length < 1 ||
    payload.productos.length > 50
  ) {
    throw new Error('La comanda contiene datos inválidos.');
  }

  const ids = new Set<string>();

  for (const producto of payload.productos) {
    if (
      typeof producto?.productoId !== 'string' ||
      !producto.productoId.trim() ||
      !Number.isInteger(producto.cantidad) ||
      producto.cantidad < 1 ||
      producto.cantidad > 99 ||
      ids.has(producto.productoId)
    ) {
      throw new Error('Los productos de la comanda son inválidos.');
    }

    ids.add(producto.productoId);
  }

  const controller = new AbortController();

  const temporizador = setTimeout(() => {
    controller.abort();
  }, 7000);

  try {
    const url = `${urlBase.replace(/\/+$/, '')}/api/local/pedidos`;

    const respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let datos: unknown;

    try {
      datos = await respuesta.json();
    } catch {
      throw new Error('El POS devolvió una respuesta JSON inválida.');
    }

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new Error('La respuesta del POS no es válida.');
    }

    const cuerpo = datos as Record<string, unknown>;

    if (!respuesta.ok) {
      const mensaje =
        typeof cuerpo.error === 'string'
          ? cuerpo.error
          : `Error HTTP ${respuesta.status}`;

      throw new ErrorHTTPPOS(respuesta.status, mensaje);
    }

    if (respuesta.status !== 200 && respuesta.status !== 201) {
      throw new Error(
        `Respuesta HTTP inesperada: ${respuesta.status}`
      );
    }

    const pedido = cuerpo.pedido;

    if (
      !pedido ||
      typeof pedido !== 'object' ||
      Array.isArray(pedido)
    ) {
      throw new Error('El POS no devolvió un pedido válido.');
    }

    const confirmado = pedido as Record<string, unknown>;

    if (
      typeof confirmado.id !== 'string' ||
      !confirmado.id.trim() ||
      confirmado.requestId !== payload.requestId ||
      typeof confirmado.folio !== 'string' ||
      typeof confirmado.totalCentavos !== 'number' ||
      !Number.isInteger(confirmado.totalCentavos)
    ) {
      throw new Error(
        'La confirmación no corresponde a la operación enviada.'
      );
    }

    if (
      typeof cuerpo.duplicado !== 'boolean' ||
      (respuesta.status === 201 && cuerpo.duplicado) ||
      (respuesta.status === 200 && !cuerpo.duplicado)
    ) {
      throw new Error('Respuesta de idempotencia inesperada.');
    }

    return {
      status: respuesta.status,
      duplicado: cuerpo.duplicado,
      pedido: {
        id: confirmado.id,
        requestId: confirmado.requestId,
        folio: confirmado.folio,
        totalCentavos: confirmado.totalCentavos,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('POS_TIMEOUT');
    }

    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

export interface PedidoConsultadoPOS
  extends PedidoConfirmadoPOS {
  mesa: number;
  meseroId: string;
  productos: ProductoPedidoPOS[];
}

interface OpcionesConsultaPOS {
  urlBase: string;
  token: string;
  requestId: string;
}

export async function consultarPedidoPOS(
  opciones: OpcionesConsultaPOS
): Promise<PedidoConsultadoPOS | null> {
  const { urlBase, token, requestId } = opciones;

  if (!/^https?:\/\//.test(urlBase)) {
    throw new Error('URL del POS inválida.');
  }

  if (!/^[a-fA-F0-9]{64}$/.test(token)) {
    throw new Error('Token LAN inválido.');
  }

  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
    throw new Error('RequestId inválido.');
  }

  const controller = new AbortController();

  const temporizador = setTimeout(() => {
    controller.abort();
  }, 7000);

  try {
    const url =
      `${urlBase.replace(/\/+$/, '')}` +
      `/api/local/pedidos/por-request/${encodeURIComponent(requestId)}`;

    const respuesta = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    // No existe un pedido con este UUID.
    if (respuesta.status === 404) {
      return null;
    }

    if (!respuesta.ok) {
      throw new ErrorHTTPPOS(
        respuesta.status,
        `Error de consulta HTTP ${respuesta.status}`
      );
    }

    const datos: unknown = await respuesta.json();

    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos)
    ) {
      throw new Error('Respuesta de consulta inválida.');
    }

    const cuerpo = datos as Record<string, unknown>;
    const pedido = cuerpo.pedido;

    if (
      !pedido ||
      typeof pedido !== 'object' ||
      Array.isArray(pedido)
    ) {
      throw new Error('El POS no devolvió un pedido.');
    }

    const p = pedido as Record<string, unknown>;

    if (
      typeof p.id !== 'string' ||
      !p.id.trim() ||
      p.requestId !== requestId ||
      typeof p.folio !== 'string' ||
      !Number.isSafeInteger(p.totalCentavos) ||
      !Number.isSafeInteger(p.mesa) ||
      typeof p.meseroId !== 'string' ||
      !Array.isArray(p.productos)
    ) {
      throw new Error('Pedido consultado inválido.');
    }

    const productos = p.productos as unknown[];

    if (
      productos.length < 1 ||
      !productos.every((item) => {
        if (
          !item ||
          typeof item !== 'object' ||
          Array.isArray(item)
        ) {
          return false;
        }

        const producto = item as Record<string, unknown>;

        return (
          typeof producto.productoId === 'string' &&
          Number.isInteger(producto.cantidad) &&
          Number(producto.cantidad) > 0
        );
      })
    ) {
      throw new Error('Productos del pedido inválidos.');
    }

    return {
      id: p.id as string,
      requestId,
      folio: p.folio as string,
      totalCentavos: p.totalCentavos as number,
      mesa: p.mesa as number,
      meseroId: p.meseroId as string,
      productos: productos.map((item) => {
        const producto = item as Record<string, unknown>;

        return {
          productoId: producto.productoId as string,
          cantidad: producto.cantidad as number,
        };
      }),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error('POS_TIMEOUT');
    }

    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}
