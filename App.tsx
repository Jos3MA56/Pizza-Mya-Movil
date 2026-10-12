
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

import React, { useState } from 'react';
import { Button, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PedidoResumenScreen } from './src/views/screens/PedidoResumenScreen';
import { ConexionBackendScreen } from './src/views/screens/ConexionBackendScreen';


/** Navegación temporal para mostrar las dos demostraciones sin librerías nuevas. */
export default function App() {
  const [mostrarConexion, setMostrarConexion] = useState(false);
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
