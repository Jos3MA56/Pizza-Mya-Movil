import React, { useState } from 'react';
import { Button, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PedidoResumenScreen } from './src/views/screens/PedidoResumenScreen';
import { ConexionBackendScreen } from './src/views/screens/ConexionBackendScreen';

/** Navegación temporal para mostrar las dos demostraciones sin librerías nuevas. */
export default function App() {
  const [mostrarConexion, setMostrarConexion] = useState(false);
  return (
    <>
      <View style={{ paddingTop: 42, paddingHorizontal: 24, backgroundColor: '#fff' }}>
        <Button
          title={mostrarConexion ? 'Volver a patrones' : 'Probar conexión con API'}
          onPress={() => setMostrarConexion((valor) => !valor)}
        />
      </View>
      {mostrarConexion ? <ConexionBackendScreen /> : <PedidoResumenScreen />}
      <StatusBar style="auto" />
    </>
  );
}
