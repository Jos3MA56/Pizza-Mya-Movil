
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

import {
  obtenerBaseDatos,
} from './src/services/storage/database';

import {
  recuperarEnviosInterrumpidos,
  obtenerOperacionesListas,
} from './src/repositories/OperacionPendienteRepository';

export default function App() {
  const [estadoBD, setEstadoBD] = useState<
    'cargando' | 'lista' | 'error'
  >('cargando');

  useEffect(() => {
    let activo = true;

    async function inicializar() {
      try {
        // 1. Inicializar SQLite.
        const db = await obtenerBaseDatos();

        const resultado = await db.getFirstAsync<{
          user_version: number;
        }>('PRAGMA user_version');

        console.log(
          '[SQLite] Base de datos inicializada. Versión:',
          resultado?.user_version
        );

        // 2. Recuperar operaciones interrumpidas.
        // No se reenvían automáticamente.
        const recuperadas =
          await recuperarEnviosInterrumpidos();

        console.log(
          '[SYNC] Envíos interrumpidos recuperados:',
          recuperadas
        );

        // 3. Consultar operaciones reales elegibles.
        // Las operaciones de prueba están excluidas.
        const pendientes =
          await obtenerOperacionesListas();

        console.log(
          '[SYNC] Operaciones reales elegibles:',
          pendientes.length
        );

        // 4. Mostrar la aplicación normal.
        if (activo) {
          setEstadoBD('lista');
        }
      } catch (error) {
        console.error(
          '[APP] Error de inicialización:',
          error
        );

        if (activo) {
          setEstadoBD('error');
        }
      }
    }

    void inicializar();

    return () => {
      activo = false;
    };
  }, []);

  if (estadoBD !== 'lista') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        {estadoBD === 'cargando' ? (
          <ActivityIndicator size="large" />
        ) : (
          <Text>
            No se pudo inicializar la base de datos.
          </Text>
        )}
      </View>
    );
  }

  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
