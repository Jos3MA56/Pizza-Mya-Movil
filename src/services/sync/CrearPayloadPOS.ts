import type {Pedido} from '../../models/Pedido';
import type {PayloadPedidoPOS} from './PosLanClient';
export function crearPayloadPOS(pedido:Pedido,requestId:string):PayloadPedidoPOS{
 const activos=(pedido.productos??[]).filter(p=>p.estado!=='cancelado');
 if(!activos.length||activos.some(p=>!p.productoTamanioId||!p.tamanioId))throw new Error('Cada linea necesita una presentacion real del catalogo.');
 if(!pedido.mesaId||!pedido.creadoPor)throw new Error('Mesa y mesero obligatorios.');
 return {versionContrato:2,requestId,comandaLocalId:pedido.id,mesa:pedido.mesaId,meseroId:pedido.creadoPor,observaciones:pedido.observaciones??'',totalLocalCentavos:Math.round(pedido.total*100),productos:activos.map(p=>({lineaId:p.id,productoId:p.productoId,productoTamanioId:p.productoTamanioId!,tamanioId:p.tamanioId!,cantidad:p.cantidad,observaciones:p.observaciones??''}))};
}
