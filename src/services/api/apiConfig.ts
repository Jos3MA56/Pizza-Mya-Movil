/**
 * Expo incorpora valores EXPO_PUBLIC_* al compilar el bundle.
 * La URL NO es un secreto: las claves privadas deben permanecer en el backend.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

// Ruta que existía en pruebas anteriores del backend web; verificar la actual.
// Puede sustituirse sin cambios al código mediante el archivo .env local.
export const API_HEALTH_PATH = process.env.EXPO_PUBLIC_API_HEALTH_PATH?.trim() || '/api/health';
