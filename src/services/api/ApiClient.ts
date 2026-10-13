/**
 * Cliente HTTP reutilizable. No contiene rutas de negocio, claves ni lógica de UI.
 * Permite inyectar fetch para ejecutar pruebas sin acceder al backend real.
 */
export interface ApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
}

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

export class ApiHttpError extends Error {
  constructor(public readonly status: number) {
    super(`El servidor respondió HTTP ${status}`);
    this.name = 'ApiHttpError';
  }
}

export class ApiNetworkError extends Error {
  constructor() {
    super('No se pudo conectar con el servidor. Comprueba la red y la URL de la API.');
    this.name = 'ApiNetworkError';
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super('El servidor tardó demasiado en responder.');
    this.name = 'ApiTimeoutError';
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    const base = options.baseUrl?.trim().replace(/\/+$/, '') ?? '';
    if (!/^https?:\/\/[^/\s]+(?:\/[^\s]*)?$/i.test(base)) {
      throw new ApiConfigurationError(
        'Configura una EXPO_PUBLIC_API_URL válida que empiece por http:// o https://.',
      );
    }
    this.baseUrl = base;
    this.timeoutMs = options.timeoutMs ?? 8000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new ApiConfigurationError('El tiempo de espera debe ser mayor que cero.');
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<ApiResponse<T>> {
    const limpio = path.trim();
    if (!limpio || /^(?:https?:)?\/\//i.test(limpio) || limpio.includes('..')) {
      throw new ApiConfigurationError('La ruta debe ser relativa a la API y no contener ..');
    }
    const ruta = limpio.startsWith('/') ? limpio : `/${limpio}`;
    const url = `${this.baseUrl}${ruta}`;
    const controller = new AbortController();
    let vencido = false;
    const temporizador = setTimeout(() => {
      vencido = true;
      controller.abort();
    }, this.timeoutMs);

    let respuesta: Response;
    try {
      respuesta = await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error: unknown) {
      if (vencido) throw new ApiTimeoutError();
      // No se incluyen detalles internos del error, que podrían exponer URLs o tokens.
      throw new ApiNetworkError();
    } finally {
      clearTimeout(temporizador);
    }

    if (!respuesta.ok) throw new ApiHttpError(respuesta.status);

    // El endpoint de salud puede responder JSON, texto o sin cuerpo (204).
    const texto = await respuesta.text();
    if (!texto) return { status: respuesta.status, data: null as T };
    const tipo = respuesta.headers.get('content-type') ?? '';
    if (tipo.includes('application/json') || tipo.includes('+json')) {
      try {
        return { status: respuesta.status, data: JSON.parse(texto) as T };
      } catch {
        throw new Error('El servidor devolvió un JSON no válido.');
      }
    }
    return { status: respuesta.status, data: texto as T };
  }
}
