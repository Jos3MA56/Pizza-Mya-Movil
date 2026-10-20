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

const {pathToFileURL}=require('node:url');
const {once}=require('node:events');

test('dos celulares con SQLite separados comparten mesa, editan con version y publican solo incrementos',async()=>{
 const pos=path.resolve(process.env.POS_REPO||path.join(root,'..'));
 const {openDatabase}=await import(pathToFileURL(path.join(pos,'server/src/database.js')));
 const {createService}=await import(pathToFileURL(path.join(pos,'server/src/app.js')));
 const {importarCatalogo}=await import(pathToFileURL(path.join(pos,'server/src/importar-catalogo.js')));
 const token='b'.repeat(64);let db,service,urlBase;
 async function iniciar(){db=openDatabase(path.join(dir,'pos-test.sqlite'));service=createService(db,{token,requireAuth:true});service.server.listen(0,'127.0.0.1');await once(service.server,'listening');urlBase=`http://127.0.0.1:${service.server.address().port}`;await load('src/services/sync/PosLanConfig.ts').guardarConfiguracionPOS({urlBase,token});}
 async function parar(){for(const c of service.sockets.clients)c.terminate();await new Promise(r=>service.sockets.close(r));await new Promise(r=>service.server.close(r));db.close();}
 const sqliteB=new DatabaseSync(path.join(dir,'celular-B.sqlite'));
 const bridgeB={execAsync:async sql=>sqliteB.exec(sql),runAsync:async(sql,...args)=>sqliteB.prepare(sql).run(...params(args)),getFirstAsync:async(sql,...args)=>sqliteB.prepare(sql).get(...params(args))??null,getAllAsync:async(sql,...args)=>sqliteB.prepare(sql).all(...params(args)),withExclusiveTransactionAsync:async fn=>{sqliteB.exec('BEGIN IMMEDIATE');try{await fn(bridgeB);sqliteB.exec('COMMIT');}catch(e){sqliteB.exec('ROLLBACK');throw e;}}};
 await load('src/services/storage/database.ts').obtenerBaseDatos();sqliteB.exec(load('src/services/storage/cuentasSchema.ts').CUENTAS_CACHE_SQL);
 const {CompartidoPedidoRepository}=load('src/repositories/CompartidoPedidoRepository.ts');const a=new CompartidoPedidoRepository(async()=>bridge),b=new CompartidoPedidoRepository(async()=>bridgeB);
 const {establecerActorLocal}=load('src/services/SesionLocal.ts');const actor=id=>establecerActorLocal({id,nombre:id,rol:'mesero'});
 await iniciar();
 try{
  importarCatalogo(db,{ok:true,data:[{id:'pizzas',nombre:'Pizzas'},{id:'complementos',nombre:'Complementos'}]},{ok:true,data:[{id:'pizza',nombre:'Pizza compartida',categoria_id:'pizzas',tamanios:[{id:'v-pizza',tamanio_id:'mediana',tamanio:'Mediana',precio_base:'13.50'}]},{id:'papas',nombre:'Papas',categoria_id:'complementos',tamanios:[{id:'v-papas',tamanio_id:'porcion',tamanio:'Porcion',precio_base:20}]}]},'fixture-dos-celulares');
  for(const id of ['mesero-1','mesero-2'])db.prepare('INSERT INTO lan_meseros VALUES (?)').run(id);
  actor('mesero-1');let cuenta=await a.crearComanda(5,'mesero-1');actor('mesero-2');const misma=await b.crearComanda(5,'mesero-2');assert.equal(cuenta.id,misma.id);
  assert.equal((await b.listarComandasActivas())[0].mesaId,5);
  const item=(id,prod='pizza')=>({id,productoId:prod,productoTamanioId:'v-'+prod,tamanioId:prod==='pizza'?'mediana':'porcion',nombre:'No autoritativo',categoria:'x',cantidad:1,precioUnitario:0,subtotal:0,estado:'pendiente',observaciones:'Nota de linea'});
  actor('mesero-1');const viejo=await a.agregarProducto(cuenta.id,item('linea-A'),'mesero-1');
  actor('mesero-2');let visto=await b.obtenerPorId(cuenta.id);assert.equal(visto.productos.length,1);assert.equal(visto.total,13.5);assert.equal(visto.creadoPor,'mesero-1');
  await b.guardar({...visto,observaciones:'Nota del segundo mesero',productos:visto.productos.map(p=>({...p,cantidad:3}))});
  actor('mesero-1');await assert.rejects(a.guardar({...viejo,observaciones:'No debe sobrescribir'}),/Otro mesero/);
  visto=await a.obtenerPorId(cuenta.id);assert.equal(visto.productos[0].cantidad,3);assert.equal(visto.observaciones,'Nota del segundo mesero');assert.equal(visto.total,40.5);assert.ok(visto.historial.some(h=>h.usuarioId==='mesero-2'));
  await a.agregarProducto(cuenta.id,item('linea-B','papas'),'mesero-1');db.prepare('UPDATE lan_variantes SET precioCentavos=1450 WHERE id=?').run('v-pizza');
  db.exec("CREATE TRIGGER fallo_cuenta BEFORE INSERT ON cuenta_operaciones WHEN json_extract(NEW.contenido,'$.accion')='publicar' BEGIN SELECT RAISE(ABORT,'fallo-cuenta'); END");
  await assert.rejects(a.publicar(cuenta.id));assert.equal(db.prepare('SELECT count(*) n FROM pedidos').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM cocina_tickets').get().n,0);assert.ok((await a.obtenerPorId(cuenta.id)).productos.every(p=>!p.publicada));
  db.exec('DROP TRIGGER fallo_cuenta');const primerEnvio=await a.resolverPendiente(cuenta.id);assert.equal(primerEnvio.recibo.productos.length,2);assert.equal(primerEnvio.cuenta.total,primerEnvio.recibo.totalCentavos/100);assert.equal(primerEnvio.cuenta.productos[0].precioUnitario,14.5);
  const publicadaOp=(await a.operaciones(cuenta.id)).find(o=>JSON.parse(o.payload).accion==='publicar');
  const retry=await fetch(urlBase+'/api/local/cuentas/'+cuenta.id+'/operaciones',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:publicadaOp.payload});assert.equal(retry.status,200);assert.equal((await retry.json()).recibo.id,primerEnvio.recibo.id);assert.equal(db.prepare('SELECT count(*) n FROM pedidos').get().n,1);

  actor('mesero-2');visto=await b.obtenerPorId(cuenta.id);assert.ok(visto.productos.every(p=>p.publicada));await assert.rejects(b.guardar({...visto,productos:visto.productos.map(p=>({...p,cantidad:p.cantidad+1}))}),/enviada a cocina/);
  await b.agregarProducto(cuenta.id,item('linea-C'),'mesero-2');const segundo=await b.publicar(cuenta.id);assert.equal(segundo.recibo.productos.length,1);assert.equal(segundo.recibo.productos[0].lineaId,'linea-C');assert.equal(db.prepare('SELECT count(*) n FROM pedidos').get().n,2);
  // Respuesta perdida: el otro celular ve el cambio; el emisor concilia sin duplicarlo.
  const realFetch=global.fetch;let perder=true;global.fetch=async(...args)=>{const r=await realFetch(...args);if(perder&&String(args[0]).endsWith('/operaciones')&&args[1]?.method==='POST'){perder=false;throw new TypeError('Network request failed');}return r;};
  actor('mesero-1');try{await assert.rejects(a.agregarProducto(cuenta.id,item('linea-perdida'),'mesero-1'));}finally{global.fetch=realFetch;}
  actor('mesero-2');assert.ok((await b.obtenerPorId(cuenta.id)).productos.some(p=>p.id==='linea-perdida'));
  actor('mesero-1');visto=await a.obtenerPorId(cuenta.id);assert.equal(visto.productos.filter(p=>p.id==='linea-perdida').length,1);assert.ok((await a.operaciones(cuenta.id)).filter(o=>JSON.parse(o.payload).producto?.id==='linea-perdida').every(o=>o.estado==='CONFIRMADA'));
  assert.equal(sqlite.prepare('SELECT count(*) n FROM cuentas_cache').get().n,1);assert.equal(sqliteB.prepare('SELECT count(*) n FROM cuentas_cache').get().n,1);
  await parar();actor('mesero-2');const offline=await b.obtenerPorId(cuenta.id);assert.equal(offline.sinConexion,true);await assert.rejects(b.guardar(offline),/necesita conexion/);
  await iniciar();actor('mesero-1');assert.equal((await a.obtenerPorId(cuenta.id)).productos.length,4);assert.equal(db.prepare('SELECT count(*) n FROM pedidos').get().n,2);
  // Dos cambios diferentes sobre la misma version: uno se acepta y el otro recibe 409.
  const revision=(await a.obtenerPorId(cuenta.id)).revision;
  const enviar=async(n)=>{const r=await realFetch(urlBase+'/api/local/cuentas/'+cuenta.id+'/operaciones',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({operacionId:'simultanea-'+n,meseroId:'mesero-'+n,version:revision,accion:'agregar',producto:{id:'linea-sim-'+n,productoId:'pizza',productoTamanioId:'v-pizza',tamanioId:'mediana',cantidad:1,observaciones:'',estado:'pendiente'}})});return r.status;};
  assert.deepEqual((await Promise.all([enviar(1),enviar(2)])).sort(),[200,409]);
  console.log('Dos SQLite moviles aislados, una mesa compartida, conflicto seguro, publicacion incremental y recuperacion verificados.');
 }finally{await parar();sqlite.close();sqliteB.close();fs.rmSync(dir,{recursive:true,force:true});}
});
