import { exigirActorLocal } from './SesionLocal';
import { obtenerConfiguracionPOS } from './sync/PosLanConfig';
import { solicitudPOS } from './sync/PosLanClient';
export type EstadoCocinaPOS = 'pendiente'|'en_preparacion'|'listo';
export interface TicketPOS { id:string;folio:string;mesa:number;fecha:string;observaciones:string;cocinaEstado:EstadoCocinaPOS;cocinaVersion:number;productos:{lineaId:string;nombre:string;tamanio:string;categoriaId:string;cantidad:number;observaciones:string}[] }
async function config(){exigirActorLocal('cocina');const c=await obtenerConfiguracionPOS();if(!c)throw new Error('Configura la conexión LAN del POS desde el perfil de mesero antes de abrir cocina.');return c;}
export async function obtenerCocinaPOS(){
 const c=await config();const [r,catalogo]=await Promise.all([solicitudPOS(c.urlBase,c.token,'/cocina'),solicitudPOS(c.urlBase,c.token,'/catalogo/v2')]);
 if(!r||!Array.isArray(r.data.tickets)||!catalogo?.data?.catalogo?.categorias)throw new Error('Respuesta de cocina inválida.');
 return {tickets:r.data.tickets as TicketPOS[],categorias:catalogo.data.catalogo.categorias as {id:string;nombre:string}[]};
}
export async function avanzarCocinaPOS(ticket:TicketPOS){
 const c=await config();const estado=ticket.cocinaEstado==='pendiente'?'en_preparacion':ticket.cocinaEstado==='en_preparacion'?'listo':null;
 if(!estado)throw new Error('El ticket ya est? listo.');
 await solicitudPOS(c.urlBase,c.token,`/cocina/${encodeURIComponent(ticket.id)}`,{method:'PATCH',body:JSON.stringify({estado,version:ticket.cocinaVersion})});
}
