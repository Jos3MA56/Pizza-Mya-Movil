import type { Pedido } from '../models/Pedido';
import type { PedidoRepository } from '../repositories/PedidoRepository';
import { exigirActorLocal } from './SesionLocal';

export async function retirarProductoLocal(repo: PedidoRepository, id: string, lineaId: string, revision?: number): Promise<Pedido> {
 const actor = exigirActorLocal('mesero');const pedido = await repo.obtenerPorId(id);
 if (!pedido || pedido.estado !== 'borrador' || pedido.preparada || pedido.compartida) throw new Error('La comanda está bloqueada o requiere confirmar el cambio con el POS.');
 if(revision!==undefined&&pedido.revision!==revision)throw new Error('La comanda cambió. Revisa el producto y vuelve a intentar.');
 const producto = pedido.productos?.find(p => p.id === lineaId);
 if (!producto || producto.publicada || producto.estado !== 'pendiente') throw new Error('Este producto ya no se puede quitar sin una cancelación.');
 const fecha = new Date().toISOString();
 const productos = pedido.productos!.map(p => p.id === lineaId ? {...p, estado: 'cancelado' as const} : p);
 const nuevo: Pedido = {...pedido,productos,total:Math.round(productos.filter(p=>p.estado!=='cancelado').reduce((n,p)=>n+p.subtotal,0)*100)/100,actualizadoEn:fecha,historial:[...(pedido.historial??[]),{id:`quitar-${lineaId}-${fecha}`,fecha,usuarioId:actor.id,accion:'cancelar_producto',descripcion:`Producto retirado antes de enviar: ${producto.nombre}`} ]};
 await repo.guardar(nuevo);return (await repo.obtenerPorId(id))!;
}
