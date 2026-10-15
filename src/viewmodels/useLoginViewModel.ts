import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { validarLogin } from "../utils/validarLogin";

export function useLoginViewModel() {
  const { iniciarSesion } = useAuth();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const login = async (): Promise<void> => {
    if (cargando) return;

    setError("");

    const errorValidacion = validarLogin(correo, password);

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setCargando(true);

    try {
      const resultado = await iniciarSesion(
        correo.trim().toLowerCase(),
        password,
      );

      if (!resultado) {
        setError("No se pudo iniciar sesión.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setCargando(false);
    }
  };

  return {
    correo,
    setCorreo,
    password,
    setPassword,
    error,
    cargando,
    login,
  };
}
