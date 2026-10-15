
import { obtenerBaseDatos } from '../storage/database';
import { obtenerConfiguracionPOS } from './PosLanConfig';
import { syncService } from './SyncService';

let ejecucionActual: Promise<void> | null = null;

export function recuperarConfirmacionesPOS(): Promise<void> {
  if (ejecucionActual) {
    return ejecucionActual;
  }

  ejecucionActual = (async () => {
    const config = await obtenerConfiguracionPOS();

    if (!config) {
      console.log('[RECUPERACION POS] Sin configuración LAN.');
      return;
    }

    const db = await obtenerBaseDatos();

    const operaciones = await db.getAllAsync<{
      id_operacion: string;
    }>(
      `SELECT id_operacion
       FROM operaciones_pendientes
       WHERE tipo = 'POS_PEDIDO_PRUEBA'
         AND estado = 'RESULTADO_DESCONOCIDO'
       ORDER BY creada_en ASC
       LIMIT 10`
    );

    console.log(
      '[RECUPERACION POS] Operaciones por conciliar:',
      operaciones.length
    );

    for (const operacion of operaciones) {
      try {
        const resultado = await syncService.conciliarOperacionPOS(
          operacion.id_operacion,
          config.urlBase,
          config.token
        );

        console.log(
          '[RECUPERACION POS] Resultado:',
          resultado
        );
      } catch (error) {
        console.warn(
          '[RECUPERACION POS] Conciliación pendiente:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  })().finally(() => {
    ejecucionActual = null;
  });

  return ejecucionActual;
}
