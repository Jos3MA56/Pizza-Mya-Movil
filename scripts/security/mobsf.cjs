const fs = require('node:fs');
const path = require('node:path');

function buscarAPK(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? buscarAPK(path.join(dir, e.name)) : e.isFile() && e.name.endsWith('.apk') ? [path.join(dir, e.name)] : []);
}
async function analizar(apk, key, {fetchImpl = fetch, out = 'security-results', intentos = 60, pausa = () => new Promise(r => setTimeout(r, 5000))} = {}) {
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) throw new Error('Falta clave efímera de MobSF.');
  const binary = fs.readFileSync(apk);
  if (binary.length < 4 || binary.readUInt32LE(0) !== 0x04034b50) throw new Error('El archivo no es un APK/ZIP válido.');
  const url = 'http://127.0.0.1:8000';
  const headers = {Authorization: key};
  let disponible = false;
  for (let i = 0; i < intentos; i++) {
    try {const r = await fetchImpl(url + '/api/v1/scans', {headers, signal: AbortSignal.timeout(5000)});if (r.ok) {disponible = true;break;}} catch {}
    await pausa();
  }
  if (!disponible) throw new Error('MobSF no respondió a tiempo; análisis no realizado.');
  async function post(route, body) {
    const r = await fetchImpl(url + route, {method: 'POST', headers, body, signal: AbortSignal.timeout(15 * 60 * 1000)});
    if (!r.ok) throw new Error(`MobSF respondió HTTP ${r.status} en ${route}`);
    const data = await r.json();if (!data || typeof data !== 'object' || data.error) throw new Error('MobSF devolvió un error de análisis.');return data;
  }
  const form = new FormData();form.append('file', new Blob([binary], {type: 'application/vnd.android.package-archive'}), path.basename(apk));
  const uploaded = await post('/api/v1/upload', form);
  if (!/^[a-f0-9]{32}$/i.test(uploaded.hash ?? '')) throw new Error('MobSF no confirmó el hash del APK.');
  await post('/api/v1/scan', new URLSearchParams({hash: uploaded.hash}));
  const report = await post('/api/v1/report_json', new URLSearchParams({hash: uploaded.hash}));
  if (!report.file_name || !report.package_name || !report.manifest_analysis || !report.code_analysis) throw new Error('Informe MobSF incompleto; revisar análisis.');
  fs.mkdirSync(out, {recursive: true});fs.writeFileSync(path.join(out, 'mobsf-report.json'), JSON.stringify(report, null, 2));
  console.log('Informe estático MobSF guardado. Requiere revisión de hallazgos; no acredita DAST.');
  return report;
}
module.exports = {buscarAPK, analizar};
if (require.main === module) {
  (async () => {const files = buscarAPK(process.argv[2] ?? 'apk-input');if (files.length !== 1) throw new Error('Se requiere exactamente un APK del proyecto.');await analizar(files[0], process.env.MOBSF_API_KEY);})().catch(e => {console.error(e.message);process.exitCode = 1;});
}
