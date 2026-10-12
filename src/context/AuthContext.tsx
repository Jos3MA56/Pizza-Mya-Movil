
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import type { Usuario, RolUsuario } from '../models/Usuario';

interface AuthContextType {
  usuario: Usuario | null;
  iniciarSesion: (correo: string, password: string) => Promise<boolean>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuarios exclusivamente para pruebas locales.
// Nunca utilizar este mecanismo en producción.
const usuariosPrueba: Array<Usuario & {
  correo: string;
  password: string;
}> = [
  {
    id: '1',
    nombre: 'Mesero de prueba',
    correo: 'mesero@pizzamya.test',
    password: 'Demo1234',
    rol: 'mesero',
  },
  {
    id: '2',
    nombre: 'Cocina de prueba',
    correo: 'cocina@pizzamya.test',
    password: 'Demo1234',
    rol: 'cocina',
  },
];

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const iniciarSesion = async (
    correo: string,
    password: string
  ): Promise<boolean> => {
    const encontrado = usuariosPrueba.find(
      (u) =>
        u.correo.toLowerCase() === correo.trim().toLowerCase() &&
        u.password === password
    );

    if (!encontrado) {
      return false;
    }

    setUsuario({
      id: encontrado.id,
      nombre: encontrado.nombre,
      rol: encontrado.rol as RolUsuario,
    });

    return true;
  };

  const cerrarSesion = () => {
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{ usuario, iniciarSesion, cerrarSesion }}
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
