import React from 'react';
import { ScrollView, Text, Pressable, View } from 'react-native';
import { useSeguimientoViewModel } from '../../viewmodels/useSeguimientoViewModel';
export function SeguimientoScreen({ pedidoId, onRegresar }: { pedidoId: string; onRegresar: () => void }) {
  const vm = useSeguimientoViewModel(pedidoId);
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16, backgroundColor: '#FFF8F3' }}>
    <Pressable accessibilityRole="button" onPress={onRegresar}><Text>← Volver a comanda</Text></Pressable>
    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Seguimiento de sincronización</Text>
    <Text>Negocio: borrador local. Sincronización y cocina se muestran por separado.</Text>
    {!!vm.error && <Text accessibilityRole="alert">{vm.error}</Text>}
    <Pressable accessibilityRole="button" disabled={vm.ocupado} onPress={vm.preparar}><Text>Preparar / enviar al POS</Text></Pressable>
    {vm.operaciones.length === 0 && <Text>Sin operación preparada.</Text>}
    {vm.operaciones.map(o => <View key={o.id_operacion} style={{ padding: 16, backgroundColor: 'white', gap: 8 }}>
      <Text>{o.estado === 'BLOQUEADA' ? 'No compatible con el contrato POS actual' : o.estado.replace(/_/g, ' ')}</Text>
      <Text>{o.ultimo_error}</Text><Text>RequestId: {o.id_operacion}</Text>
      <Text>Intentos: {o.intentos} · ID remoto: {o.id_servidor ?? 'Sin confirmación'}</Text>
      {o.folio_confirmado && <Text>Folio POS: {o.folio_confirmado} · Total confirmado: ${((o.total_confirmado_centavos ?? 0) / 100).toFixed(2)}</Text>}
      {o.total_confirmado_centavos != null && o.total_local_centavos != null && o.total_confirmado_centavos !== o.total_local_centavos && <Text>Discrepancia: total local ${(o.total_local_centavos / 100).toFixed(2)}. Requiere revisión; se conservan ambos importes.</Text>}
      <Text>Cocina operativa: recepción no verificada.</Text>
      {['PENDIENTE','ERROR_REINTENTABLE','RESULTADO_DESCONOCIDO'].includes(o.estado) && <Pressable accessibilityRole="button" disabled={vm.ocupado} onPress={() => void vm.reintentar(o.id_operacion)}><Text>{o.estado === 'RESULTADO_DESCONOCIDO' ? 'Conciliar antes de reenviar' : 'Reintentar envío'}</Text></Pressable>}
    </View>)}
    <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Demostración local</Text>
    <Text>Transporte simulado en este dispositivo. No confirma recepción del POS ni comunica dispositivos. La copia de demostración queda aislada del borrador operativo.</Text>
    <Pressable accessibilityRole="button" disabled={vm.ocupado} onPress={vm.crearDemo}><Text>Crear copia de demostración</Text></Pressable>
    {vm.demos.map(d => <View key={d.id} style={{ padding: 16, backgroundColor: 'white', gap: 12 }}>
      <Text>Demostración local · {d.estado.replace(/_/g, ' ')}</Text><Text>RequestId estable: {d.id}</Text>
      <Text>Intentos: {d.intentos} · Cocina demo: {vm.cocina[d.id]}</Text>
      {d.remoto && <Text>Recibo simulado: {d.remoto}</Text>}
      {['PENDIENTE','ERROR_REINTENTABLE'].includes(d.estado) && <>
        <Text>Espera mínima tras fallo de red: 5 s. Máximo 6 intentos.</Text>
        {([['confirmar','Enviar y confirmar'],['red','Simular error de red'],['timeout','Simular timeout'],['rechazar','Simular rechazo'],['conflicto','Simular conflicto'],['perder_respuesta','Simular confirmación perdida']] as const).map(([escenario, label]) => <Pressable key={escenario} accessibilityRole="button" disabled={vm.ocupado} onPress={() => void vm.simular(d.id, escenario)}><Text>{label}</Text></Pressable>)}
      </>}
      {['RESULTADO_DESCONOCIDO','ENVIANDO'].includes(d.estado) && <Pressable accessibilityRole="button" disabled={vm.ocupado} onPress={() => void vm.simular(d.id, 'confirmar')}><Text>Conciliar con transporte simulado</Text></Pressable>}
    </View>)}
  </ScrollView>;
}
