/**
 * Pruebas sin red del cliente HTTP. Compila SOLO ApiClient.ts con TypeScript
 * y ejecuta los casos mediante el módulo nativo node:test.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const raiz = path.resolve(__dirname, '..');
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'pizza-mya-api-'));
process.on('exit', () => fs.rmSync(temporal, { recursive: true, force: true }));
const origen = path.join(raiz, 'src/services/api/ApiClient.ts');
const programa = ts.createProgram([origen], {
  strict: true,
  noEmitOnError: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.Node16,
  moduleResolution: ts.ModuleResolutionKind.Node16,
  rootDir: path.join(raiz, 'src'),
  outDir: temporal,
  skipLibCheck: true,
  types: [],
});
const errores = ts.getPreEmitDiagnostics(programa);
if (errores.length > 0) {
  console.error(ts.formatDiagnosticsWithColorAndContext(errores, {
    getCurrentDirectory: () => raiz,
    getCanonicalFileName: f => f,
    getNewLine: () => '\n',
  }));
  process.exit(1);
}
programa.emit();
const {
  ApiClient, ApiConfigurationError, ApiHttpError, ApiNetworkError, ApiTimeoutError,
} = require(path.join(temporal, 'services/api/ApiClient.js'));

const respuesta = (body, status = 200, headers = { 'content-type': 'application/json' }) =>
  new Response(body, { status, headers });

test('GET arma correctamente la ruta y obtiene JSON', async () => {
  let urlRecibida = '';
  const cliente = new ApiClient({
    baseUrl: 'http://127.0.0.1:3000/',
    fetchImpl: async (url) => {
      urlRecibida = url;
      return respuesta(JSON.stringify({ ok: true }));
    },
  });
  const r = await cliente.get('/api/health');
  assert.equal(urlRecibida, 'http://127.0.0.1:3000/api/health');
  assert.deepEqual(r, { status: 200, data: { ok: true } });
});

test('GET acepta texto plano y respuesta vacía', async () => {
  const texto = new ApiClient({
    baseUrl: 'https://ejemplo.test',
    fetchImpl: async () => respuesta('ok', 200, { 'content-type': 'text/plain' }),
  });
  assert.deepEqual(await texto.get('health'), { status: 200, data: 'ok' });
  const vacio = new ApiClient({
    baseUrl: 'https://ejemplo.test',
    fetchImpl: async () => new Response(null, { status: 204 }),
  });
  assert.deepEqual(await vacio.get('health'), { status: 204, data: null });
});

test('POST envía JSON con encabezado adecuado', async () => {
  let solicitud;
  const cliente = new ApiClient({
    baseUrl: 'https://ejemplo.test',
    fetchImpl: async (_url, init) => {
      solicitud = init;
      return respuesta('{"guardado":true}', 201);
    },
  });
  const r = await cliente.post('/api/prueba', { id: 7 });
  assert.equal(solicitud.method, 'POST');
  assert.equal(solicitud.headers['Content-Type'], 'application/json');
  assert.equal(solicitud.body, '{"id":7}');
  assert.equal(r.status, 201);
});

test('Distingue error HTTP de un error de red', async () => {
  const http = new ApiClient({
    baseUrl: 'https://ejemplo.test',
    fetchImpl: async () => respuesta('{"error":"no"}', 401),
  });
  await assert.rejects(http.get('/api/health'), e => e instanceof ApiHttpError && e.status === 401);
  const red = new ApiClient({
    baseUrl: 'https://ejemplo.test',
    fetchImpl: async () => { throw new Error('network failed'); },
  });
  await assert.rejects(red.get('/api/health'), ApiNetworkError);
});

test('Detecta tiempo de espera y aborta la solicitud', async () => {
  let fueAbortada = false;
  const lento = new ApiClient({
    baseUrl: 'https://ejemplo.test',
    timeoutMs: 15,
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        fueAbortada = true;
        reject(new Error('aborted'));
      });
    }),
  });
  await assert.rejects(lento.get('/api/health'), ApiTimeoutError);
  assert.equal(fueAbortada, true);
});

test('Rechaza URL no configurada y rutas absolutas externas', async () => {
  assert.throws(() => new ApiClient({ baseUrl: '' }), ApiConfigurationError);
  const cliente = new ApiClient({ baseUrl: 'https://ejemplo.test', fetchImpl: async () => respuesta('ok') });
  await assert.rejects(cliente.get('https://externo.test/robo'), ApiConfigurationError);
  await assert.rejects(cliente.get('/../admin'), ApiConfigurationError);
});

test('Distingue JSON mal formado', async () => {
  const cliente = new ApiClient({
    baseUrl: 'https://ejemplo.test',
    fetchImpl: async () => respuesta('{incompleto'),
  });
  await assert.rejects(cliente.get('/api/health'), /JSON no válido/);
});
