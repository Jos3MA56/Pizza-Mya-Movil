import { guardarSesionLocal, recuperarSesionLocal, eliminarSesionLocal } from '../services/SesionAutenticada';

import React, {
  createContext,
  useEffect,
  useRef,
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

  const generacion = useRef(0);
  useEffect(() => {
    let activo = true;
    const actual = generacion.current;
    void recuperarSesionLocal().then(s => {
      if (activo && generacion.current === actual && s) { setUsuario(s.usuario); setToken(s.token); }
    }).catch(() => undefined);
    return () => { activo = false; };
  }, []);

  const iniciarSesion = async (
    correo: string,
    password: string
  ): Promise<boolean> => {
    generacion.current += 1;
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

      const usuarioAutenticado: Usuario = {
        id: resultado.user.id,
        nombre: resultado.user.nombres,
        rol,
      };
      await guardarSesionLocal(usuarioAutenticado, resultado.token);
      setUsuario(usuarioAutenticado);

      return true;
    } catch (error) {
      void eliminarSesionLocal().catch(() => undefined);
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
    generacion.current += 1;
    void eliminarSesionLocal().catch(() => undefined);
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
