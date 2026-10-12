import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function useLoginViewModel() {
  const { iniciarSesion } = useAuth();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const validarCorreo = (valor: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
  };

  const login = async (): Promise<void> => {
    if (cargando) return;

    setError("");

    if (!correo.trim() || !password.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (!validarCorreo(correo.trim())) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

    setCargando(true);

    try {
      console.log("[LOGIN] Botón presionado. Intentando autenticar...");

      const resultado = await iniciarSesion(
        correo.trim().toLowerCase(),
        password,
      );

      console.log("[LOGIN] Resultado:", resultado);

      if (!resultado) {
        setError("No se pudo iniciar sesión.");
      }
    } catch (err) {
      console.error("[LOGIN] Error:", err);

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
