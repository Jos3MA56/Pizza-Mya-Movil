import {test,expect,beforeEach} from '@jest/globals';
import {retirarProductoLocal} from '../RetirarProducto';
import {InMemoryPedidoRepository} from '../../repositories/InMemoryPedidoRepository';
import {establecerActorLocal} from '../SesionLocal';
import type {Pedido} from '../../models/Pedido';
let pedido:Pedido;
beforeEach(()=>{establecerActorLocal({id:'mesero',nombre:'Prueba',rol:'mesero'});pedido={id:'local',estado:'borrador',mesaId:1,creadoPor:'mesero',revision:1,total:200,productos:[{id:'uno',productoId:'pizza',nombre:'Pizza',categoria:'Pizzas',cantidad:2,precioUnitario:75,subtotal:150,estado:'pendiente'},{id:'dos',productoId:'papas',nombre:'Papas',categoria:'Complementos',cantidad:1,precioUnitario:50,subtotal:50,estado:'pendiente'}]};});
test('retira la línea completa y recalcula el total conservando el historial',async()=>{const repo=new InMemoryPedidoRepository([pedido]);const r=await retirarProductoLocal(repo,pedido.id,'uno',1);expect(r.total).toBe(50);expect(r.productos?.[0].estado).toBe('cancelado');expect(r.historial?.[0].accion).toBe('cancelar_producto');});
test('rechaza preparadas, publicadas y versiones viejas sin descontar',async()=>{
 const repo=new InMemoryPedidoRepository([pedido]);await expect(retirarProductoLocal(repo,pedido.id,'uno',0)).rejects.toThrow(/cambió/);expect((await repo.obtenerPorId(pedido.id))?.total).toBe(200);
 await expect(retirarProductoLocal(new InMemoryPedidoRepository([{...pedido,preparada:true}]),pedido.id,'uno')).rejects.toThrow(/bloqueada/);
 const publicada={...pedido,productos:pedido.productos!.map(p=>({...p,publicada:true}))};await expect(retirarProductoLocal(new InMemoryPedidoRepository([publicada]),pedido.id,'uno')).rejects.toThrow(/cancelación/);
});
