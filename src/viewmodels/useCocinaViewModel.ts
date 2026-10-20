import {useCallback,useEffect,useRef,useState} from 'react';
import {obtenerCocinaPOS,avanzarCocinaPOS,type TicketPOS,type EstadoCocinaPOS} from '../services/CocinaPOSService';
export function useCocinaViewModel(){
 const [tickets,setTickets]=useState<TicketPOS[]>([]),[categorias,setCategorias]=useState<{id:string;nombre:string}[]>([]);
 const [filtro,setFiltro]=useState<EstadoCocinaPOS>('pendiente'),[categoria,setCategoria]=useState(''),[error,setError]=useState(''),[conectado,setConectado]=useState(false);
 const vivo=useRef(true),ocupado=useRef(false);
 const cargar=useCallback(async()=>{if(ocupado.current)return;ocupado.current=true;try{const r=await obtenerCocinaPOS();if(vivo.current){setTickets(r.tickets);setCategorias(r.categorias);setConectado(true);setError('');}}catch(e){if(vivo.current){setConectado(false);setError(e instanceof Error?e.message:'Error de cocina');}}finally{ocupado.current=false;}},[]);
 useEffect(()=>{vivo.current=true;void cargar();const timer=setInterval(()=>void cargar(),3000);return()=>{vivo.current=false;clearInterval(timer);};},[cargar]);
 const avanzar=async(ticket:TicketPOS)=>{try{await avanzarCocinaPOS(ticket);await cargar();}catch(e){setError(e instanceof Error?e.message:'No se pudo avanzar');}};
 return {tickets:tickets.filter(t=>t.cocinaEstado===filtro&&(!categoria||t.productos.some(p=>p.categoriaId===categoria))),categorias,categoria,setCategoria,filtro,setFiltro,error,conectado,avanzar,cargar};
}
