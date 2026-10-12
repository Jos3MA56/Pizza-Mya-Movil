export type RolUsuario = "mesero" | "cocina";

export interface Usuario {
  id: string;
  nombre: string;
  rol: RolUsuario;
}
