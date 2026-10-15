
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import type { Usuario } from '../models/Usuario';
import { normalizarRol } from '../utils/normalizarRol';
import { autenticarUsuario } from '../repositories/AuthRepository';
import { ApiHttpError } from '../services/api/ApiClient';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  iniciarSesion: (
    correo: string,
    password: string
  ) => Promise<boolean>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const iniciarSesion = async (
    correo: string,
    password: string
  ): Promise<boolean> => {
    try {
      const resultado = await autenticarUsuario(
        correo.trim().toLowerCase(),
        password
      );

      if (!resultado.user.activo) {
        throw new Error('La cuenta está desactivada.');
      }

      const rol = normalizarRol(resultado.user.rol);

      if (!rol) {
        throw new Error(
          'Tu cuenta no tiene acceso a esta aplicación.'
        );
      }

      setToken(resultado.token);

      setUsuario({
        id: resultado.user.id,
        nombre: resultado.user.nombres,
        rol,
      });

      return true;
    } catch (error) {
      setUsuario(null);
      setToken(null);

      if (error instanceof ApiHttpError) {
        if (error.status === 401) {
          throw new Error('Correo o contraseña incorrectos.');
        }

        if (error.status === 403) {
          throw new Error(
            'Tu cuenta está desactivada o no tiene acceso.'
          );
        }

        if (error.status === 429) {
          throw new Error(
            'Demasiados intentos. Intenta nuevamente más tarde.'
          );
        }
      }

      throw error;
    }
  };

  const cerrarSesion = () => {
    setUsuario(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        iniciarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider'
    );
  }

  return context;
}
