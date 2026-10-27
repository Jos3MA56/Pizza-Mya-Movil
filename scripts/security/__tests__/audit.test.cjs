const {test} = require('node:test');
const assert = require('node:assert/strict');
const {evaluar} = require('../audit.cjs');
const url = 'https://github.com/advisories/GHSA-ejemplo';
function informe(severity = 'high') {return {vulnerabilities: {libreria: {via: [{severity, url}]}}, metadata: {vulnerabilities: {[severity]: 1}}};}
const excepcion = {paquete: 'libreria', url, revisarAntesDe: '2026-11-27', motivo: 'Requiere migración independiente'};
test('bloquea un advisory alto nuevo', () => assert.equal(evaluar(informe(), []).bloqueos.length, 1));
test('solo reconoce la excepción exacta y vigente', () => {
  assert.equal(evaluar(informe(), [excepcion], new Date('2026-10-27')).aceptadas.length, 1);
  assert.equal(evaluar(informe(), [{...excepcion, paquete: 'otra'}], new Date('2026-10-27')).bloqueos.length, 1);
  assert.equal(evaluar(informe(), [excepcion], new Date('2026-11-28')).bloqueos.length, 1);
});
test('un riesgo crítico bloquea incluso con excepción', () => assert.equal(evaluar(informe('critical'), [excepcion], new Date('2026-10-27')).bloqueos.length, 1));
test('un fallo de servicio no cuenta como auditoría limpia', () => assert.throws(() => evaluar({error: {code: 'NETWORK'}}, [])));
test('no oculta riesgos altos sin detalles', () => assert.equal(evaluar({vulnerabilities: {}, metadata: {vulnerabilities: {high: 1}}}, []).bloqueos.length, 1));
