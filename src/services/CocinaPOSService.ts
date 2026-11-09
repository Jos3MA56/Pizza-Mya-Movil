import { exigirActorLocal } from './SesionLocal';
import { obtenerConfiguracionPOS } from './sync/PosLanConfig';
import { solicitudPOS } from './sync/PosLanClient';
export type EstadoCocinaPOS = 'pendiente'|'en_preparacion'|'listo';
export type EstacionCocina = 'pizzas'|'complementos';
export interface LineaCocina {estadoCocina?:EstadoCocinaPOS;versionCocina?:number;ordenCocina?:number;recibidaEn?:string;preparacionEn?:string|null;entregadaEn?:string|null;orillaNombre?:string;lineaId:string;nombre:string;tamanio:string;categoriaId:string;cantidad:number;observaciones:string;estacion:EstacionCocina|null}
export interface TicketPOS {tipoPedido?:string;nombreCliente?:string;id:string;folio:string;mesa:number;meseroId:string;fecha:string;observaciones:string;cocinaEstado:EstadoCocinaPOS;cocinaVersion:number;productos:LineaCocina[];estaciones:{estacion:EstacionCocina;estado:EstadoCocinaPOS;version:number}[]}
async function config(){
 exigirActorLocal('cocina');const c=await obtenerConfiguracionPOS();
 if(!c)throw new Error('Configura la conexion LAN con el boton Conexion POS.');return c;
}
export async function obtenerCocinaPOS(){
 const c=await config();const [r,catalogo]=await Promise.all([solicitudPOS(c.urlBase,c.token,'/cocina'),solicitudPOS(c.urlBase,c.token,'/catalogo/v2')]);
 if(!r?.data?.lineasIndependientes)throw new Error('Reinicia el servidor POS actualizado para habilitar la cocina por renglones.');
 if(!r?.data?.estacionesIndependientes)throw new Error('Reinicia el servidor POS para habilitar las hojas de pizzas y complementos.');
 const tickets=r.data.tickets;
 if(Array.isArray(tickets)&&tickets.some((t:any)=>!Array.isArray(t.productos)||t.productos.some((p:any)=>p.estacion&&(!['pendiente','en_preparacion','listo'].includes(p.estadoCocina)||!Number.isSafeInteger(p.versionCocina)||p.versionCocina<1||!Number.isSafeInteger(p.ordenCocina)||p.ordenCocina<1))))throw new Error('Respuesta de renglones de cocina inválida.');
 if(!Array.isArray(tickets)||!Array.isArray(catalogo?.data?.catalogo?.categorias)||tickets.some((t:any)=>!Array.isArray(t.estaciones)||!Array.isArray(t.productos)||!Number.isInteger(t.mesa)||typeof t.folio!=='string'||!Number.isFinite(Date.parse(t.fecha))))throw new Error('Respuesta de cocina invalida.');
 return {tickets:tickets as TicketPOS[],categorias:catalogo.data.catalogo.categorias as {id:string;nombre:string}[]};
}
export async function avanzarCocinaPOS(ticket:TicketPOS,estacion?:EstacionCocina){
 const c=await config();
 const destino=estacion??(ticket.estaciones.length===1?ticket.estaciones[0].estacion:undefined);
 const parte=ticket.estaciones.find(e=>e.estacion===destino);
 if(!parte)throw new Error('Selecciona la hoja de pizzas o complementos.');
 const estado=parte.estado==='pendiente'?'en_preparacion':parte.estado==='en_preparacion'?'listo':null;
 if(!estado)throw new Error('Esta parte del pedido ya esta lista.');
 await solicitudPOS(c.urlBase,c.token,`/cocina/${encodeURIComponent(ticket.id)}`,{method:'PATCH',body:JSON.stringify({estacion:destino,estado,version:parte.version})});
}
export function ticketsPorEstacion(tickets:TicketPOS[],estacion:EstacionCocina){
 return tickets.flatMap(t=>{
  const parte=t.estaciones.find(e=>e.estacion===estacion);
  const productos=t.productos.filter(p=>p.estacion===estacion);
  return parte&&productos.length?[{...t,productos,estadoEstacion:parte.estado,versionEstacion:parte.version}]:[];
 });
}
export type TicketEstacion=ReturnType<typeof ticketsPorEstacion>[number];

export interface RenglonCocina {clave:string;ticket:TicketPOS;producto:LineaCocina;estado:EstadoCocinaPOS;version:number;orden:number}
export function renglonesPorEstacion(tickets:TicketPOS[],estacion:EstacionCocina):RenglonCocina[]{
 return tickets.flatMap(ticket=>ticket.productos.filter(p=>p.estacion===estacion).map(producto=>({
  clave:JSON.stringify([ticket.id,producto.lineaId]),ticket,producto,
  estado:producto.estadoCocina??ticket.estaciones.find(e=>e.estacion===estacion)!.estado,
  version:producto.versionCocina??1,orden:producto.ordenCocina??0,
 }))).sort((a,b)=>a.orden-b.orden||Date.parse(a.ticket.fecha)-Date.parse(b.ticket.fecha)||a.ticket.folio.localeCompare(b.ticket.folio)||a.producto.lineaId.localeCompare(b.producto.lineaId));
}
export function colasCocina(tickets:TicketPOS[],estacion:EstacionCocina){
 const lineas=renglonesPorEstacion(tickets,estacion),pendientes=lineas.filter(l=>l.estado==='pendiente');
 return {renglones:lineas,entrada:pendientes.slice(0,10),enEspera:Math.max(0,pendientes.length-10),preparacion:lineas.filter(l=>l.estado==='en_preparacion'),entregados:lineas.filter(l=>l.estado==='listo').sort((a,b)=>Date.parse(b.producto.entregadaEn??b.ticket.fecha)-Date.parse(a.producto.entregadaEn??a.ticket.fecha)||b.orden-a.orden)};
}
export async function avanzarRenglonCocina(renglon:RenglonCocina){
 const c=await config(),p=renglon.producto;
 if(!p.estacion||!Number.isSafeInteger(p.versionCocina))throw new Error('Actualiza el POS para operar por renglones.');
 const estado=renglon.estado==='pendiente'?'en_preparacion':renglon.estado==='en_preparacion'?'listo':null;
 if(!estado)throw new Error('Este producto ya fue entregado.');
 await solicitudPOS(c.urlBase,c.token,`/cocina/${encodeURIComponent(renglon.ticket.id)}`,{method:'PATCH',body:JSON.stringify({lineaId:p.lineaId,estacion:p.estacion,estado,version:p.versionCocina})});
}
