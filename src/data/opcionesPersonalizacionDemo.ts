import type { OpcionAdicional } from "../models/PersonalizacionPizza";

export const INGREDIENTES_DEMO: OpcionAdicional[] = [
  { id: "queso-extra", nombre: "Queso extra", precioCentavos: 2500 },
  { id: "pepperoni-extra", nombre: "Pepperoni extra", precioCentavos: 3000 },
  { id: "champiñones", nombre: "Champiñones extra", precioCentavos: 2000 },
  { id: "piña-extra", nombre: "Piña extra", precioCentavos: 1500 },
];

export const INGREDIENTES_PARA_RETIRAR = [
  "Cebolla",
  "Piña",
  "Champiñones",
  "Pimiento",
  "Jalapeño",
];

export const MASAS_DEMO: OpcionAdicional[] = [
  { id: "tradicional", nombre: "Tradicional", precioCentavos: 0 },
  { id: "delgada", nombre: "Delgada", precioCentavos: 0 },
  { id: "dorada", nombre: "Dorada", precioCentavos: 0 },
];

export const ORILLAS_DEMO: OpcionAdicional[] = [
  { id: "normal", nombre: "Orilla normal", precioCentavos: 0 },
  { id: "queso", nombre: "Orilla de queso", precioCentavos: 4000 },
];

export interface ComplementoDemo {
  id: string;
  nombre: string;
  categoria: "complemento" | "bebida";
  precioCentavos: number;
}

export const COMPLEMENTOS_DEMO: ComplementoDemo[] = [
  {
    id: "papas",
    nombre: "Papas",
    categoria: "complemento",
    precioCentavos: 6000,
  },
  {
    id: "alitas",
    nombre: "Alitas",
    categoria: "complemento",
    precioCentavos: 12000,
  },
  {
    id: "refresco",
    nombre: "Refresco",
    categoria: "bebida",
    precioCentavos: 3500,
  },
];
