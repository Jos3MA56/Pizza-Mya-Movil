import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useCocinaViewModel } from '../../viewmodels/useCocinaViewModel';
export function CocinaHomeScreen() {
  const { cerrarSesion } = useAuth();
  const vm = useCocinaViewModel();
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 18, backgroundColor: '#FFF8F3' }}>
    <Text style={{ fontSize: 26, fontWeight: 'bold' }}>Tablero de cocina</Text>
    <Text style={{ color: '#991F19', fontWeight: 'bold' }}>Demostración local</Text>
    <Text>Datos aislados de este dispositivo. Solo se publican copias confirmadas por el transporte simulado. No existe recepción de cocina POS verificada.</Text>
    <View style={{ flexDirection: 'row', gap: 12 }}>{(['pendiente','en_preparacion','listo'] as const).map(e => <Pressable key={e} accessibilityRole="button" accessibilityState={{ selected: vm.filtro === e }} onPress={() => vm.setFiltro(e)}><Text>{e.replace(/_/g, ' ')}</Text></Pressable>)}</View>
    {!!vm.error && <Text accessibilityRole="alert">{vm.error}</Text>}
    {!vm.tickets.length && <Text>Sin comandas en este estado. Crea una copia desde Seguimiento con una cuenta de mesero y confirma el envío simulado.</Text>}
    {vm.tickets.map(t => <View key={t.id} style={{ padding: 18, backgroundColor: 'white', gap: 8 }}>
      <Text style={{ fontWeight: 'bold' }}>Mesa {t.pedido.mesaId} · DEMO-{t.id.slice(0,8)}</Text>
      <Text>{t.pedido.creadoEn ? new Date(t.pedido.creadoEn).toLocaleString() : ''}</Text>
      <Text>Referencia: {t.id}</Text>
      {t.pedido.productos?.filter(p => p.estado !== 'cancelado').map(p => <Text key={p.id}>{p.cantidad} x {p.nombre} · {p.tamanio} {p.observaciones ? `· ${p.observaciones}` : ''}</Text>)}
      <Text>Observaciones: {t.pedido.observaciones || 'Sin observaciones'}</Text>
      <Text>Estado: {t.estado.replace(/_/g, ' ')}</Text>
      {t.estado !== 'listo' && <Pressable accessibilityRole="button" onPress={() => void vm.avanzar(t.id,t.estado)}><Text>{t.estado === 'pendiente' ? 'Iniciar preparación' : 'Marcar lista'}</Text></Pressable>}
    </View>)}
    <Pressable accessibilityRole="button" onPress={cerrarSesion}><Text>Cerrar sesión</Text></Pressable>
  </ScrollView>;
}
