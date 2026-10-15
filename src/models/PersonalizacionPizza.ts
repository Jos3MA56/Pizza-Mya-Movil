export type TamanioPizza = "IND" | "MD" | "GD" | "JB";

export type ModalidadPizza = "completa" | "mitad_mitad";

export interface EspecialidadSeleccionada {
  id: string;
  nombre: string;
  precioCentavos: number;
}

export interface OpcionAdicional {
  id: string;
  nombre: string;
  precioCentavos: number;
}

export interface PersonalizacionPizza {
  tamanio: TamanioPizza;
  modalidad: ModalidadPizza;

  especialidadPrincipal: EspecialidadSeleccionada;
  segundaEspecialidad?: EspecialidadSeleccionada;

  ingredientesExtras: OpcionAdicional[];
  orilla?: OpcionAdicional;
  masa?: OpcionAdicional;

  ingredientesSin: string[];
  observaciones?: string;
  cantidad: number;
}

export interface DesglosePrecioPizza {
  precioBaseCentavos: number;
  extrasCentavos: number;
  orillaCentavos: number;
  masaCentavos: number;
  precioUnitarioCentavos: number;
  totalCentavos: number;
}
