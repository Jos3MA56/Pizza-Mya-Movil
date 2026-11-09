import {beforeEach,expect,jest,test} from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import {leerEstacionCocina,guardarEstacionCocina} from '../EstacionCocinaDispositivo';
jest.mock('expo-secure-store',()=>({getItemAsync:jest.fn(),setItemAsync:jest.fn()}));
beforeEach(()=>{jest.clearAllMocks();});
test('recupera la estación del almacenamiento del dispositivo y permite configurar solo si no existe',async()=>{
 jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null).mockResolvedValueOnce('complementos');
 expect(await leerEstacionCocina()).toBeNull();await guardarEstacionCocina('complementos');
 expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pizza_mya_estacion_cocina_v1','complementos');expect(await leerEstacionCocina()).toBe('complementos');
});
test('rechaza una estación guardada inválida',async()=>{
 jest.mocked(SecureStore.getItemAsync).mockResolvedValue('otra');await expect(leerEstacionCocina()).rejects.toThrow();
});
