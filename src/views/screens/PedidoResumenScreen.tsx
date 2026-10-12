import React from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { usePedidoResumenViewModel } from '../../viewmodels/usePedidoResumenViewModel';

const ID_DEMO = 'DEMO-001';

/** Segundo observador: se actualiza sin recibir props del primer panel. */
function MonitorDePedido() {
  const vm = usePedidoResumenViewModel(ID_DEMO);
  return (
    <View style={styles.monitor}>
      <Text style={styles.subtitulo}>Monitor independiente (simulación)</Text>
      <Text testID="monitor-estado">Estado observado: {vm.estado}</Text>
    </View>
  );
}

/**
 * Demostración de Repository + Observer + Singleton.
 * No envía comandas a cocina, POS o backend; no cancela pedidos reales.
 */
export function PedidoResumenScreen() {
  const vm = usePedidoResumenViewModel(ID_DEMO);

  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Patrones de diseño · Pizza Mya</Text>
        <Text style={styles.subtitulo}>{vm.titulo}</Text>
        <Text testID="pedido-estado">Estado: {vm.estado}</Text>
        <Text>Total: {vm.totalFormateado}</Text>
        {vm.cargando && <Text>Cargando demostración…</Text>}
        {vm.error && <Text style={styles.error}>{vm.error}</Text>}
        <View style={styles.boton}>
          <Button
            title="Marcar como enviado (demo)"
            disabled={vm.cargando || !vm.pedido || vm.pedido.estado === 'enviado'}
            onPress={() => { void vm.marcarEstado('enviado'); }}
          />
        </View>
        <View style={styles.boton}>
          <Button
            title="Reiniciar demostración"
            disabled={vm.cargando || !vm.pedido || vm.pedido.estado === 'borrador'}
            onPress={() => { void vm.marcarEstado('borrador'); }}
          />
        </View>
        <MonitorDePedido />
        <Text style={styles.nota}>
          Cambios solo en memoria. La integración real con el backend se realizará en otra actividad.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#fff' },
  contenedor: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  titulo: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitulo: { fontSize: 17, fontWeight: '600' },
  boton: { marginTop: 8 },
  monitor: { padding: 12, borderWidth: 1, borderColor: '#bbb', borderRadius: 8, marginTop: 16, gap: 6 },
  error: { color: '#b00020' },
  nota: { fontSize: 12, color: '#555', marginTop: 12 },
});
