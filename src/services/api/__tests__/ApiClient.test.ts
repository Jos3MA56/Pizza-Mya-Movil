import { describe, test, expect, jest } from "@jest/globals";
import {
  ApiClient,
  ApiHttpError,
  ApiNetworkError,
  ApiTimeoutError,
  ApiConfigurationError,
} from "../ApiClient";

describe("ApiClient - pruebas unitarias", () => {
  const baseUrl = "https://api-pruebas.example.com";

  test("realiza una solicitud POST correctamente", async () => {
    const fetchSimulado = jest.fn<() => Promise<Response>>().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: () => "application/json",
      },
      text: async () =>
        JSON.stringify({
          ok: true,
          data: {
            token: "token-simulado",
            user: {
              id: "1",
              rol: "MESERO",
            },
          },
        }),
    } as unknown as Response);

    const api = new ApiClient({
      baseUrl,
      fetchImpl: fetchSimulado as unknown as typeof fetch,
    });

    const resultado = await api.post("/api/auth/login", {
      email: "mesero@example.com",
      password: "PasswordDePrueba123",
    });

    expect(resultado.status).toBe(200);

    expect(resultado.data).toEqual({
      ok: true,
      data: {
        token: "token-simulado",
        user: {
          id: "1",
          rol: "MESERO",
        },
      },
    });

    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(fetchSimulado).toHaveBeenCalledWith(
      `${baseUrl}/api/auth/login`,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  test("maneja credenciales rechazadas con HTTP 401", async () => {
    const fetchSimulado = jest.fn<() => Promise<Response>>().mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    const api = new ApiClient({
      baseUrl,
      fetchImpl: fetchSimulado as unknown as typeof fetch,
    });

    await expect(
      api.post("/api/auth/login", {
        email: "mesero@example.com",
        password: "incorrecta",
      }),
    ).rejects.toBeInstanceOf(ApiHttpError);
  });

  test("detecta errores de red", async () => {
    const fetchSimulado = jest
      .fn<() => Promise<Response>>()
      .mockRejectedValue(new Error("Sin conexión"));

    const api = new ApiClient({
      baseUrl,
      fetchImpl: fetchSimulado as unknown as typeof fetch,
    });

    await expect(api.get("/api/health")).rejects.toBeInstanceOf(
      ApiNetworkError,
    );
  });

  test("rechaza una URL base inválida", () => {
    expect(
      () =>
        new ApiClient({
          baseUrl: "direccion-invalida",
        }),
    ).toThrow(ApiConfigurationError);
  });

  test("rechaza rutas absolutas externas", async () => {
    const fetchSimulado = jest.fn();

    const api = new ApiClient({
      baseUrl,
      fetchImpl: fetchSimulado as unknown as typeof fetch,
    });

    await expect(api.get("https://otro-servidor.com")).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );

    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  test("detecta cuando el servidor excede el tiempo límite", async () => {
    jest.useFakeTimers();

    try {
      const fetchSimulado = jest.fn(
        (_url: string, opciones?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            opciones?.signal?.addEventListener("abort", () =>
              reject(new Error("Abortado")),
            );
          }),
      );

      const api = new ApiClient({
        baseUrl,
        timeoutMs: 1000,
        fetchImpl: fetchSimulado as typeof fetch,
      });

      const solicitud = api.get("/api/health");

      const comprobacion =
        expect(solicitud).rejects.toBeInstanceOf(ApiTimeoutError);

      await jest.advanceTimersByTimeAsync(1000);
      await comprobacion;
    } finally {
      jest.useRealTimers();
    }
  });
});
