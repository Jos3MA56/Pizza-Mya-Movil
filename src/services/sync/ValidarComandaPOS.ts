import { contenidoPOS } from './PosLanClient';
import { crearPayloadPOS } from './CrearPayloadPOS';
import { leerPedido } from '../../repositories/SQLitePedidoRepository';
import type { PayloadPedidoPOS } from './PosLanClient';

import { obtenerBaseDatos } from '../storage/database';

interface ProductoPOS {
  productoId: string;
  cantidad: number;
}

export interface ComandaSimplePOS {
  requestId: string;
  mesa: number;
  meseroId: string;
  productos: ProductoPOS[];
}

interface RegistroLocal {
  tipo: string;
  estado: string;
  payload_json: string;
  mesa_id: string;
  mesero_id: string;
}

interface ItemLocal {
  producto_id: string;
  cantidad: number;
  variante_id: string | null;
  personalizacion_json: string | null;
  notas: string | null;
}

export async function validarComandaSimplePOS(
  operacionId: string
): Promise<PayloadPedidoPOS> {
  const db = await obtenerBaseDatos();

  const registro = await db.getFirstAsync<RegistroLocal>(
    `SELECT o.tipo, o.estado, o.payload_json,
            c.mesa_id, c.mesero_id
     FROM operaciones_pendientes o
     INNER JOIN comandas_locales c
       ON c.id_local = o.comanda_id
     WHERE o.id_operacion = ?`,
    [operacionId]
  );

  if (
    !registro ||
    registro.tipo !== 'COMANDA_CREAR' ||
    !['PENDIENTE', 'ERROR_REINTENTABLE'].includes(
      registro.estado
    )
  ) {
    throw new Error('Operación real no disponible.');
  }

  const payload: unknown = JSON.parse(registro.payload_json);

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error('Contenido de comanda inválido.');
  }

  const datos = payload as Record<string, unknown>;

  if(datos.versionContrato === 2) {
    if(datos.requestId !== operacionId || datos.mesa !== Number(registro.mesa_id) || datos.meseroId !== registro.mesero_id || !Array.isArray(datos.productos)) throw new Error('Instant?nea incompatible.');
    const preparada=await db.getFirstAsync<{documento:string}>('SELECT documento FROM preparaciones_mvvm WHERE request_id=?',operacionId);
    if(!preparada || contenidoPOS(crearPayloadPOS(leerPedido(preparada.documento),operacionId))!==contenidoPOS(datos as unknown as PayloadPedidoPOS))throw new Error('La operacion no coincide con la instantanea inmutable.');
    // La instant?nea v2 queda congelada en la misma transacci?n que la preparaci?n.
    return datos as unknown as PayloadPedidoPOS;
  }
  const campos = Object.keys(datos).sort().join(',');

  if (
    campos !==
    ['requestId', 'mesa', 'meseroId', 'productos']
      .sort()
      .join(',')
  ) {
    throw new Error('La comanda contiene campos no admitidos.');
  }

  const mesa = Number(registro.mesa_id);

  if (
    datos.requestId !== operacionId ||
    !Number.isInteger(mesa) ||
    mesa < 1 ||
    mesa > 50 ||
    datos.mesa !== mesa ||
    datos.meseroId !== registro.mesero_id ||
    !Array.isArray(datos.productos)
  ) {
    throw new Error('Identificadores de comanda incompatibles.');
  }

  const productos = datos.productos as unknown[];

  if (productos.length < 1 || productos.length > 50) {
    throw new Error('Cantidad de productos inválida.');
  }

  const productosValidos: ProductoPOS[] = [];

  for (const item of productos) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      throw new Error('Producto inválido.');
    }

    const producto = item as Record<string, unknown>;

    if (
      Object.keys(producto).sort().join(',') !==
        'cantidad,productoId' ||
      typeof producto.productoId !== 'string' ||
      !producto.productoId.trim() ||
      !Number.isInteger(producto.cantidad) ||
      Number(producto.cantidad) < 1 ||
      Number(producto.cantidad) > 99
    ) {
      throw new Error('Producto incompatible con el POS.');
    }

    productosValidos.push({
      productoId: producto.productoId,
      cantidad: Number(producto.cantidad),
    });
  }

  const items = await db.getAllAsync<ItemLocal>(
    `SELECT i.producto_id, i.cantidad,
            i.variante_id, i.personalizacion_json,
            i.notas
     FROM comanda_items_locales i
     INNER JOIN operaciones_pendientes o
       ON o.comanda_id = i.comanda_id
     WHERE o.id_operacion = ?`,
    [operacionId]
  );

  if (
    items.length !== productosValidos.length ||
    items.some(
      (item) =>
        item.variante_id != null ||
        Boolean(item.notas?.trim()) ||
        ![null, '', '{}', 'null'].includes(
          item.personalizacion_json
        )
    )
  ) {
    throw new Error(
      'La comanda contiene personalizaciones ' +
      'que el POS todavía no admite.'
    );
  }

  const normalizar = (lista: ProductoPOS[]) =>
    JSON.stringify(
      lista
        .map((p) => ({
          productoId: p.productoId,
          cantidad: p.cantidad,
        }))
        .sort((a, b) =>
          a.productoId.localeCompare(b.productoId)
        )
    );

  const productosLocales = items.map((item) => ({
    productoId: item.producto_id,
    cantidad: item.cantidad,
  }));

  if (
    new Set(productosValidos.map((p) => p.productoId))
      .size !== productosValidos.length ||
    normalizar(productosLocales) !==
      normalizar(productosValidos)
  ) {
    throw new Error(
      'Los productos guardados no coinciden ' +
      'con la operación pendiente.'
    );
  }

  return {
    requestId: operacionId,
    mesa,
    meseroId: registro.mesero_id,
    productos: productosValidos,
  };
}
