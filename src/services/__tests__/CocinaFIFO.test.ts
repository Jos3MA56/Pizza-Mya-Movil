import {expect,test} from '@jest/globals';
import {colasCocina,type TicketPOS} from '../CocinaPOSService';
const ticket=(i:number):TicketPOS=>({id:'p'+i,folio:'MYA-'+i,mesa:1,meseroId:'mesero',fecha:'2026-10-27T12:00:00Z',observaciones:'',cocinaEstado:'pendiente',cocinaVersion:1,estaciones:[{estacion:'pizzas',estado:'pendiente',version:1}],productos:[{lineaId:'l'+i,nombre:'Pizza '+i,cantidad:2,tamanio:'Mediana',categoriaId:'pizzas',observaciones:'Sin cortar',estacion:'pizzas',estadoCocina:'pendiente',versionCocina:1,ordenCocina:i}]});
test('Entrada limita a diez renglones por recepción y muestra el siguiente al avanzar',()=>{
 const tickets=Array.from({length:12},(_,i)=>ticket(i+1)).reverse();
 const cola=colasCocina(tickets,'pizzas');expect(cola.entrada.map(r=>r.orden)).toEqual([1,2,3,4,5,6,7,8,9,10]);expect(cola.enEspera).toBe(2);
 tickets.find(t=>t.id==='p1')!.productos[0].estadoCocina='en_preparacion';
 const nueva=colasCocina(tickets,'pizzas');expect(nueva.entrada.map(r=>r.orden)).toEqual([2,3,4,5,6,7,8,9,10,11]);expect(nueva.preparacion[0].orden).toBe(1);expect(nueva.enEspera).toBe(1);
 expect(nueva.preparacion[0].producto.cantidad).toBe(2);
});
test('separa estaciones y conserva entregados aunque la comanda siga pendiente',()=>{
 const t=ticket(1);t.productos[0].estadoCocina='listo';t.productos[0].entregadaEn='2026-10-27T13:00:00Z';
 t.productos.push({...t.productos[0],lineaId:'otra',ordenCocina:2,estadoCocina:'pendiente'});
 const cola=colasCocina([t],'pizzas');expect(cola.entrada).toHaveLength(1);expect(cola.preparacion).toHaveLength(0);expect(cola.entregados[0].producto.lineaId).toBe('l1');
 expect(colasCocina([t],'complementos').entrada).toHaveLength(0);
});
