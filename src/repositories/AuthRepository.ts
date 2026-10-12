import { ApiClient } from "../services/api/ApiClient";
import { API_BASE_URL } from "../services/api/apiConfig";

export interface UsuarioBackend {
  id: string;
  nombres: string;
  paterno?: string;
  email: string;
  rol: string;
  activo: boolean;
}

interface LoginResponse {
  ok: boolean;
  data: {
    token: string;
    user: UsuarioBackend;
  };
}

const api = new ApiClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 30000,
});

export async function autenticarUsuario(email: string, password: string) {
  // Evita duplicar /api cuando ya forma parte de la URL base.
  const baseContieneApi = /\/api\/?$/i.test(API_BASE_URL);
  const ruta = baseContieneApi ? "/auth/login" : "/api/auth/login";

  const respuesta = await api.post<LoginResponse>(ruta, { email, password });

  const resultado = respuesta.data;

  if (!resultado?.ok || !resultado.data?.token || !resultado.data?.user) {
    throw new Error("Respuesta de autenticación inválida.");
  }

  return resultado.data;
}
