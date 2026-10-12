import React from 'react';
import { ActivityIndicator, Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useConexionBackendViewModel } from '../../viewmodels/useConexionBackendViewModel';

/** Pantalla temporal de diagnóstico; no muestra ni solicita credenciales. */
export function ConexionBackendScreen() {
  const vm = useConexionBackendViewModel();
  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>KAN-03 · Conexión con backend</Text>
        <Text>URL configurada: {vm.baseUrl || '(sin configurar)'}</Text>
        <Text>Ruta de prueba: {vm.ruta}</Text>
        <View style={styles.boton}>
          <Button title="Probar conexión" disabled={vm.estado === 'probando'} onPress={() => { void vm.probarConexion(); }} />
        </View>
        {vm.estado === 'probando' && <ActivityIndicator />}
        <Text testID="conexion-estado" style={vm.estado === 'error' ? styles.error : styles.normal}>
          {vm.mensaje}
        </Text>
        {vm.estado === 'conectado' && <Text testID="conexion-respuesta">Respuesta: {vm.resultado}</Text>}
        <Text style={styles.nota}>
          Esta prueba solo consulta el endpoint configurado. No registra pedidos, no modifica datos y no accede directamente al POS.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#fff' },
  contenedor: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  titulo: { fontSize: 21, fontWeight: '700' },
  boton: { marginVertical: 8 },
  error: { color: '#b00020' },
  normal: { color: '#236532' },
  nota: { color: '#555', fontSize: 12, marginTop: 12 },
});
