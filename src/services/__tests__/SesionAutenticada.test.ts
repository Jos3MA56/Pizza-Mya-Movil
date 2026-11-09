import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import { guardarSesionLocal, recuperarSesionLocal, eliminarSesionLocal } from '../SesionAutenticada';
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(async () => undefined), deleteItemAsync: jest.fn(async () => undefined) }));
const get = jest.mocked(SecureStore.getItemAsync);
const set = jest.mocked(SecureStore.setItemAsync);
describe('Sesión offline en SecureStore', () => {
  beforeEach(() => { jest.clearAllMocks(); get.mockResolvedValue(null); });
  test('no restaura si no existe sesión', async () => { expect(await recuperarSesionLocal()).toBeNull(); });
  test('guarda token y usuario sin contraseña y restaura una sesión vigente', async () => {
    const usuario = { id: 'm', nombre: 'Mesero', rol: 'mesero' as const };
    await guardarSesionLocal(usuario, 'token-prueba');
    const almacenado = set.mock.calls[0][1];
    expect(almacenado).not.toContain('password');
    get.mockResolvedValue(almacenado);
    expect(await recuperarSesionLocal()).toEqual({ usuario, token: 'token-prueba' });
  });
  test('rechaza sesión caducada, corrupta o con rol inválido', async () => {
    for (const dato of ['{', JSON.stringify({ usuario: { id: 'm', nombre: 'M', rol: 'admin' }, token: 't', expira: Date.now()+10000 }), JSON.stringify({ usuario: { id: 'm', nombre: 'M', rol: 'mesero' }, token: 't', expira: 0 })]) {
      get.mockResolvedValue(dato); expect(await recuperarSesionLocal()).toBeNull();
    }
  });
  test('cerrar sesión borra la credencial persistida', async () => {
    await eliminarSesionLocal(); expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('pizza_mya_sesion_offline_v1');
  });
});
