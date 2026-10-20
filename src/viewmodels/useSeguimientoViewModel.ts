import { useCallback, useEffect, useState } from 'react';
import { listarSeguimiento, prepararYEnviar, cancelarPreparacion, reintentarSeguimiento } from '../services/FlujoComandaService';
import { demoCocinaService, type EscenarioDemo } from '../services/DemoCocinaService';
export function useSeguimientoViewModel(pedidoId: string) {
  const [operaciones, setOperaciones] = useState<Awaited<ReturnType<typeof listarSeguimiento>>>([]);
  const [demos, setDemos] = useState<Awaited<ReturnType<typeof demoCocinaService.listar>>>([]);
  const [cocina, setCocina] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const cargar = useCallback(async () => {
    try {
      const [ops, simulaciones] = await Promise.all([listarSeguimiento(), demoCocinaService.listar()]);
      setOperaciones(ops.filter(o => o.comanda_id === pedidoId));
      setDemos(simulaciones.filter(d => d.origen === pedidoId));
      const estados = await Promise.all(simulaciones.map(async d => [d.id, (await demoCocinaService.estadoCocina(d.id))?.estado ?? 'Sin ticket']));
      setCocina(Object.fromEntries(estados));
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de seguimiento'); }
  }, [pedidoId]);
  useEffect(() => { void cargar(); const timer = setInterval(() => void cargar(), 3000); return () => clearInterval(timer); }, [cargar]);
  const ejecutar = async (accion: () => Promise<unknown>) => {
    if (ocupado) return;
    setOcupado(true); setError('');
    try { await accion(); await cargar(); } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setOcupado(false); }
  };
  return { operaciones, demos, cocina, error, ocupado, cargar,
    preparar: () => ejecutar(() => prepararYEnviar(pedidoId)),
    cancelar: (id:string) => ejecutar(() => cancelarPreparacion(id)),
    reintentar: (id: string) => ejecutar(() => reintentarSeguimiento(id)),
    crearDemo: () => ejecutar(() => demoCocinaService.crear(pedidoId)),
    simular: (id: string, escenario: EscenarioDemo) => ejecutar(() => demoCocinaService.procesar(id, escenario)) };
}
