import {useCallback,useEffect,useRef,useState} from 'react';
import {obtenerCocinaPOS,avanzarRenglonCocina,colasCocina,type TicketPOS,type EstacionCocina,type RenglonCocina} from '../services/CocinaPOSService';
export function useCocinaViewModel(estacion:EstacionCocina='pizzas'){
 const [tickets,setTickets]=useState<TicketPOS[]>([]);
 const [error,setError]=useState(''),[conectado,setConectado]=useState(false),[cargando,setCargando]=useState(true),[actualizado,setActualizado]=useState<Date|null>(null),[actualizando,setActualizando]=useState<string|null>(null);
 const vivo=useRef(true),pendiente=useRef<Promise<void>|null>(null),accion=useRef(false);
 const cargar=useCallback(async(forzar=false)=>{
  if(accion.current&&!forzar)return;
  if(pendiente.current){await pendiente.current;if(!forzar)return;}
  const consulta=(async()=>{
   try{const r=await obtenerCocinaPOS();if(vivo.current){setTickets(r.tickets);setConectado(true);setError('');setActualizado(new Date());}}
   catch(e){if(vivo.current){setConectado(false);setError(e instanceof Error?e.message:'Error de cocina');}}
   finally{if(vivo.current)setCargando(false);}
  })();
  pendiente.current=consulta;try{await consulta;}finally{if(pendiente.current===consulta)pendiente.current=null;}
 },[]);
 useEffect(()=>{vivo.current=true;void cargar();const timer=setInterval(()=>void cargar(),3000);return()=>{vivo.current=false;clearInterval(timer);};},[cargar]);
 const avanzar=async(renglon:RenglonCocina)=>{
  if(accion.current||!conectado)return;accion.current=true;setActualizando(renglon.clave);
  try{await avanzarRenglonCocina(renglon);await cargar(true);}
  catch(e){await cargar(true);if(vivo.current)setError(e instanceof Error?e.message:'No se pudo actualizar el renglón');}
  finally{accion.current=false;if(vivo.current)setActualizando(null);}
 };
 return {...colasCocina(tickets,estacion),estacion,error,conectado,cargando,actualizado,actualizando,avanzar,cargar};
}
export type CocinaViewModel=ReturnType<typeof useCocinaViewModel>;
