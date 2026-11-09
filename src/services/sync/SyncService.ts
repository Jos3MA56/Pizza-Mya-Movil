import { exigirActorLocal } from '../SesionLocal';
import {
  obtenerOperacionPorId,
  marcarOperacionEnviando,
  registrarErrorReintentable,
  obtenerOperacionConPayload,
  confirmarOperacionPOS,
  registrarConflictoPOS,
  registrarEstadoNoConfirmadoPOS,
  confirmarOperacionConciliadaPOS,
  type OperacionLocal,
} from '../../repositories/OperacionPendienteRepository';

import {
  enviarPedidoPOS,
  contenidoPOS,
  ErrorHTTPPOS,
  consultarPedidoPOS,
  type PayloadPedidoPOS,
  type ResultadoEnvioPOS,
} from './PosLanClient';

import { validarComandaSimplePOS } from './ValidarComandaPOS';

export interface ResumenSincronizacion {
    procesando: boolean;
    operacionesElegibles: number;
    operacionesOmitidas: number;
}

export class SyncService {
    constructor(private readonly transporte = { enviar: enviarPedidoPOS, consultar: consultarPedidoPOS }) {}
    private enEjecucion = false;
    private temporizadorPrueba: ReturnType<typeof setTimeout> | null = null;
    private pruebaActiva = false;
    private readonly maxIntentosPrueba = 3;
    /**
     * Prueba aislada de un fallo de red.
     * Solo admite operaciones PRUEBA_LOCAL.
     * No utiliza la API real.
     */
    async simularFalloDeRed(operacionId: string, transporteSimulado: (id: string) => Promise<void>): Promise<void> {
        if (this.enEjecucion) {
            throw new Error('Ya existe una sincronización en ejecución.');
        }
        this.enEjecucion = true;
        try {
            const operacion = await obtenerOperacionPorId(operacionId);
            if (!operacion || operacion.tipo !== 'PRUEBA_LOCAL') {
                throw new Error('Solo se permiten operaciones locales de prueba.');
            }
            if (operacion.estado !== 'PENDIENTE' &&
                operacion.estado !== 'ERROR_REINTENTABLE') {
                throw new Error('La operación no está disponible para reintento.');
            }
            await marcarOperacionEnviando(operacionId);
            console.log('[SYNC MOCK] Estado: ENVIANDO');
            try {
                await transporteSimulado(operacionId);
            }
            catch (error) {
                if (!(error instanceof Error) ||
                    error.message !== 'SIN_RED_SIMULADA') {
                    throw error;
                }
                console.log('[SYNC MOCK] Fallo de conexión detectado.');
                await registrarErrorReintentable(operacionId, 'SIN_RED');
                console.log('[SYNC MOCK] Reintento programado correctamente.');
                return;
            }
            throw new Error('La simulación debía producir un fallo de red.');
        }
        finally {
            this.enEjecucion = false;
        }
    }

    async iniciarReintentosAutomaticosPrueba(operacionId: string): Promise<void> {
        if (this.pruebaActiva) {
            console.log('[SYNC AUTO] El proceso ya está activo.');
            return;
        }
        this.pruebaActiva = true;
        try {
            const operacion = await obtenerOperacionPorId(operacionId);
            if (!operacion || operacion.tipo !== 'PRUEBA_LOCAL') {
                throw new Error('Operación de prueba no válida.');
            }
            if (!this.pruebaActiva)
                return;
            await this.programarProximoIntentoPrueba(operacionId);
        }
        catch (error) {
            this.detenerReintentosAutomaticosPrueba();
            throw error;
        }
    }

    detenerReintentosAutomaticosPrueba(): void {
        this.pruebaActiva = false;
        if (this.temporizadorPrueba !== null) {
            clearTimeout(this.temporizadorPrueba);
            this.temporizadorPrueba = null;
        }
    }

    private async programarProximoIntentoPrueba(operacionId: string): Promise<void> {
        if (!this.pruebaActiva)
            return;
        const operacion = await obtenerOperacionPorId(operacionId);
        if (!this.pruebaActiva)
            return;
        if (!operacion || operacion.tipo !== 'PRUEBA_LOCAL') {
            this.detenerReintentosAutomaticosPrueba();
            throw new Error('No se encontró la operación de prueba.');
        }
        if (operacion.intentos >= this.maxIntentosPrueba) {
            console.log('[SYNC AUTO] Límite de intentos automáticos alcanzado.');
            this.detenerReintentosAutomaticosPrueba();
            return;
        }
        if (operacion.estado !== 'PENDIENTE' &&
            operacion.estado !== 'ERROR_REINTENTABLE') {
            console.log('[SYNC AUTO] Operación no elegible:', operacion.estado);
            this.detenerReintentosAutomaticosPrueba();
            return;
        }
        const fechaSiguiente = operacion.proximo_intento_en
            ? new Date(operacion.proximo_intento_en).getTime()
            : Date.now();
        if (!Number.isFinite(fechaSiguiente)) {
            this.detenerReintentosAutomaticosPrueba();
            throw new Error('Fecha de reintento no válida.');
        }
        const esperaMs = Math.max(0, fechaSiguiente - Date.now());
        console.log(`[SYNC AUTO] Intento ${operacion.intentos + 1}/${this.maxIntentosPrueba} en ${Math.ceil(esperaMs / 1000)} segundos.`);
        this.temporizadorPrueba = setTimeout(() => {
            this.temporizadorPrueba = null;
            if (!this.pruebaActiva)
                return;
            void (async () => {
                try {
                    await this.simularFalloDeRed(operacionId, async () => {
                        throw new Error('SIN_RED_SIMULADA');
                    });
                    const resultado = await obtenerOperacionPorId(operacionId);
                    console.log('[SYNC AUTO] Estado:', resultado?.estado);
                    console.log('[SYNC AUTO] Intentos realizados:', resultado?.intentos);
                    await this.programarProximoIntentoPrueba(operacionId);
                }
                catch (error) {
                    console.error('[SYNC AUTO] Error en proceso automático:', error);
                    this.detenerReintentosAutomaticosPrueba();
                }
            })();
        }, esperaMs);
    }

