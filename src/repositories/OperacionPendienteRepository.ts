
import { obtenerBaseDatos, transaccionLocal } from '../services/storage/database';

export type EstadoOperacion =
  | 'CANCELADA'
  | 'BLOQUEADA'
  | 'PENDIENTE'
  | 'ENVIANDO'
  | 'CONFIRMADA'
  | 'ERROR_REINTENTABLE'
  | 'RESULTADO_DESCONOCIDO'
  | 'CONFLICTO'
  | 'RECHAZADA';

export interface OperacionLocal {
  id_operacion: string;
  comanda_id: string;
  tipo: string;
  estado: EstadoOperacion;
  intentos: number;
  proximo_intento_en: string | null;
  ultimo_error: string | null;
  creada_en: string;
}

// Recuperar una operación por su identificador.
export async function obtenerOperacionPorId(id: string) {
  const db = await obtenerBaseDatos();

  return db.getFirstAsync<OperacionLocal>(
    `SELECT id_operacion, comanda_id, tipo, estado,
            intentos, proximo_intento_en,
            ultimo_error, creada_en
     FROM operaciones_pendientes
     WHERE id_operacion = ?`,
    [id]
  );
}

// Iniciar un intento de envío.
export async function marcarOperacionEnviando(
  id: string
): Promise<void> {
  const db = await obtenerBaseDatos();
  const ahora = new Date().toISOString();

  const resultado = await db.runAsync(
    `UPDATE operaciones_pendientes
     SET estado = 'ENVIANDO',
         intentos = intentos + 1,
         proximo_intento_en = NULL,
         ultimo_error = NULL
     WHERE id_operacion = ?
       AND (
         estado = 'PENDIENTE'
         OR (
           estado = 'ERROR_REINTENTABLE'
           AND (
             proximo_intento_en IS NULL
             OR proximo_intento_en <= ?
           )
         )
       )`,
    [id, ahora]
  );

  if (resultado.changes !== 1) {
    throw new Error(
      'La operación no está disponible para envío.'
    );
  }
}

// Registrar un fallo temporal y programar un reintento.
export async function registrarErrorReintentable(
  id: string,
  tipoError: 'SIN_RED' | 'TIMEOUT' | 'SERVIDOR_TEMPORAL'
): Promise<void> {
  const db = await obtenerBaseDatos();

  await transaccionLocal(db, async (tx) => {
    const operacion = await tx.getFirstAsync<{
      intentos: number;
    }>(
      `SELECT intentos
       FROM operaciones_pendientes
       WHERE id_operacion = ?
         AND estado = 'ENVIANDO'`,
      [id]
    );

    if (!operacion) {
      throw new Error(
        'No existe una operación en estado ENVIANDO.'
      );
    }

    // Espera exponencial: 5, 10, 20, 40... segundos.
    // Máximo de 5 minutos.
    const retrasoMs = Math.min(
      5000 * Math.pow(2, Math.min(operacion.intentos - 1, 6)),
      300000
    );

    const proximoIntento = new Date(
      Date.now() + retrasoMs
    ).toISOString();

    const resultado = await tx.runAsync(
      `UPDATE operaciones_pendientes
       SET estado = 'ERROR_REINTENTABLE',
           ultimo_error = ?,
           proximo_intento_en = ?
       WHERE id_operacion = ?
         AND estado = 'ENVIANDO'`,
      [tipoError, proximoIntento, id]
    );

    if (resultado.changes !== 1) {
      throw new Error(
        'No se pudo registrar el error de sincronización.'
      );
    }
  });
}

// Operaciones listas para envío real.
// Las pruebas locales quedan excluidas.
export async function obtenerOperacionesListas() {
  const db = await obtenerBaseDatos();
  const ahora = new Date().toISOString();

  return db.getAllAsync<OperacionLocal>(
    `SELECT id_operacion, comanda_id, tipo, estado,
            intentos, proximo_intento_en,
            ultimo_error, creada_en
     FROM operaciones_pendientes
     WHERE tipo = 'COMANDA_CREAR'
       AND (
         estado = 'PENDIENTE'
         OR (
           estado = 'ERROR_REINTENTABLE'
           AND (
             proximo_intento_en IS NULL
             OR proximo_intento_en <= ?
           )
         )
       )
     ORDER BY creada_en ASC`,
    [ahora]
  );
}
export async function recuperarEnviosInterrumpidos(): Promise<number> {
  const db = await obtenerBaseDatos();

  const resultado = await db.runAsync(
    `UPDATE operaciones_pendientes
     SET estado = 'RESULTADO_DESCONOCIDO',
         ultimo_error = 'INTERRUPCION_DURANTE_ENVIO',
         proximo_intento_en = NULL
     WHERE estado = 'ENVIANDO'`
  );

  return resultado.changes;


}

