
import * as SecureStore from 'expo-secure-store';

const CLAVE_CONFIG = 'pizza_mya_pos_lan_config_v1';

export interface ConfiguracionPOS {
  urlBase: string;
  token: string;
}

function validarConfiguracion(config: ConfiguracionPOS): void {
  if (
    !/^https?:\/\/[a-zA-Z0-9.-]+:\d{1,5}$/.test(
      config.urlBase
    )
  ) {
    throw new Error('Dirección del POS inválida.');
  }

  if (!/^[a-fA-F0-9]{64}$/.test(config.token)) {
    throw new Error('Token LAN inválido.');
  }
}

// Se utiliza durante la configuración inicial del dispositivo.
export async function guardarConfiguracionPOS(
  config: ConfiguracionPOS
): Promise<void> {
  validarConfiguracion(config);

  await SecureStore.setItemAsync(
    CLAVE_CONFIG,
    JSON.stringify(config)
  );
}

// Recupera la configuración al iniciar la aplicación.
export async function obtenerConfiguracionPOS():
  Promise<ConfiguracionPOS | null> {
  const guardado = await SecureStore.getItemAsync(
    CLAVE_CONFIG
  );

  if (!guardado) {
    return null;
  }

  const config = JSON.parse(guardado) as ConfiguracionPOS;

  validarConfiguracion(config);

  return config;
}

// Permite desvincular el teléfono del POS.
export async function eliminarConfiguracionPOS():
  Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_CONFIG);
}
