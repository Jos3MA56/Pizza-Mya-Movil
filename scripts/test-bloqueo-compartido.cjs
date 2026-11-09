// Behavioral tests execute the production TypeScript and migrations against Node's real SQLite engine.
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mya-sqlite-'));
const file = path.join(dir, 'orders.db');
let sqlite = new DatabaseSync(file);
let tail = Promise.resolve();
const params = args => args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
const bridge = {
  async execAsync(sql) { sqlite.exec(sql); },
  async runAsync(sql, ...args) { return sqlite.prepare(sql).run(...params(args)); },
  async getFirstAsync(sql, ...args) { return sqlite.prepare(sql).get(...params(args)) ?? null; },
  async getAllAsync(sql, ...args) { return sqlite.prepare(sql).all(...params(args)); },
  async withExclusiveTransactionAsync(fn) {
    const previous = tail;
    let release;
    tail = new Promise(r => { release = r; });
    await previous;
    sqlite.exec('BEGIN IMMEDIATE');
    try { await fn(bridge); sqlite.exec('COMMIT'); }
    catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    finally { release(); }
  },
};
const secure = new Map();
const cache = new Map();
function load(filename) {
  const resolved = path.resolve(root, filename.endsWith('.ts') ? filename : filename + '.ts');
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const mod = { exports: {} }; cache.set(resolved, mod);
  const code = ts.transpileModule(fs.readFileSync(resolved,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const customRequire = name => {
    if (name === 'expo-sqlite') return { openDatabaseAsync: async () => bridge };
    if (name === 'expo-crypto') return { randomUUID };
    if (name === 'expo-secure-store') return { getItemAsync: async k => secure.get(k) ?? null, setItemAsync: async (k,v) => { secure.set(k,v); }, deleteItemAsync: async k => { secure.delete(k); } };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(resolved), name));
    return require(name);
  };
  new Function('require','module','exports',code)(customRequire,mod,mod.exports);
  return mod.exports;
}


test('retirar y confirmar esperan a la escritura de caché sin perder la operación',async()=>{
 const storage=load('src/services/storage/database.ts');
 await storage.obtenerBaseDatos();
 load('src/services/SesionLocal.ts').establecerActorLocal({id:'mesero-1',nombre:'Mesero',rol:'mesero'});
 const {CompartidoPedidoRepository}=load('src/repositories/CompartidoPedidoRepository.ts');
 const repo=new CompartidoPedidoRepository(async()=>bridge);
 const cuenta={id:'cuenta-test',mesaId:3,revision:1,productos:[],estado:'borrador',total:0};
 repo.api=async()=>({cuenta});
 // Expo usa otra conexión para la transacción exclusiva. Reproducir ese bloqueo real.
 bridge.withExclusiveTransactionAsync=async fn=>{
  const writer=new DatabaseSync(file);writer.exec('BEGIN IMMEDIATE');
  const tx={runAsync:async(sql,...args)=>writer.prepare(sql).run(...params(args))};
  try{await fn(tx);writer.exec('COMMIT');}catch(e){writer.exec('ROLLBACK');throw e;}finally{writer.close();}
 };
 let release,started;
 const ready=new Promise(r=>{started=r;});
 const gate=new Promise(r=>{release=r;});
 const busy=storage.transaccionLocal(bridge,async tx=>{
  await tx.runAsync('INSERT INTO cuentas_cache VALUES (?,?,?)',cuenta.id,3,JSON.stringify(cuenta));
  started();await gate;
 });
 await ready;
 const retirar=repo.mutar(cuenta.id,1,'quitar',{lineaId:'producto-1'});
 // Dar oportunidad a la operación de intentar escribir mientras SQLite está ocupado.
 const early=retirar.then(()=>null,e=>e);
 await new Promise(r=>setTimeout(r,30));release();await busy;
 assert.equal(await early,null);
 await retirar;
 const ops=await repo.operaciones(cuenta.id);
 assert.equal(ops.length,1);assert.equal(ops[0].estado,'CONFIRMADA');
 assert.equal(JSON.parse(ops[0].payload).accion,'quitar');
 // Un fallo libera el turno de escritura para la siguiente operación.
 await assert.rejects(storage.transaccionLocal(bridge,async()=>{throw Error('fallo simulado');}));
 await repo.cache({...cuenta,revision:2});
 assert.equal(JSON.parse((await bridge.getFirstAsync('SELECT documento FROM cuentas_cache WHERE id=?',cuenta.id)).documento).revision,2);
 sqlite.close();
});
