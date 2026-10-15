export function validarLogin(correo: string, password: string): string | null {
  if (!correo.trim() || !password.trim()) {
    return "Todos los campos son obligatorios.";
  }

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!correoValido.test(correo.trim())) {
    return "Introduce un correo electrónico válido.";
  }

  return null;
}
