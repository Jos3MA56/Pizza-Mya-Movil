
import { obtenerBaseDatos } from '../storage/database';

import { obtenerConfiguracionPOS } from './PosLanConfig';
import { validarComandaSimplePOS } from './ValidarComandaPOS';
import { syncService } from './SyncService';

interface OperacionEnCola {
  id_operacion: string;
  intentos: number;
}

export class ProcesadorAutomaticoPOS {
  private temporizador: ReturnType<typeof setInterval> | null =
    null;

  private procesando = false;
  private meseroId: string | null = null;
  private generacion = 0;

  private readonly intervaloMs = 5000;
  private readonly maxIntentos = 6;

  private ultimaConciliacion = 0;
  private readonly intervaloConciliacionMs = 30000;

  private readonly operacionesOmitidas = new Set<string>();

  iniciar(meseroId: string): void {
    if (!meseroId.trim()) {
      throw new Error('Mesero obligatorio.');
    }

    if (this.temporizador !== null) {
      return;
    }

    this.meseroId = meseroId;
    this.generacion += 1;

    const generacionActual = this.generacion;

    console.log('[SYNC AUTO] Procesador iniciado.');

    this.temporizador = setInterval(() => {
      void this.procesar(generacionActual);
    }, this.intervaloMs);

    void this.procesar(generacionActual);
  }

  detener(): void {
    this.generacion += 1;

    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }

    this.meseroId = null;
    this.operacionesOmitidas.clear();

    console.log('[SYNC AUTO] Procesador detenido.');
  }

  private estaActivo(generacion: number): boolean {
    return (
      this.generacion === generacion &&
      this.meseroId !== null &&
      this.temporizador !== null
    );
  }

  private async procesar(generacion: number): Promise<void> {
    if (
      this.procesando ||
      !this.estaActivo(generacion)
    ) {
      return;
    }

    const meseroId = this.meseroId;

    if (!meseroId) return;

    this.procesando = true;

    try {
      const config = await obtenerConfiguracionPOS();

      if (!config || !this.estaActivo(generacion)) {
        return;
      }

      const db = await obtenerBaseDatos();

      // Primero consultar operaciones cuyo resultado
      // es desconocido. Nunca reenviarlas directamente.
      if (
        Date.now() - this.ultimaConciliacion >=
        this.intervaloConciliacionMs
      ) {
        this.ultimaConciliacion = Date.now();

        const desconocidas =
          await db.getAllAsync<{ id_operacion: string }>(
            `SELECT id_operacion
             FROM operaciones_pendientes
             WHERE tipo = 'COMANDA_CREAR'
               AND estado = 'RESULTADO_DESCONOCIDO'
               AND mesero_id = ?
             ORDER BY creada_en ASC
             LIMIT 10`,
            [meseroId]
          );

        for (const operacion of desconocidas) {
          if (!this.estaActivo(generacion)) return;

          try {
            const resultado =
              await syncService.conciliarOperacionPOS(
                operacion.id_operacion,
                config.urlBase,
                config.token
              );

            console.log(
              '[SYNC AUTO] Conciliación:',
              operacion.id_operacion,
              resultado
            );
          } catch (error) {
            console.warn(
              '[SYNC AUTO] Conciliación pendiente:',
              operacion.id_operacion,
              error instanceof Error
                ? error.message
                : String(error)
            );
          }
        }
      }

      if (!this.estaActivo(generacion)) return;

      const ahora = new Date().toISOString();

      // Solo comandas reales del mesero autenticado.
      // Las operaciones de prueba quedan excluidas.
      const pendientes =
        await db.getAllAsync<OperacionEnCola>(
          `SELECT id_operacion, intentos
           FROM operaciones_pendientes
           WHERE tipo = 'COMANDA_CREAR'
             AND mesero_id = ?
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
           ORDER BY creada_en ASC
           LIMIT 10`,
          [meseroId, ahora]
        );

      for (const operacion of pendientes) {
        if (!this.estaActivo(generacion)) return;

        if (
          this.operacionesOmitidas.has(
            operacion.id_operacion
          )
        ) {
          continue;
        }

        if (operacion.intentos >= this.maxIntentos) {
          console.warn(
            '[SYNC AUTO] Límite de intentos:',
            operacion.id_operacion
          );

          this.operacionesOmitidas.add(
            operacion.id_operacion
          );

          continue;
        }

        // No enviar comandas con información
        // incompatible con el POS simplificado.
        try {
          await validarComandaSimplePOS(
            operacion.id_operacion
          );
        } catch (error) {
          console.warn(
            '[SYNC AUTO] Comanda incompatible:',
            operacion.id_operacion,
            error instanceof Error
              ? error.message
              : String(error)
          );

          this.operacionesOmitidas.add(
            operacion.id_operacion
          );

          continue;
        }

        if (!this.estaActivo(generacion)) return;

        try {
          const resultado =
            await syncService.enviarOperacionPOS(
              operacion.id_operacion,
              config.urlBase,
              config.token
            );

          console.log(
            '[SYNC AUTO] Comanda confirmada:',
            resultado.pedido.folio
          );
        } catch (error) {
          // SyncService ya registra el estado de error,
          // conflicto o reintento en SQLite.
          console.warn(
            '[SYNC AUTO] Envío no confirmado:',
            operacion.id_operacion,
            error instanceof Error
              ? error.message
              : String(error)
          );
        }
      }
    } catch (error) {
      console.error(
        '[SYNC AUTO] Error del procesador:',
        error
      );
    } finally {
      this.procesando = false;
    }
  }
}

export const procesadorAutomaticoPOS =
  new ProcesadorAutomaticoPOS();
