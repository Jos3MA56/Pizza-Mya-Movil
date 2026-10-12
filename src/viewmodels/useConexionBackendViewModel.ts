import { useCallback, useState } from 'react';
import { ApiClient } from '../services/api/ApiClient';
import { API_BASE_URL, API_HEALTH_PATH } from '../services/api/apiConfig';

type EstadoConexion = 'sin-probar' | 'probando' | 'conectado' | 'error';

export function useConexionBackendViewModel() {
  const [estado, setEstado] = useState<EstadoConexion>('sin-probar');
  const [mensaje, setMensaje] = useState('Presiona «Probar conexión» para consultar el backend.');
  const [resultado, setResultado] = useState('');

  const probarConexion = useCallback(async () => {
    setEstado('probando');
    setMensaje('Consultando el servidor…');
    setResultado('');
    try {
      const cliente = new ApiClient({ baseUrl: API_BASE_URL, timeoutMs: 8000 });
      const respuesta = await cliente.get<unknown>(API_HEALTH_PATH);
      setEstado('conectado');
      setMensaje(`Conexión establecida. Respuesta HTTP ${respuesta.status}.`);
      // Se limita la cantidad mostrada para no saturar la pantalla de pruebas.
      const texto = typeof respuesta.data === 'string'
        ? respuesta.data
        : JSON.stringify(respuesta.data);
      setResultado((texto ?? 'Sin contenido').slice(0, 500));
    } catch (error: unknown) {
      setEstado('error');
      setMensaje(error instanceof Error ? error.message : 'Error desconocido de conexión');
    }
  }, []);

  return { estado, mensaje, resultado, probarConexion, baseUrl: API_BASE_URL, ruta: API_HEALTH_PATH };
}
