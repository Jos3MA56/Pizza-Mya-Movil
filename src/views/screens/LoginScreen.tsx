
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';

import { Feather } from '@expo/vector-icons';
import { useLoginViewModel } from '../../viewmodels/useLoginViewModel';

export function LoginScreen() {
  const {
    correo,
    setCorreo,
    password,
    setPassword,
    error,
    cargando,
    login,
  } = useLoginViewModel();

  const [mostrarPassword, setMostrarPassword] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado y logo */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Logo de Pizza Mya"
          />

          <Text style={styles.brand}>Pizza Mya</Text>

          <Text
            style={styles.subtitle}
            numberOfLines={2}
          >
            Sistema móvil para empleados
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.label}>
            Correo electrónico
          </Text>

          <View style={styles.inputContainer}>
            <Feather
              name="mail"
              size={18}
              color="#9A9A9A"
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#A0A0A0"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={correo}
              onChangeText={setCorreo}
              editable={!cargando}
              accessibilityLabel="Correo electrónico"
            />
          </View>

          <Text style={styles.label}>
            Contraseña
          </Text>

          <View style={styles.inputContainer}>
            <Feather
              name="lock"
              size={18}
              color="#9A9A9A"
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!mostrarPassword}
              autoCapitalize="none"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              editable={!cargando}
              accessibilityLabel="Contraseña"
            />

            <TouchableOpacity
              onPress={() =>
                setMostrarPassword(!mostrarPassword)
              }
              disabled={cargando}
              accessibilityRole="button"
              accessibilityLabel={
                mostrarPassword
                  ? 'Ocultar contraseña'
                  : 'Mostrar contraseña'
              }
            >
              <Feather
                name={mostrarPassword ? 'eye-off' : 'eye'}
                size={19}
                color="#888888"
              />
            </TouchableOpacity>
          </View>

          {/* Mensaje de error */}
          {error ? (
            <Text
              style={styles.error}
              accessibilityRole="alert"
            >
              {error}
            </Text>
          ) : null}

          {/* Botón de inicio de sesión */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              cargando && styles.disabledButton,
            ]}
            onPress={login}
            disabled={cargando}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>
                Iniciar sesión
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F1',
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 65,
    paddingBottom: 28,
  },

  header: {
    alignItems: 'center',
    marginBottom: 42,
    width: '100%',
  },

  logo: {
    width: 82,
    height: 82,
    marginBottom: 8,
  },

  brand: {
    fontSize: 27,
    fontWeight: '800',
    color: '#B91C1C',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 26,
    width: '100%',
    flexShrink: 1,
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 9,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DED7',
    borderRadius: 13,
    paddingHorizontal: 13,
    height: 53,
    marginBottom: 20,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    height: '100%',
  },

  error: {
    color: '#C62828',
    fontSize: 13,
    marginBottom: 14,
  },

  loginButton: {
    backgroundColor: '#FF7000',
    borderRadius: 13,
    height: 53,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    elevation: 3,
    shadowColor: '#FF7000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  disabledButton: {
    opacity: 0.65,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  statusContainer: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9F5E9',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 'auto',
  },

  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: '#29994B',
    borderRadius: 4,
    marginRight: 8,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#267B42',
  },
});
