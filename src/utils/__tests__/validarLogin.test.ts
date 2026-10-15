import { describe, test, expect } from "@jest/globals";
import { validarLogin } from "../validarLogin";

describe("Validación del login - Pizza Mya", () => {
  test("rechaza el correo vacío", () => {
    expect(validarLogin("", "Clave12345")).toBe(
      "Todos los campos son obligatorios.",
    );
  });

  test("rechaza la contraseña vacía", () => {
    expect(validarLogin("mesero@example.com", "")).toBe(
      "Todos los campos son obligatorios.",
    );
  });

  test("rechaza campos con espacios en blanco", () => {
    expect(validarLogin("   ", "   ")).toBe(
      "Todos los campos son obligatorios.",
    );
  });

  test("rechaza un correo sin arroba", () => {
    expect(validarLogin("meseroexample.com", "Clave12345")).toBe(
      "Introduce un correo electrónico válido.",
    );
  });

  test("rechaza un correo sin dominio válido", () => {
    expect(validarLogin("mesero@", "Clave12345")).toBe(
      "Introduce un correo electrónico válido.",
    );
  });

  test("acepta un correo y contraseña válidos", () => {
    expect(validarLogin("mesero@example.com", "Clave12345")).toBeNull();
  });

  test("acepta espacios alrededor de un correo válido", () => {
    expect(validarLogin("  mesero@example.com  ", "Clave12345")).toBeNull();
  });
});