    async enviarOperacionPOS(operacionId: string, urlBase: string, token: string): Promise<ResultadoEnvioPOS> {
        if (this.enEjecucion) {
            throw new Error('Ya existe una sincronización en ejecución.');
        }
        // Validar configuración antes de cambiar el estado SQLite.
        if (!/^https?:\/\//.test(urlBase) ||
            !/^[a-fA-F0-9]{64}$/.test(token)) {
            throw new Error('Configuración LAN inválida.');
        }
        this.enEjecucion = true;
        try {

        const operacion = await obtenerOperacionConPayload(
            operacionId
        );

        if (
            !operacion ||
            !['COMANDA_CREAR', 'POS_PEDIDO_PRUEBA'].includes(
            operacion.tipo
            )
        ) {
            throw new Error('Tipo de operación no permitido.');
        }

        if (
            operacion.estado !== 'PENDIENTE' &&
            operacion.estado !== 'ERROR_REINTENTABLE'
        ) {
            throw new Error(
            `Estado no disponible: ${operacion.estado}`
            );
        }

        if (operacion.mesero_id !== exigirActorLocal('mesero').id) throw new Error('Operación de otro mesero.');
        if (operacion.intentos >= 6) throw new Error('Límite de intentos alcanzado.');
        let payload: PayloadPedidoPOS;

        if (operacion.tipo === 'COMANDA_CREAR') {
            // Verificar que no se pierdan datos de la comanda.
            // Si no es compatible, NO se cambia su estado.
            payload = await validarComandaSimplePOS(
            operacionId
            );
        } else {
            // Conservar el comportamiento de pruebas anterior.
            const datos: unknown = JSON.parse(
            operacion.payload_json
            );

            if (
            !datos ||
            typeof datos !== 'object' ||
            Array.isArray(datos) ||
            (datos as Record<string, unknown>).requestId !==
                operacion.id_operacion
            ) {
            throw new Error(
                'El payload no coincide con la operación local.'
            );
            }

            payload = datos as PayloadPedidoPOS;
        }

            await marcarOperacionEnviando(operacionId);
            console.log('[SYNC POS] Estado: ENVIANDO');
            let resultado: ResultadoEnvioPOS;
            try {
                resultado = await this.transporte.enviar({
                    urlBase,
                    token,
                    payload,
                });
            }
            catch (error) {
                if (error instanceof ErrorHTTPPOS &&
                    error.status === 409) {
                    await registrarConflictoPOS(operacionId);
                    console.log('[SYNC POS] Conflicto registrado.');
                }
                else if (error instanceof ErrorHTTPPOS &&
                    (error.status === 408 ||
                        error.status === 429 ||
                        error.status >= 500)) {
                    if (error.status === 429) await registrarErrorReintentable(operacionId, 'SERVIDOR_TEMPORAL');
                    else await registrarEstadoNoConfirmadoPOS(operacionId, 'RESULTADO_DESCONOCIDO', 'SERVIDOR_SIN_CONFIRMACION');
                }
                else if (error instanceof ErrorHTTPPOS &&
                    error.status >= 400 &&
                    error.status < 500) {
                    await registrarEstadoNoConfirmadoPOS(operacionId, 'RECHAZADA', `HTTP_${error.status}: ${error.message.slice(0, 300)}`);
                }
                else if (error instanceof Error &&
                    error.message === 'POS_TIMEOUT') {
                    await registrarEstadoNoConfirmadoPOS(operacionId, 'RESULTADO_DESCONOCIDO', 'TIMEOUT');
                }
                 else if (
                error instanceof Error &&
                (
                    error instanceof TypeError ||
                    /java\.net\.ConnectException|Failed to connect|Network request failed|fetch failed/i.test(
                    error.message
                    )
                )
                ) {
                console.log(
                    '[SYNC POS] Fallo de conexión detectado.'
                );

                await registrarEstadoNoConfirmadoPOS(operacionId, 'RESULTADO_DESCONOCIDO', 'CONEXION_INTERRUMPIDA');

                console.log(
                    '[SYNC POS] Requiere conciliación antes de reenviar.'
                );
                }
                else {
                    // No sabemos si el servidor recibió el pedido.
                    // Requiere conciliación antes de volver a enviarlo.
                    await registrarEstadoNoConfirmadoPOS(operacionId, 'RESULTADO_DESCONOCIDO', 'RESPUESTA_NO_VERIFICADA');
                }
                throw error;
            }
            // Solo confirmar tras una respuesta válida del POS.
            await confirmarOperacionPOS(operacionId, resultado.pedido.id, resultado.pedido);
            console.log('[SYNC POS] Estado: CONFIRMADA');
            console.log('[SYNC POS] Folio:', resultado.pedido.folio);
            console.log('[SYNC POS] Duplicado:', resultado.duplicado);
            return resultado;
        }
        finally {
            this.enEjecucion = false;
        }
    }


