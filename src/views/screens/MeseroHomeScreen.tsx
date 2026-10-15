import React, { useEffect } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  AppState,
} from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { recuperarConfirmacionesPOS } from '../../services/sync/RecuperacionPOSService';
import { procesadorAutomaticoPOS } from '../../services/sync/ProcesadorAutomaticoPOS';


import {
  usePosLanConfigViewModel,
} from '../../viewmodels/usePosLanConfigViewModel';

export function MeseroHomeScreen() {
  const { usuario, cerrarSesion } = useAuth();

  const {
    urlBase,
    setUrlBase,
    token,
    setToken,
    configurada,
    procesando,
    mensaje,
    guardarYVerificar,
    comprobarConexion,
    desvincularPOS,
  } = usePosLanConfigViewModel();

  useEffect(() => {
      if (!usuario?.id || usuario.rol !== 'mesero') {
        return;
      }

      // Activación controlada para pruebas.
      // En producción permanece deshabilitada.
      const habilitada =
        __DEV__ &&
        process.env.EXPO_PUBLIC_POS_SYNC_DEMO === 'true';

      if (!habilitada) {
        console.log(
          '[SYNC AUTO] Envío automático desactivado.'
        );
        return;
      }

      const meseroId = String(usuario.id);

      const iniciar = () => {
        try {
          procesadorAutomaticoPOS.iniciar(meseroId);
        } catch (error) {
          console.warn(
            '[SYNC AUTO] No se pudo iniciar:',
            error instanceof Error
              ? error.message
              : String(error)
          );
        }
      };

      if (AppState.currentState === 'active') {
        iniciar();
      }

      const suscripcion = AppState.addEventListener(
        'change',
        (estado) => {
          if (estado === 'active') {
            iniciar();
          } else {
            procesadorAutomaticoPOS.detener();
          }
        }
      );

      return () => {
        suscripcion.remove();
        procesadorAutomaticoPOS.detener();
      };
    }, [usuario?.id, usuario?.rol]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pizza Mya</Text>
      <Text style={styles.subtitle}>Panel del mesero</Text>

      <Text style={styles.welcome}>
        Bienvenido, {usuario?.nombre}
      </Text>

      <Text style={styles.info}>
        Desde aquí podrás gestionar mesas y pedidos.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Conexión con POS Electron
        </Text>

        <Text style={styles.info}>
          {mensaje}
        </Text>

        {!configurada ? (
          <>
            <Text style={styles.label}>
              Dirección del POS
            </Text>

            <TextInput
              style={styles.input}
              value={urlBase}
              onChangeText={setUrlBase}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.78:3101"
            />

            <Text style={styles.label}>
              Token LAN de pruebas
            </Text>

            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Token de 64 caracteres"
            />

            <Pressable
              style={[
                styles.button,
                procesando && styles.disabled,
              ]}
              disabled={procesando}
              onPress={() => void guardarYVerificar()}
            >
              <Text style={styles.buttonText}>
                Verificar y guardar conexión
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>
              POS configurado: {urlBase}
            </Text>

            <Pressable
              style={[
                styles.button,
                procesando && styles.disabled,
              ]}
              disabled={procesando}
              onPress={() => void comprobarConexion()}
            >
              <Text style={styles.buttonText}>
                Comprobar conexión
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              disabled={procesando}
              onPress={() => void desvincularPOS()}
            >
              <Text style={styles.secondaryText}>
                Desvincular dispositivo
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={() => {
        procesadorAutomaticoPOS.detener();
        cerrarSesion();
}}
      >

        <Text style={styles.buttonText}>
          Cerrar sesión
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#C62828',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  welcome: {
    fontSize: 18,
    marginTop: 32,
    fontWeight: '500',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    lineHeight: 20,
  },
  card: {
    marginTop: 24,
    padding: 18,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  input: {
    marginTop: 8,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 12,
    color: '#222',
  },
  button: {
    backgroundColor: '#C62828',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#C62828',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#444',
    padding: 15,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
