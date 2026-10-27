import * as SecureStore from 'expo-secure-store';
import type { Usuario } from '../models/Usuario';
const CLAVE = 'pizza_mya_sesion_offline_v1';
const DURACION = 24 * 60 * 60 * 1000;
export async function guardarSesionLocal(usuario: Usuario, token: string) {
  await SecureStore.setItemAsync(CLAVE, JSON.stringify({ usuario, token, expira: Date.now() + DURACION }));
}
export async function recuperarSesionLocal(): Promise<{ usuario: Usuario; token: string } | null> {
  const texto = await SecureStore.getItemAsync(CLAVE);
  if (!texto) return null;
  try {
    const s = JSON.parse(texto);
    if (!s.usuario || typeof s.usuario.id !== 'string' || !s.usuario.id || typeof s.usuario.nombre !== 'string' || !['mesero','cocina'].includes(s.usuario.rol) || typeof s.token !== 'string' || !s.token || !Number.isFinite(s.expira) || s.expira <= Date.now()) return null;
    return { usuario: s.usuario, token: s.token };
  } catch { return null; }
}
export async function eliminarSesionLocal() { await SecureStore.deleteItemAsync(CLAVE); }
