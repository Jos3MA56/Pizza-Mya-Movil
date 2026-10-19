import { useCallback, useEffect, useState } from 'react';
import { demoCocinaService, type EstadoCocinaDemo } from '../services/DemoCocinaService';
export function useCocinaViewModel() {
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof demoCocinaService.cocina>>>([]);
  const [filtro, setFiltro] = useState<EstadoCocinaDemo>('pendiente');
  const [error, setError] = useState('');
  const cargar = useCallback(async () => {
    try { setTickets(await demoCocinaService.cocina()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error de cocina'); }
  }, []);
  useEffect(() => { void cargar(); const timer = setInterval(() => void cargar(), 3000); return () => clearInterval(timer); }, [cargar]);
  const avanzar = async (id: string, estado: EstadoCocinaDemo) => {
    try { await demoCocinaService.avanzar(id, estado); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo avanzar'); }
  };
  return { tickets: tickets.filter(t => t.estado === filtro), filtro, setFiltro, error, avanzar, cargar };
}
