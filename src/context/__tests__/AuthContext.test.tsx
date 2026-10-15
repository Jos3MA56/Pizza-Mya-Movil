
import React from 'react';
import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
} from '@jest/globals';

import {
  render,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';

import { Text, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';

// Simular el repositorio de autenticación.
jest.mock('../../repositories/AuthRepository', () => ({
  autenticarUsuario: jest.fn(),
}));

import { autenticarUsuario } from '../../repositories/AuthRepository';

const autenticarSimulado = jest.mocked(autenticarUsuario);

// Componente utilizado exclusivamente en las pruebas.
function ComponentePrueba() {
  const {
    usuario,
    token,
    iniciarSesion,
    cerrarSesion,
  } = useAuth();

  return (
    <>
      <Text testID="usuario">
        {usuario?.nombre ?? 'Sin usuario'}
      </Text>

      <Text testID="token">
        {token ? 'Token disponible' : 'Sin token'}
      </Text>

      <TouchableOpacity
        testID="login"
        onPress={() => {
          void iniciarSesion(
            'mesero@example.com',
            'ClaveDePrueba123'
          );
        }}
      >
        <Text>Iniciar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="logout"
        onPress={cerrarSesion}
      >
        <Text>Cerrar sesión</Text>
      </TouchableOpacity>
    </>
  );
}

describe('AuthContext - gestión de sesión', () => {
  beforeEach(() => {
    autenticarSimulado.mockReset();
  });

  test('inicia sin usuario y sin token', async () => {
    const { getByTestId } = await render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    );

    expect(getByTestId('usuario').props.children)
      .toBe('Sin usuario');

    expect(getByTestId('token').props.children)
      .toBe('Sin token');
  });

  test('guarda los datos después de autenticar', async () => {
    autenticarSimulado.mockResolvedValue({
      token: 'jwt-de-prueba',
      user: {
        id: 'usuario-1',
        nombres: 'Mesero Prueba',
        email: 'mesero@example.com',
        rol: 'MESERO',
        activo: true,
      },
    });

    const { getByTestId } = await render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    );

    await fireEvent.press(getByTestId('login'));

    await waitFor(() => {
      expect(getByTestId('usuario').props.children)
        .toBe('Mesero Prueba');

      expect(getByTestId('token').props.children)
        .toBe('Token disponible');
    });
  });

  test('elimina usuario y token al cerrar sesión', async () => {
    autenticarSimulado.mockResolvedValue({
      token: 'jwt-de-prueba',
      user: {
        id: 'usuario-1',
        nombres: 'Mesero Prueba',
        email: 'mesero@example.com',
        rol: 'MESERO',
        activo: true,
      },
    });

    const { getByTestId } = await render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    );

    await fireEvent.press(getByTestId('login'));

    await waitFor(() => {
      expect(getByTestId('usuario').props.children)
        .toBe('Mesero Prueba');
    });

    await fireEvent.press(getByTestId('logout'));

    await waitFor(() => {
      expect(getByTestId('usuario').props.children)
        .toBe('Sin usuario');

      expect(getByTestId('token').props.children)
        .toBe('Sin token');
    });
  });
});
