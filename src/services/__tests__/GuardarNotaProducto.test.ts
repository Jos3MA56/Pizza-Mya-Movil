import {beforeEach,expect,test} from '@jest/globals';
import {guardarNotaProducto} from '../GuardarNotaProducto';
import {establecerActorLocal} from '../SesionLocal';
import {InMemoryPedidoRepository} from '../../repositories/InMemoryPedidoRepository';
import type {Pedido} from '../../models/Pedido';
let pedido:Pedido;
beforeEach(()=>{establecerActorLocal({id:'mesero',nombre:'Mesero',rol:'mesero'});pedido={id:'nota',estado:'borrador',revision:2,mesaId:1,creadoPor:'mesero',total:200,productos:[{id:'a',productoId:'pizza',nombre:'Hawaiana',categoria:'Pizzas',cantidad:1,precioUnitario:150,subtotal:150,estado:'pendiente'},{id:'b',productoId:'papas',nombre:'Papas',categoria:'Complementos',cantidad:1,precioUnitario:50,subtotal:50,estado:'pendiente',observaciones:'Sin sal'}]};});
test('persiste solo la nota seleccionada y conserva los importes y las otras notas',async()=>{
 const repo=new InMemoryPedidoRepository([pedido]);const r=await guardarNotaProducto(repo,'nota','a',' Sin tocino ',2);
 expect(r.productos![0].observaciones).toBe('Sin tocino');expect(r.productos![1].observaciones).toBe('Sin sal');expect(r.total).toBe(200);
 expect((await repo.obtenerPorId('nota'))!.productos![0].subtotal).toBe(150);await guardarNotaProducto(repo,'nota','a','',2);expect((await repo.obtenerPorId('nota'))!.productos![0].observaciones).toBe('');
});
test('rechaza versiones antiguas, notas excesivas y productos enviados o cancelados',async()=>{
 const repo=new InMemoryPedidoRepository([pedido]);await expect(guardarNotaProducto(repo,'nota','a','X',1)).rejects.toThrow(/cambió/);
 await expect(guardarNotaProducto(repo,'nota','a','X'.repeat(1001),2)).rejects.toThrow(/1000/);
 for(const cambios of [{publicada:true},{estado:'cancelado' as const}]){const p={...pedido,productos:[{...pedido.productos![0],...cambios}]};await expect(guardarNotaProducto(new InMemoryPedidoRepository([p]),'nota','a','X',2)).rejects.toThrow(/antes de enviar/);}
 expect((await repo.obtenerPorId('nota'))!.productos![0].observaciones).toBeUndefined();
});
