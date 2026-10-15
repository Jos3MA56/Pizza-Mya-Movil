const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Compilar únicamente el servicio para ejecutarlo con Node.
const ruta = path.join(__dirname, "../src/services/calcularPrecioPizza.ts");

const codigo = fs.readFileSync(ruta, "utf8");

const compilado = ts.transpileModule(codigo, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const modulo = { exports: {} };
new Function("module", "exports", "require", compilado)(
  modulo,
  modulo.exports,
  require,
);

const { calcularPrecioPizza } = modulo.exports;

function crearPizza(cambios = {}) {
  return {
    tamanio: "MD",
    modalidad: "mitad_mitad",
    especialidadPrincipal: {
      id: "hawaiana",
      nombre: "Hawaiana",
      precioCentavos: 25000,
    },
    segundaEspecialidad: {
      id: "pepperoni",
      nombre: "Pepperoni",
      precioCentavos: 28000,
    },
    ingredientesExtras: [],
    ingredientesSin: [],
    cantidad: 1,
    ...cambios,
  };
}

test("Mitad y mitad cobra la especialidad de mayor precio", () => {
  const resultado = calcularPrecioPizza(crearPizza());
  assert.equal(resultado.precioBaseCentavos, 28000);
  assert.equal(resultado.totalCentavos, 28000);
});

test("Agregar queso extra aumenta el total a $305", () => {
  const pizza = crearPizza({
    ingredientesExtras: [
      { id: "queso", nombre: "Queso extra", precioCentavos: 2500 },
    ],
  });

  assert.equal(calcularPrecioPizza(pizza).totalCentavos, 30500);
});

test("Agregar queso extra y orilla aumenta el total a $345", () => {
  const pizza = crearPizza({
    ingredientesExtras: [
      { id: "queso", nombre: "Queso extra", precioCentavos: 2500 },
    ],
    orilla: {
      id: "orilla-queso",
      nombre: "Orilla de queso",
      precioCentavos: 4000,
    },
  });

  assert.equal(calcularPrecioPizza(pizza).totalCentavos, 34500);
});

test("Dos pizzas multiplican correctamente el precio", () => {
  const pizza = crearPizza({ cantidad: 2 });
  assert.equal(calcularPrecioPizza(pizza).totalCentavos, 56000);
});

test("Retirar ingredientes no reduce el precio", () => {
  const pizza = crearPizza({
    ingredientesSin: ["Piña"],
  });

  assert.equal(calcularPrecioPizza(pizza).totalCentavos, 28000);
});

test("No permite dos especialidades iguales", () => {
  const pizza = crearPizza({
    segundaEspecialidad: {
      id: "hawaiana",
      nombre: "Hawaiana",
      precioCentavos: 25000,
    },
  });

  assert.throws(() => calcularPrecioPizza(pizza), /diferentes/);
});

test("No permite precios negativos", () => {
  const pizza = crearPizza({
    ingredientesExtras: [
      { id: "extra", nombre: "Extra", precioCentavos: -100 },
    ],
  });

  assert.throws(() => calcularPrecioPizza(pizza), /precio/);
});

test("No permite cantidades inválidas", () => {
  assert.throws(
    () => calcularPrecioPizza(crearPizza({ cantidad: 0 })),
    /cantidad/,
  );
});
