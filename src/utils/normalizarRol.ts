import type { RolUsuario } from "../models/Usuario";

export function normalizarRol(rol: string): RolUsuario | null {
  switch (rol.trim().toUpperCase()) {
    case "MESERO":
      return "mesero";

    case "COCINA":
      return "cocina";

    default:
      return null;
  }
}
