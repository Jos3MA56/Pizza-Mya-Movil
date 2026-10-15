
import { useEffect, useState } from 'react';

import {
  guardarConfiguracionPOS,
  obtenerConfiguracionPOS,
  eliminarConfiguracionPOS,
  type ConfiguracionPOS,
} from '../services/sync/PosLanConfig';

const URL_INICIAL = 'http://192.168.1.78:3101';

async function verificarConexion(
  config: ConfiguracionPOS
): Promise<void> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 7000);

  try {
    // Usamos una ruta protegida para validar el token.
    const respuesta = await fetch(
      `${config.urlBase}/api/local/mesas`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        signal: controller.signal,
      }
    );

    if (respuesta.status === 401) {
      throw new Error('El token LAN es incorrecto.');
    }

    if (!respuesta.ok) {
      throw new Error(
        `El POS respondió HTTP ${respuesta.status}.`
      );
    }

    const datos = (await respuesta.json()) as {
      mesas?: unknown;
    };

    if (!Array.isArray(datos.mesas)) {
      throw new Error('Respuesta inesperada del POS.');
    }
  } finally {
    clearTimeout(timeout);
  }
}

export function usePosLanConfigViewModel() {
  const [urlBase, setUrlBase] = useState(URL_INICIAL);
  const [token, setToken] = useState('');
  const [configurada, setConfigurada] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(
    'Consultando configuración...'
  );

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const config = await obtenerConfiguracionPOS();

        if (!activo) return;

        if (config) {
          setUrlBase(config.urlBase);
          setConfigurada(true);
          setMensaje('POS configurado. Verifica la conexión.');
        } else {
          setMensaje('POS sin configurar.');
        }
      } catch {
        if (activo) {
          setMensaje('No se pudo cargar la configuración.');
        }
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  async function guardarYVerificar() {
    if (procesando) return;

    setProcesando(true);
    setMensaje('Verificando conexión...');

    try {
      const config: ConfiguracionPOS = {
        urlBase: urlBase.trim(),
        token: token.trim(),
      };

      await verificarConexion(config);
      await guardarConfiguracionPOS(config);

      setConfigurada(true);
      setToken('');
      setMensaje('POS conectado y configuración guardada.');
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : 'Error al configurar el POS.'
      );
    } finally {
      setProcesando(false);
    }
  }

  async function comprobarConexion() {
    if (procesando) return;

    setProcesando(true);
    setMensaje('Comprobando POS...');

    try {
      const config = await obtenerConfiguracionPOS();

      if (!config) {
        throw new Error('No existe configuración guardada.');
      }

      await verificarConexion(config);

      setMensaje('POS conectado y autorizado.');
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con el POS.'
      );
    } finally {
      setProcesando(false);
    }
  }

  async function desvincularPOS() {
    if (procesando) return;

    setProcesando(true);

    try {
      await eliminarConfiguracionPOS();

      setToken('');
      setConfigurada(false);
      setMensaje('Dispositivo desvinculado del POS.');
    } catch {
      setMensaje('No se pudo desvincular el POS.');
    } finally {
      setProcesando(false);
    }
  }

  return {
    urlBase,
    setUrlBase,
    token,
    setToken,
    configurada,
    procesando,
    mensaje,
    guardarYVerificar,
    comprobarConexion,
    desvincularPOS,
  };
}
