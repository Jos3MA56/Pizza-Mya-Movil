const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

function evaluar(report, excepciones, fecha = new Date()) {
  if (!report || report.error || !report.vulnerabilities || !report.metadata?.vulnerabilities) {
    throw new Error('La auditoría no devolvió un informe válido; no se considera aprobada.');
  }
  const bloqueos = [], aceptadas = [];
  for (const [paquete, info] of Object.entries(report.vulnerabilities)) {
    for (const advisory of info.via ?? []) {
      if (typeof advisory === 'string' || !['high', 'critical'].includes(advisory.severity)) continue;
      const excepcion = excepciones.find(e => e.paquete === paquete && e.url === advisory.url && fecha < new Date(e.revisarAntesDe));
      const hallazgo = {paquete, severidad: advisory.severity, url: advisory.url};
      if (advisory.severity === 'critical' || !excepcion) bloqueos.push(hallazgo);
      else aceptadas.push({...hallazgo, motivo: excepcion.motivo, revisarAntesDe: excepcion.revisarAntesDe});
    }
  }
  // Un informe con riesgo alto pero sin advisory identificable no puede pasar silenciosamente.
  if ((report.metadata.vulnerabilities.high || report.metadata.vulnerabilities.critical) && !bloqueos.length && !aceptadas.length) {
    bloqueos.push({motivo: 'Riesgo alto sin detalle verificable del advisory'});
  }
  return {bloqueos, aceptadas, resumen: report.metadata.vulnerabilities};
}

function main() {
  const out = path.resolve('security-results');fs.mkdirSync(out, {recursive: true});
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const proc = spawnSync(command, ['audit', '--json', '--ignore-scripts'], {encoding: 'utf8', shell: process.platform === 'win32'});
  if (proc.error || ![0, 1].includes(proc.status)) throw new Error('No se pudo completar npm audit.');
  let report;try {report = JSON.parse(proc.stdout);} catch {throw new Error('npm audit no produjo JSON válido.');}
  fs.writeFileSync(path.join(out, 'npm-audit.json'), JSON.stringify(report, null, 2));
  const excepciones = JSON.parse(fs.readFileSync(path.join(__dirname, '../../.security/audit-exceptions.json'), 'utf8'));
  const resultado = evaluar(report, excepciones);
  fs.writeFileSync(path.join(out, 'resumen.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado, null, 2));
  if (resultado.bloqueos.length) process.exitCode = 1;
}
module.exports = {evaluar};
if (require.main === module) {try {main();} catch (e) {console.error(e.message);process.exitCode = 1;}}
