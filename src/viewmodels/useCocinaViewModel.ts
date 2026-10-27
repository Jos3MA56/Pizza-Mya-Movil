import {useCallback,useEffect,useRef,useState} from 'react';
import {obtenerCocinaPOS,avanzarCocinaPOS,ticketsPorEstacion,type TicketPOS,type EstadoCocinaPOS,type EstacionCocina} from '../services/CocinaPOSService';
export function useCocinaViewModel(){
 const [tickets,setTickets]=useState<TicketPOS[]>([]),[categorias,setCategorias]=useState<{id:string;nombre:string}[]>([]);
 const [filtro,setFiltro]=useState<EstadoCocinaPOS>('pendiente'),[estacion,setEstacion]=useState<EstacionCocina>('pizzas');
 const [error,setError]=useState(''),[conectado,setConectado]=useState(false),[cargando,setCargando]=useState(true),[actualizado,setActualizado]=useState<Date|null>(null),[actualizando,setActualizando]=useState<string|null>(null);
 const vivo=useRef(true),ocupado=useRef(false),accion=useRef(false);
 const cargar=useCallback(async()=>{
  if(ocupado.current)return;ocupado.current=true;
  try{const r=await obtenerCocinaPOS();if(vivo.current){setTickets(r.tickets);setCategorias(r.categorias);setConectado(true);setError('');setActualizado(new Date());}}
  catch(e){if(vivo.current){setConectado(false);setError(e instanceof Error?e.message:'Error de cocina');}}
  finally{ocupado.current=false;if(vivo.current)setCargando(false);}
 },[]);
 useEffect(()=>{vivo.current=true;void cargar();const timer=setInterval(()=>void cargar(),3000);return()=>{vivo.current=false;clearInterval(timer);};},[cargar]);
 const avanzar=async(ticket:TicketPOS)=>{
  if(accion.current||!conectado)return;accion.current=true;setActualizando(ticket.id);
  try{await avanzarCocinaPOS(ticket,estacion);await cargar();}
  catch(e){await cargar();if(vivo.current)setError(e instanceof Error?e.message:'No se pudo avanzar');}
  finally{accion.current=false;if(vivo.current)setActualizando(null);}
 };
 const hoja=ticketsPorEstacion(tickets,estacion);
 const contadores={pendiente:hoja.filter(t=>t.estadoEstacion==='pendiente').length,en_preparacion:hoja.filter(t=>t.estadoEstacion==='en_preparacion').length,listo:hoja.filter(t=>t.estadoEstacion==='listo').length};
 const sinAsignar=[...new Set(tickets.flatMap(t=>t.productos.filter(p=>!p.estacion).map(p=>p.categoriaId)))].map(id=>categorias.find(c=>c.id===id)?.nombre??id);
 return {tickets:hoja.filter(t=>t.estadoEstacion===filtro),filtro,setFiltro,estacion,setEstacion,contadores,error,conectado,cargando,actualizado,actualizando,sinAsignar,avanzar,cargar};
}
export type CocinaViewModel=ReturnType<typeof useCocinaViewModel>;
