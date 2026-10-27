function ejemplos(token: string, password: string, mensaje: string, codigo: string) {
  // ruleid: pizza-mya-logging-sensitive-data
  console.log(token);
  // ruleid: pizza-mya-logging-sensitive-data
  console.warn('Fallo', password);
  // ok: pizza-mya-logging-sensitive-data
  console.log(mensaje);
  // ruleid: pizza-mya-dynamic-execution
  eval(codigo);
  // ruleid: pizza-mya-dynamic-execution
  new Function(codigo);
  // ok: pizza-mya-dynamic-execution
  JSON.parse(codigo);
}
