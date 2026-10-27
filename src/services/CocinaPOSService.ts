import { exigirActorLocal } from './SesionLocal';
import { obtenerConfiguracionPOS } from './sync/PosLanConfig';
import { solicitudPOS } from './sync/PosLanClient';
export type EstadoCocinaPOS = 'pendiente'|'en_preparacion'|'listo';
export type EstacionCocina = 'pizzas'|'complementos';
export interface LineaCocina {lineaId:string;nombre:string;tamanio:string;categoriaId:string;cantidad:number;observaciones:string;estacion:EstacionCocina|null}
export interface TicketPOS {id:string;folio:string;mesa:number;meseroId:string;fecha:string;observaciones:string;cocinaEstado:EstadoCocinaPOS;cocinaVersion:number;productos:LineaCocina[];estaciones:{estacion:EstacionCocina;estado:EstadoCocinaPOS;version:number}[]}
async function config(){
 exigirActorLocal('cocina');const c=await obtenerConfiguracionPOS();
 if(!c)throw new Error('Configura la conexion LAN con el boton Conexion POS.');return c;
}
export async function obtenerCocinaPOS(){
 const c=await config();const [r,catalogo]=await Promise.all([solicitudPOS(c.urlBase,c.token,'/cocina'),solicitudPOS(c.urlBase,c.token,'/catalogo/v2')]);
 if(!r?.data?.estacionesIndependientes)throw new Error('Reinicia el servidor POS para habilitar las hojas de pizzas y complementos.');
 const tickets=r.data.tickets;
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
