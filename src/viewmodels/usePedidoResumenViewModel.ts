import {guardarNotaProducto} from '../services/GuardarNotaProducto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { retirarProductoLocal } from '../services/RetirarProducto';
import type { EstadoPedido, Pedido } from '../models/Pedido';
import type { PedidoRepository } from '../repositories/PedidoRepository';
import { PedidoRepositorySingleton } from '../services/PedidoRepositorySingleton';

// Reutilizable e inyectable: las pruebas e implementaciones futuras pueden
// proporcionar otro Repository sin modificar la View.
const repositorioPorDefecto = PedidoRepositorySingleton.obtenerInstancia().obtenerRepositorio();

/** ViewModel: suscribe la vista a cambios, prepara datos y ejecuta acciones. */
export function usePedidoResumenViewModel(
  id: string,
  repositorio: PedidoRepository = repositorioPorDefecto,
) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorAccion,setErrorAccion]=useState<string|null>(null);
  const [retirando,setRetirando]=useState<string|null>(null);
  const [guardandoNota,setGuardandoNota]=useState<string|null>(null);
  const accionEnCurso=useRef(false);

  useEffect(() => {
    let activo = true;
    setPedido(null);
    setCargando(true);
    setError(null);

    // Observer: los cambios notificados por el Repository llegan a esta vista.
    const desuscribir = repositorio.suscribir(id, (actualizado) => {
      if (!activo) return;
      setPedido(actualizado);
      setCargando(false);
    });

    void repositorio.obtenerPorId(id)
      .then((actual) => {
        if (!activo) return;
        // No sobrescribir una notificación más reciente recibida durante la carga.
        setPedido((anterior) => anterior ?? actual);
      })
      .catch((causa: unknown) => {
        if (!activo) return;
        setError(causa instanceof Error ? causa.message : 'Error al leer el pedido');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    const timer = setInterval(() => {
      void repositorio.obtenerPorId(id).then(p => { if (activo) setPedido(p); }).catch(() => undefined);
    }, 2000);
    return () => {
      clearInterval(timer);
      activo = false;
      desuscribir();
    };
  }, [id, repositorio]);

  const retirarProducto=useCallback(async(lineaId:string,motivo?:string,revision?:number)=>{
    if(accionEnCurso.current)return false;accionEnCurso.current=true;setRetirando(lineaId);setErrorAccion(null);
    try {const actual=repositorio.retirarProducto?await repositorio.retirarProducto(id,lineaId,motivo,revision):await retirarProductoLocal(repositorio,id,lineaId,revision);setPedido(actual);return true;}
    catch(e){setErrorAccion(e instanceof Error?e.message:'No se pudo retirar el producto.');return false;}
    finally{accionEnCurso.current=false;setRetirando(null);}
  },[id,repositorio]);
  const guardarNota=useCallback(async(lineaId:string,nota:string,revision?:number)=>{
    if(accionEnCurso.current)throw new Error('Espera a que termine el cambio actual.');
    accionEnCurso.current=true;setGuardandoNota(lineaId);
    try{const actualizado=await guardarNotaProducto(repositorio,id,lineaId,nota,revision);setPedido(actualizado);return actualizado;}
    finally{accionEnCurso.current=false;setGuardandoNota(null);}
  },[id,repositorio]);
  const marcarEstado = useCallback(async (estado: EstadoPedido) => {
    if (!pedido) {
      setError('No se encontró el pedido');
      return;
    }
    setError(null);
    try {
      await repositorio.guardar({ ...pedido, estado });
    } catch (causa: unknown) {
      setError(causa instanceof Error ? causa.message : 'No se pudo actualizar el pedido');
    }
  }, [pedido, repositorio]);

  const presentacion = useMemo(() => ({
    titulo: pedido ? `Pedido ${pedido.folio ?? pedido.id}` : `Pedido ${id}`,
    estado: pedido?.estado ?? 'sin datos',
    totalFormateado: pedido ? `$${pedido.total.toFixed(2)}` : '—',
  }), [id, pedido]);

  return { pedido, cargando, error, guardarNota,guardandoNota, errorAccion,retirando,retirarProducto,limpiarErrorAccion:()=>setErrorAccion(null), ...presentacion, marcarEstado };
}
