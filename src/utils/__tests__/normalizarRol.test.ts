import { describe, test, expect } from "@jest/globals";
import { normalizarRol } from "../normalizarRol";

describe("Normalización de roles - Pizza Mya", () => {
  test("acepta el rol MESERO", () => {
    expect(normalizarRol("MESERO")).toBe("mesero");
  });

  test("acepta el rol COCINA", () => {
    expect(normalizarRol("COCINA")).toBe("cocina");
  });

  test("acepta roles en minúsculas", () => {
    expect(normalizarRol("mesero")).toBe("mesero");
  });

  test("elimina espacios alrededor del rol", () => {
    expect(normalizarRol("  COCINA  ")).toBe("cocina");
  });

  test("rechaza el rol CLIENTE", () => {
    expect(normalizarRol("CLIENTE")).toBeNull();
  });

  test("rechaza el rol ADMIN", () => {
    expect(normalizarRol("ADMIN")).toBeNull();
  });

  test("rechaza el rol CAJERO", () => {
    expect(normalizarRol("CAJERO")).toBeNull();
  });

  test("rechaza roles desconocidos", () => {
    expect(normalizarRol("DESCONOCIDO")).toBeNull();
  });

  test("rechaza un rol vacío", () => {
    expect(normalizarRol("")).toBeNull();
  });

  test("no equipara COCINERO con COCINA", () => {
    expect(normalizarRol("COCINERO")).toBeNull();
  });
});
