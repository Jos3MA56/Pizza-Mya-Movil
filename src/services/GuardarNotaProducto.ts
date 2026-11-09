import type {PedidoRepository} from '../repositories/PedidoRepository';
import {exigirActorLocal} from './SesionLocal';
export async function guardarNotaProducto(repo:PedidoRepository,id:string,lineaId:string,nota:string,revision?:number){
 const actor=exigirActorLocal('mesero');
 if(typeof nota!=='string'||nota.length>1000)throw new Error('La nota admite hasta 1000 caracteres.');
 const pedido=await repo.obtenerPorId(id);
 if(!pedido||pedido.estado!=='borrador'||pedido.preparada||pedido.sinConexion)throw new Error('Conecta con el POS y verifica que la comanda permita cambios.');
 if(revision!==undefined&&pedido.revision!==revision)throw new Error('La comanda cambió mientras escribías. Revisa el producto y vuelve a intentar.');
 const producto=pedido.productos?.find(p=>p.id===lineaId);
 if(!producto||producto.publicada||producto.estado!=='pendiente')throw new Error('La nota solo se puede editar antes de enviar el producto a cocina.');
 const fecha=new Date().toISOString();
 await repo.guardar({...pedido,productos:pedido.productos!.map(p=>p.id===lineaId?{...p,observaciones:nota.trim()}:p),actualizadoEn:fecha,historial:[...(pedido.historial??[]),{id:'nota-'+lineaId+'-'+fecha,fecha,usuarioId:actor.id,accion:'editar_producto',descripcion:'Nota actualizada: '+producto.nombre}]});
 const actualizado=await repo.obtenerPorId(id);if(!actualizado)throw new Error('No se pudo consultar la nota guardada.');return actualizado;
}
