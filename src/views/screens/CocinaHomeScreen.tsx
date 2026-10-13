
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export function CocinaHomeScreen() {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pizza Mya</Text>
      <Text style={styles.subtitle}>Panel de cocina</Text>

      <Text style={styles.welcome}>
        Bienvenido, {usuario?.nombre}
      </Text>

      <Text style={styles.info}>
        Aquí se mostrarán las comandas pendientes.
      </Text>

      <Pressable style={styles.button} onPress={cerrarSesion}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
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
  },
  info: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
  button: {
    backgroundColor: '#C62828',
    padding: 15,
    borderRadius: 8,
    marginTop: 32,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