export interface OperacionConPayload extends OperacionLocal {
  mesero_id: string;
  payload_json: string;
}

// Recupera la operación con los datos exactos
// que deben enviarse al POS.
export async function obtenerOperacionConPayload(
  id: string
): Promise<OperacionConPayload | null> {
  const db = await obtenerBaseDatos();

  return db.getFirstAsync<OperacionConPayload>(
    `SELECT id_operacion, comanda_id, tipo, estado,
            intentos, proximo_intento_en,
            ultimo_error, creada_en, payload_json, mesero_id
     FROM operaciones_pendientes
     WHERE id_operacion = ?`,
    [id]
  );
}

// Confirma tanto la operación como la comanda.
// Ambas actualizaciones deben completarse juntas.
export async function confirmarOperacionPOS(
  operacionId: string,
  pedidoIdPOS: string,
  recibo?: { folio: string; totalCentavos: number }
): Promise<void> {
  if (!pedidoIdPOS.trim()) {
    throw new Error('El identificador del POS es obligatorio.');
  }

  const db = await obtenerBaseDatos();
  const fecha = new Date().toISOString();

  await transaccionLocal(db, async (tx) => {
    const operacion = await tx.getFirstAsync<{
      comanda_id: string;
      estado: string;
    }>(
      `SELECT comanda_id, estado
       FROM operaciones_pendientes
       WHERE id_operacion = ?
         AND estado = 'ENVIANDO'
         AND tipo IN ('COMANDA_CREAR', 'POS_PEDIDO_PRUEBA')`,
      [operacionId]
    );

    if (!operacion) {
      throw new Error(
        'No existe una operación válida en estado ENVIANDO.'
      );
    }

    const resultadoOperacion = await tx.runAsync(
      `UPDATE operaciones_pendientes
       SET estado = 'CONFIRMADA',
           ultimo_error = NULL,
           proximo_intento_en = NULL
       WHERE id_operacion = ?
         AND estado = 'ENVIANDO'`,
      [operacionId]
    );

    if (resultadoOperacion.changes !== 1) {
      throw new Error('No se pudo confirmar la operación.');
    }

    const resultadoComanda = await tx.runAsync(
      `UPDATE comandas_locales
       SET id_servidor = ?,
           folio_confirmado = ?, total_confirmado_centavos = ?,
           estado_sync = 'CONFIRMADA',
           actualizada_en = ?
       WHERE id_local = ?`,
      [
        pedidoIdPOS,
        recibo?.folio ?? null, recibo ? recibo.totalCentavos : null,
        fecha,
        operacion.comanda_id,
      ]
    );

    if (resultadoComanda.changes !== 1) {
      throw new Error('No se pudo confirmar la comanda.');
    }
  });
}

// Registra un conflicto de idempotencia HTTP 409.
export async function registrarConflictoPOS(
  operacionId: string
): Promise<void> {
  const db = await obtenerBaseDatos();
  const fecha = new Date().toISOString();

  await transaccionLocal(db, async (tx) => {
    const operacion = await tx.getFirstAsync<{
      comanda_id: string;
    }>(
      `SELECT comanda_id
       FROM operaciones_pendientes
       WHERE id_operacion = ?
         AND estado = 'ENVIANDO'`,
      [operacionId]
    );

    if (!operacion) {
      throw new Error('Operación no disponible para registrar conflicto.');
    }

    const resultado = await tx.runAsync(
      `UPDATE operaciones_pendientes
       SET estado = 'CONFLICTO',
           ultimo_error = 'CONFLICTO_REQUEST_ID',
           proximo_intento_en = NULL
       WHERE id_operacion = ?
         AND estado = 'ENVIANDO'`,
      [operacionId]
    );

    if (resultado.changes !== 1) {
      throw new Error('No se pudo registrar el conflicto.');
    }

    const comanda = await tx.runAsync(
      `UPDATE comandas_locales
       SET estado_sync = 'CONFLICTO',
           actualizada_en = ?
       WHERE id_local = ?`,
      [fecha, operacion.comanda_id]
    );

    if (comanda.changes !== 1) {
      throw new Error('No se pudo actualizar la comanda.');
    }
  });
}

