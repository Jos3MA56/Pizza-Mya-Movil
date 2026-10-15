
import * as Crypto from 'expo-crypto';
import { obtenerBaseDatos } from '../services/storage/database';

export interface ProductoComandaLocal {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioCentavos: number;
}

interface DatosBase {
  mesaId: string;
  meseroId: string;
}

type NuevaComanda =
  | (DatosBase & {
      tipoOperacion: 'PRUEBA_LOCAL';
      productos?: never;
    })
  | (DatosBase & {
      tipoOperacion: 'POS_PEDIDO_PRUEBA' | 'COMANDA_CREAR';
      productos: ProductoComandaLocal[];
    });

export async function crearComandaPendiente(
  datos: NuevaComanda
) {
  const mesaId = datos.mesaId.trim();
  const meseroId = datos.meseroId.trim();

  if (!mesaId || !meseroId || meseroId.length > 100) {
    throw new Error('Mesa o mesero inválido.');
  }

  const esPedidoPOS = datos.tipoOperacion !== 'PRUEBA_LOCAL';
  const productos = esPedidoPOS ? datos.productos ?? [] : [];

  if (esPedidoPOS) {
    const numeroMesa = Number(mesaId);

    if (
      !/^[1-9]\d*$/.test(mesaId) ||
      !Number.isSafeInteger(numeroMesa) ||
      numeroMesa > 50
    ) {
      throw new Error('La mesa debe ser un número entero positivo.');
    }

    if (productos.length < 1 || productos.length > 50) {
      throw new Error('La comanda requiere entre 1 y 50 productos.');
    }

    const identificadores = new Set<string>();


    // Contrato temporal del POS:
    // únicamente productos simples, sin personalizaciones.
    const camposPermitidos = new Set([
      'productoId',
      'nombreProducto',
      'cantidad',
      'precioCentavos',
    ]);

    for (const producto of productos) {
      const camposNoAdmitidos = Object.keys(producto).filter(
        (campo) => !camposPermitidos.has(campo)
      );

      if (camposNoAdmitidos.length > 0) {
        throw new Error(
          'Esta comanda contiene información que el POS ' +
          'todavía no admite: ' +
          camposNoAdmitidos.join(', ') +
          '. No se guardó para evitar perder datos.'
        );
      }
    }


    for (const producto of productos) {
      const productoId = producto.productoId?.trim();
      const nombre = producto.nombreProducto?.trim();

      if (!productoId || !nombre) {
        throw new Error('Producto o nombre inválido.');
      }

      if (
        !Number.isInteger(producto.cantidad) ||
        producto.cantidad < 1 ||
        producto.cantidad > 99
      ) {
        throw new Error('Cantidad de producto inválida.');
      }

      if (
        !Number.isSafeInteger(producto.precioCentavos) ||
        producto.precioCentavos < 0
      ) {
        throw new Error('Precio local inválido.');
      }

      if (identificadores.has(productoId)) {
        throw new Error('Agrupa los productos repetidos.');
      }

      identificadores.add(productoId);
    }
  }

  const db = await obtenerBaseDatos();

  const comandaId = Crypto.randomUUID();
  const operacionId = Crypto.randomUUID();
  const fecha = new Date().toISOString();

  // Guardamos una copia fija del contenido que se enviará.
  // El UUID de la operación será el requestId del POS.
  const payload = esPedidoPOS
    ? JSON.stringify({
        requestId: operacionId,
        mesa: Number(mesaId),
        meseroId,
        productos: productos.map((producto) => ({
          productoId: producto.productoId.trim(),
          cantidad: producto.cantidad,
        })),
      })
    : JSON.stringify({
        comandaId,
        mesaId,
        meseroId,
        items: [],
      });

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO comandas_locales
       (id_local, mesa_id, mesero_id, estado_sync,
        creada_en, actualizada_en)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        comandaId,
        mesaId,
        meseroId,
        'PENDIENTE_ENVIO',
        fecha,
        fecha,
      ]
    );

    // Los productos se guardan en la misma transacción.
    for (const producto of productos) {
      await tx.runAsync(
        `INSERT INTO comanda_items_locales
         (id_local, comanda_id, producto_id,
          nombre_producto, cantidad, precio_centavos)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          Crypto.randomUUID(),
          comandaId,
          producto.productoId.trim(),
          producto.nombreProducto.trim(),
          producto.cantidad,
          producto.precioCentavos,
        ]
      );
    }

    // También registramos la operación de sincronización.
    await tx.runAsync(
      `INSERT INTO operaciones_pendientes
       (id_operacion, comanda_id, mesero_id,
        tipo, payload_json, estado, creada_en)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        operacionId,
        comandaId,
        meseroId,
        datos.tipoOperacion,
        payload,
        'PENDIENTE',
        fecha,
      ]
    );
  });

  return { comandaId, operacionId };
}

export async function obtenerOperacionesPendientes() {
  const db = await obtenerBaseDatos();

  return db.getAllAsync<{
    id_operacion: string;
    comanda_id: string;
    tipo: string;
    estado: string;
    intentos: number;
  }>(
    `SELECT id_operacion, comanda_id, tipo,
            estado, intentos
     FROM operaciones_pendientes
     WHERE estado = 'PENDIENTE'
     ORDER BY creada_en ASC`
  );
}
