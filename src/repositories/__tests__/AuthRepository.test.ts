import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterAll,
} from "@jest/globals";

import { ApiClient, ApiHttpError } from "../../services/api/ApiClient";

// URL ficticia: no se conecta al backend real.
jest.mock("../../services/api/apiConfig", () => ({
  API_BASE_URL: "https://api-pruebas.example.com",
}));

// Simulamos solamente el método POST.
// Conservamos la implementación real de ApiClient.
const postSimulado = jest.spyOn(ApiClient.prototype, "post");

import { autenticarUsuario } from "../AuthRepository";

describe("AuthRepository - autenticación", () => {
  beforeEach(() => {
    postSimulado.mockReset();
  });

  afterAll(() => {
    postSimulado.mockRestore();
  });

  test("devuelve token y usuario ante login exitoso", async () => {
    postSimulado.mockResolvedValue({
      status: 200,
      data: {
        ok: true,
        data: {
          token: "jwt-de-prueba",
          user: {
            id: "usuario-1",
            nombres: "Mesero Prueba",
            email: "mesero@example.com",
            rol: "MESERO",
            activo: true,
          },
        },
      },
    });

    const resultado = await autenticarUsuario(
      "mesero@example.com",
      "ClaveDePrueba123",
    );

    expect(resultado.token).toBe("jwt-de-prueba");
    expect(resultado.user.rol).toBe("MESERO");

    expect(postSimulado).toHaveBeenCalledWith("/api/auth/login", {
      email: "mesero@example.com",
      password: "ClaveDePrueba123",
    });
  });

  test("rechaza respuestas sin token", async () => {
    postSimulado.mockResolvedValue({
      status: 200,
      data: {
        ok: true,
        data: {
          token: "",
          user: {
            id: "usuario-1",
            nombres: "Mesero Prueba",
            email: "mesero@example.com",
            rol: "MESERO",
            activo: true,
          },
        },
      },
    });

    await expect(
      autenticarUsuario("mesero@example.com", "ClaveDePrueba123"),
    ).rejects.toThrow("Respuesta de autenticación inválida.");
  });

  test("rechaza respuestas sin usuario", async () => {
    postSimulado.mockResolvedValue({
      status: 200,
      data: {
        ok: true,
        data: {
          token: "jwt-de-prueba",
          user: null,
        },
      },
    });

    await expect(
      autenticarUsuario("mesero@example.com", "ClaveDePrueba123"),
    ).rejects.toThrow("Respuesta de autenticación inválida.");
  });

  test("propaga el error HTTP 401 del servidor", async () => {
    postSimulado.mockRejectedValue(new ApiHttpError(401));

    await expect(
      autenticarUsuario("mesero@example.com", "ClaveIncorrecta"),
    ).rejects.toBeInstanceOf(ApiHttpError);
  });
});