export async function registrarEstadoNoConfirmadoPOS(
  operacionId: string,
  estado: 'RECHAZADA' | 'RESULTADO_DESCONOCIDO',
  motivo: string
): Promise<void> {
  const db = await obtenerBaseDatos();
  const fecha = new Date().toISOString();

  await transaccionLocal(db, async (tx) => {
    const operacion = await tx.getFirstAsync<{
      comanda_id: string;
    }>(
      `SELECT comanda_id
       FROM operaciones_pendientes
       WHERE id_operacion = ?
         AND estado = 'ENVIANDO'`,
      [operacionId]
    );

    if (!operacion) {
      throw new Error('Operación no disponible.');
    }

    const resultado = await tx.runAsync(
      `UPDATE operaciones_pendientes
       SET estado = ?,
           ultimo_error = ?,
           proximo_intento_en = NULL
       WHERE id_operacion = ?
         AND estado = 'ENVIANDO'`,
      [estado, motivo, operacionId]
    );

    if (resultado.changes !== 1) {
      throw new Error('No se pudo actualizar la operación.');
    }

    const comanda = await tx.runAsync(
      `UPDATE comandas_locales
       SET estado_sync = ?,
           actualizada_en = ?
       WHERE id_local = ?`,
      [estado, fecha, operacion.comanda_id]
    );

    if (comanda.changes !== 1) {
      throw new Error('No se pudo actualizar la comanda.');
    }
  });
}


export async function confirmarOperacionConciliadaPOS(
  operacionId: string,
  pedidoIdPOS: string,
  recibo?: { folio: string; totalCentavos: number }
): Promise<void> {
  if (!operacionId.trim() || !pedidoIdPOS.trim()) {
    throw new Error('Identificadores obligatorios.');
  }

  const db = await obtenerBaseDatos();
  const fecha = new Date().toISOString();

  await transaccionLocal(db, async (tx) => {
    const registro = await tx.getFirstAsync<{
      comanda_id: string;
      id_servidor: string | null;
    }>(
      `SELECT o.comanda_id, c.id_servidor
       FROM operaciones_pendientes o
       INNER JOIN comandas_locales c
         ON c.id_local = o.comanda_id
       WHERE o.id_operacion = ?
         AND o.estado = 'RESULTADO_DESCONOCIDO'
         AND o.tipo IN ('COMANDA_CREAR', 'POS_PEDIDO_PRUEBA')`,
      [operacionId]
    );

    if (!registro) {
      throw new Error(
        'La operación no está disponible para conciliación.'
      );
    }

    if (
      registro.id_servidor !== null &&
      registro.id_servidor !== pedidoIdPOS
    ) {
      throw new Error('Existe otro identificador del POS.');
    }

    const resultadoOperacion = await tx.runAsync(
      `UPDATE operaciones_pendientes
       SET estado = 'CONFIRMADA',
           ultimo_error = NULL,
           proximo_intento_en = NULL
       WHERE id_operacion = ?
         AND estado = 'RESULTADO_DESCONOCIDO'`,
      [operacionId]
    );

    if (resultadoOperacion.changes !== 1) {
      throw new Error('No se pudo confirmar la operación.');
    }

    const resultadoComanda = await tx.runAsync(
      `UPDATE comandas_locales
       SET id_servidor = ?,
           folio_confirmado = ?, total_confirmado_centavos = ?,
           estado_sync = 'CONFIRMADA',
           actualizada_en = ?
       WHERE id_local = ?`,
      [pedidoIdPOS, recibo?.folio ?? null, recibo ? recibo.totalCentavos : null, fecha, registro.comanda_id]
    );

    if (resultadoComanda.changes !== 1) {
      throw new Error('No se pudo confirmar la comanda.');
    }
  });
}