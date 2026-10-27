const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {analizar} = require('../mobsf.cjs');
const key = 'c'.repeat(64);
async function fixture(run) {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobsf-test-'));const apk = path.join(dir, 'test.apk');fs.writeFileSync(apk, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
 try {await run(apk, dir);} finally {fs.rmSync(dir, {recursive: true, force: true});}
}
test('sube, escanea y recupera informe autenticado en localhost', async () => fixture(async (apk, out) => {
 const rutas = [];
 const report = {file_name: 'test.apk', package_name: 'app.test', manifest_analysis: {}, code_analysis: {}};
 const r = await analizar(apk, key, {out, fetchImpl: async (url, init) => {assert.equal(init.headers.Authorization, key);assert.match(url, /^http:\/\/127\.0\.0\.1:8000\//);rutas.push(new URL(url).pathname);return Response.json(url.endsWith('/upload') ? {hash: 'a'.repeat(32)} : url.endsWith('/report_json') ? report : {});}});
 assert.deepEqual(r, report);assert.deepEqual(rutas, ['/api/v1/scans', '/api/v1/upload', '/api/v1/scan', '/api/v1/report_json']);assert.ok(fs.existsSync(path.join(out, 'mobsf-report.json')));
}));
test('un servicio caído no se presenta como análisis aprobado', async () => fixture(async apk => {
 await assert.rejects(analizar(apk, key, {intentos: 1, pausa: async () => {}, fetchImpl: async () => {throw Error('offline');}}), /no respondió/);
}));
test('rechaza un informe incompleto', async () => fixture(async apk => {
 await assert.rejects(analizar(apk, key, {fetchImpl: async url => Response.json(url.endsWith('/upload') ? {hash: 'a'.repeat(32)} : {})}), /incompleto/);
}));
