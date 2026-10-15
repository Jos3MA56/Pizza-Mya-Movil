import type {
  PersonalizacionPizza,
  DesglosePrecioPizza,
} from "../models/PersonalizacionPizza";

function validarPrecio(precio: number): void {
  if (!Number.isSafeInteger(precio) || precio < 0) {
    throw new Error(
      "El precio debe ser un número entero de centavos no negativo.",
    );
  }
}

export function calcularPrecioPizza(
  pizza: PersonalizacionPizza,
): DesglosePrecioPizza {
  if (
    !Number.isInteger(pizza.cantidad) ||
    pizza.cantidad < 1 ||
    pizza.cantidad > 99
  ) {
    throw new Error("La cantidad debe estar entre 1 y 99.");
  }

  validarPrecio(pizza.especialidadPrincipal.precioCentavos);

  let precioBaseCentavos = pizza.especialidadPrincipal.precioCentavos;

  if (pizza.modalidad === "mitad_mitad") {
    const segunda = pizza.segundaEspecialidad;

    if (!segunda) {
      throw new Error("Selecciona la segunda especialidad.");
    }

    if (segunda.id === pizza.especialidadPrincipal.id) {
      throw new Error("Selecciona dos especialidades diferentes.");
    }

    validarPrecio(segunda.precioCentavos);

    precioBaseCentavos = Math.max(precioBaseCentavos, segunda.precioCentavos);
  }

  for (const extra of pizza.ingredientesExtras) {
    validarPrecio(extra.precioCentavos);
  }

  const extrasCentavos = pizza.ingredientesExtras.reduce(
    (total, extra) => total + extra.precioCentavos,
    0,
  );

  const orillaCentavos = pizza.orilla?.precioCentavos ?? 0;
  const masaCentavos = pizza.masa?.precioCentavos ?? 0;

  validarPrecio(orillaCentavos);
  validarPrecio(masaCentavos);

  const precioUnitarioCentavos =
    precioBaseCentavos + extrasCentavos + orillaCentavos + masaCentavos;

  const totalCentavos = precioUnitarioCentavos * pizza.cantidad;

  if (
    !Number.isSafeInteger(precioUnitarioCentavos) ||
    !Number.isSafeInteger(totalCentavos)
  ) {
    throw new Error("El importe calculado es demasiado grande.");
  }

  return {
    precioBaseCentavos,
    extrasCentavos,
    orillaCentavos,
    masaCentavos,
    precioUnitarioCentavos,
    totalCentavos,
  };
}
