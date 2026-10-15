/**
 * Pruebas automatizadas sin nuevas dependencias: usa TypeScript (ya instalado)
 * para compilar solo los módulos de dominio a una carpeta temporal, y node:test.
 * Ejecutar con: npm run test:patterns
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const raiz = path.resolve(__dirname, "..");
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "pizza-mya-patrones-"));
process.on("exit", () => fs.rmSync(temporal, { recursive: true, force: true }));

const fuentes = [
  "src/models/Pedido.ts",
  "src/repositories/PedidoRepository.ts",
  "src/observers/PedidoSubject.ts",
  "src/repositories/InMemoryPedidoRepository.ts",
  "src/services/PedidoRepositorySingleton.ts",
].map((f) => path.join(raiz, f));

const programa = ts.createProgram(fuentes, {
  strict: true,
  noEmitOnError: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.Node16,
  moduleResolution: ts.ModuleResolutionKind.Node16,
  rootDir: path.join(raiz, "src"),
  outDir: temporal,
  skipLibCheck: true,
  types: [],
});

const errores = ts.getPreEmitDiagnostics(programa);
if (errores.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(errores, {
      getCurrentDirectory: () => raiz,
      getCanonicalFileName: (f) => f,
      getNewLine: () => "\n",
    }),
  );
  process.exit(1);
}
programa.emit();

const { InMemoryPedidoRepository } = require(
  path.join(temporal, "repositories/InMemoryPedidoRepository.js"),
);
const { PedidoRepositorySingleton } = require(
  path.join(temporal, "services/PedidoRepositorySingleton.js"),
);

const ejemplo = { id: "P-101", estado: "borrador", total: 125 };

test("Repository: guarda, consulta y devuelve null para un pedido inexistente", async () => {
  const repositorio = new InMemoryPedidoRepository();
  assert.equal(await repositorio.obtenerPorId("NO-EXISTE"), null);
  await repositorio.guardar(ejemplo);
  assert.deepEqual(await repositorio.obtenerPorId("P-101"), ejemplo);
});

test("Repository: protege la copia guardada contra modificaciones externas", async () => {
  const repositorio = new InMemoryPedidoRepository([ejemplo]);
  const recuperado = await repositorio.obtenerPorId("P-101");
  recuperado.total = 0;
  assert.equal((await repositorio.obtenerPorId("P-101")).total, 125);
});

test("Observer: notifica cambios solamente al pedido suscrito y permite desuscribir", async () => {
  const repositorio = new InMemoryPedidoRepository([ejemplo]);
  const recibidos = [];
  const desconectar = repositorio.suscribir("P-101", (pedido) =>
    recibidos.push(pedido.estado),
  );
  await repositorio.guardar({ id: "P-OTRO", estado: "enviado", total: 10 });
  await repositorio.guardar({ ...ejemplo, estado: "enviado" });
  desconectar();
  await repositorio.guardar({ ...ejemplo, estado: "cancelado" });
  assert.deepEqual(recibidos, ["enviado"]);
});

test("Observer: cada observador recibe su propia copia", async () => {
  const repositorio = new InMemoryPedidoRepository();
  const resultados = [];
  repositorio.suscribir("P-101", (pedido) => {
    pedido.total = 0;
  });
  repositorio.suscribir("P-101", (pedido) => {
    resultados.push(pedido.total);
  });
  await repositorio.guardar(ejemplo);
  assert.deepEqual(resultados, [125]);
});

test("Singleton: diferentes accesos comparten el mismo repositorio", async () => {
  const primera = PedidoRepositorySingleton.obtenerInstancia();
  const segunda = PedidoRepositorySingleton.obtenerInstancia();
  assert.equal(primera, segunda);
  assert.equal(primera.obtenerRepositorio(), segunda.obtenerRepositorio());

  // Comprobar que ambas referencias apuntan al mismo Singleton.
  assert.strictEqual(primera, segunda);

  // Obtener el repositorio compartido.
  const repo1 = primera.obtenerRepositorio();
  const repo2 = segunda.obtenerRepositorio();

  // Comprobar que es la misma instancia de Repository.
  assert.strictEqual(repo1, repo2);

  // Verificar que los cambios realizados desde un acceso
  // son visibles desde el otro.
  const pedidoPrueba = {
    id: "TEST-SINGLETON-001",
    estado: "borrador",
    total: 0,
  };

  await repo1.guardar(pedidoPrueba);

  const recuperado = await repo2.obtenerPorId(pedidoPrueba.id);

  assert.deepStrictEqual(recuperado, pedidoPrueba);
});
