import * as SecureStore from 'expo-secure-store';
import type {EstacionCocina} from './CocinaPOSService';
const CLAVE='pizza_mya_estacion_cocina_v1';
export async function leerEstacionCocina():Promise<EstacionCocina|null>{
 const valor=await SecureStore.getItemAsync(CLAVE);
 if(valor===null)return null;
 if(valor!=='pizzas'&&valor!=='complementos')throw new Error('No se pudo leer la estación guardada de este dispositivo.');
 return valor;
}
export async function guardarEstacionCocina(estacion:EstacionCocina){
 if(estacion!=='pizzas'&&estacion!=='complementos')throw new Error('Estación de cocina inválida.');
 await SecureStore.setItemAsync(CLAVE,estacion);
}