  async enviarOperacionPOSPrueba(
        operacionId: string,
        urlBase: string,
        token: string
    ): Promise<ResultadoEnvioPOS> {
        const operacion = await obtenerOperacionPorId(
        operacionId
        );

        if (
        !operacion ||
        operacion.tipo !== 'POS_PEDIDO_PRUEBA'
        ) {
        throw new Error(
            'Este método solo admite pedidos de prueba.'
        );
        }

        return this.enviarOperacionPOS(
        operacionId,
        urlBase,
        token
        );
    }

    async conciliarOperacionPOS(
        operacionId: string,
        urlBase: string,
        token: string
    ): Promise<'CONFIRMADA' | 'NO_ENCONTRADA'> {
        if (this.enEjecucion) {
        throw new Error('Ya existe una sincronización activa.');
        }

        this.enEjecucion = true;

        try {
        const operacion = await obtenerOperacionConPayload(
            operacionId
        );

        if (
            !operacion ||
            !['COMANDA_CREAR', 'POS_PEDIDO_PRUEBA'].includes(
            operacion.tipo
            ) ||
            operacion.estado !== 'RESULTADO_DESCONOCIDO'
        ) {
            throw new Error(
            'Operación no disponible para conciliación.'
            );
        }

        if (operacion.mesero_id !== exigirActorLocal('mesero').id) throw new Error('Operación de otro mesero.');
        const payload: unknown = JSON.parse(
            operacion.payload_json
        );

        if (
            !payload ||
            typeof payload !== 'object' ||
            Array.isArray(payload)
        ) {
            throw new Error('Payload inválido.');
        }

        const datos = payload as Record<string, unknown>;

        if (
            datos.requestId !== operacion.id_operacion ||
            !Number.isInteger(datos.mesa) ||
            typeof datos.meseroId !== 'string' ||
            !Array.isArray(datos.productos)
        ) {
            throw new Error('Payload incompatible con el POS.');
        }

        const productos = datos.productos as unknown[];

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
            throw new Error('Productos locales inválidos.');
        }

        const pedido = await this.transporte.consultar({
            urlBase,
            token,
            requestId: operacion.id_operacion,
        });

        if (!pedido) {
            console.log(
            '[CONCILIACION] Pedido no encontrado en POS.'
            );

            // No modificar el estado automáticamente.
            return 'NO_ENCONTRADA';
        }

        const ordenarProductos = (
            items: Array<{ productoId: string; cantidad: number }>
        ) =>
            JSON.stringify(
            items
                .map((item) => ({
                productoId: item.productoId,
                cantidad: item.cantidad,
                }))
                .sort((a, b) =>
                a.productoId.localeCompare(b.productoId)
                )
            );

        const productosLocales = productos as Array<{
            productoId: string;
            cantidad: number;
        }>;

        const mismoContenido = datos.versionContrato === 2 ? Boolean(pedido.contenido && contenidoPOS(pedido.contenido) === contenidoPOS(datos as unknown as PayloadPedidoPOS)) :
            pedido.requestId === operacion.id_operacion &&
            pedido.mesa === datos.mesa &&
            pedido.meseroId === datos.meseroId &&
            ordenarProductos(pedido.productos) ===
            ordenarProductos(productosLocales);

        if (!mismoContenido) {
            throw new Error(
            'CONFLICTO: el pedido del POS no coincide con la comanda local.'
            );
        }

        await confirmarOperacionConciliadaPOS(
            operacionId,
            pedido.id, pedido
        );

        console.log('[CONCILIACION] Estado: CONFIRMADA');
        console.log('[CONCILIACION] Folio:', pedido.folio);

        return 'CONFIRMADA';
        } finally {
        this.enEjecucion = false;
        }
    }


    private esOperacionValida(operacion: OperacionLocal): boolean {
        if (operacion.tipo === 'PRUEBA_LOCAL') {
            return false;
        }
        if (operacion.estado !== 'PENDIENTE' &&
            operacion.estado !== 'ERROR_REINTENTABLE') {
            return false;
        }
        if (operacion.proximo_intento_en &&
            new Date(operacion.proximo_intento_en).getTime() >
                Date.now()) {
            return false;
        }
        return true;
    }
}

export const syncService = new SyncService();
