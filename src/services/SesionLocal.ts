import type { Usuario } from '../models/Usuario';
let actor: Usuario | null = null;
export function establecerActorLocal(usuario: Usuario | null) { actor = usuario; }
export function exigirActorLocal(rol: Usuario['rol']) {
  if (!actor || actor.rol !== rol) throw new Error('Sesión no autorizada.');
  return actor;
}
