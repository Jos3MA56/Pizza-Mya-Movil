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
test('preparacion SQLite movil -> SyncService -> HTTP -> SQLite POS -> cambio de perfil -> cocina real',async()=>{
 const pos=path.resolve(process.env.POS_REPO||path.join(root,'..'));
 const {openDatabase}=await import(pathToFileURL(path.join(pos,'server/src/database.js')));
 const {createService}=await import(pathToFileURL(path.join(pos,'server/src/app.js')));
 const {importarCatalogo}=await import(pathToFileURL(path.join(pos,'server/src/importar-catalogo.js')));
 const db=openDatabase(path.join(dir,'pos-test.sqlite'));
 const token='b'.repeat(64);const service=createService(db,{token,requireAuth:true});
 service.server.listen(0,'127.0.0.1');await once(service.server,'listening');const urlBase=`http://127.0.0.1:${service.server.address().port}`;
 try{
  let categorias={ok:true,data:[{id:'cat-test',nombre:'Pizzas',orden:1}]};
  let productos={ok:true,data:[{id:'prod-test',categoria_id:'cat-test',nombre:'Pizza fixture',tamanios:[{id:'var-test',tamanio_id:'size-test',tamanio:'Mediana',precio_base:'99.99'}]}]};
  let origen='fixture-aislado';
  if(process.env.LAN_TEST_LIVE_CATALOG==='1'){
   origen='https://pizza-mya-back.vercel.app';
   [categorias,productos]=await Promise.all(['categories','products'].map(async ruta=>{const r=await fetch(origen+'/api/'+ruta,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);return r.json();}));
  }
  const n=importarCatalogo(db,categorias,productos,origen);assert.ok(n>0);
  // Actor de prueba explicito: no inicia sesion ni registra pedidos en la nube.
  db.prepare('INSERT INTO lan_meseros VALUES (?)').run('mesero-integracion');
  const {establecerActorLocal}=load('src/services/SesionLocal.ts');
  establecerActorLocal({id:'mesero-integracion',nombre:'Mesero de pruebas',rol:'mesero'});
  const {guardarConfiguracionPOS}=load('src/services/sync/PosLanConfig.ts');await guardarConfiguracionPOS({urlBase,token});
  const {SQLitePedidoRepository}=load('src/repositories/SQLitePedidoRepository.ts');const repo=new SQLitePedidoRepository();
  let pedido=await repo.crearComanda(3,'mesero-integracion');
  const {HttpCatalogoRepository}=load('src/repositories/CatalogoRepository.ts');const catalogo=await new HttpCatalogoRepository().obtener();
  const producto=catalogo.productos.find(p=>p.tamanios.length);assert.ok(producto);
  const v=producto.tamanios[0];
  pedido=await repo.agregarProducto(pedido.id,{id:'linea-real',productoId:v.productoId??producto.id,productoTamanioId:v.id,tamanioId:v.tamanioId,tamanio:v.nombre,nombre:producto.nombre,categoria:catalogo.categorias.find(c=>c.id===producto.categoriaId).nombre,categoriaId:producto.categoriaId,cantidad:2,precioUnitario:v.precio,subtotal:0,estado:'pendiente',observaciones:'Sin cortar'},'mesero-integracion');
  pedido.observaciones='Prueba de cambio de perfil';await repo.guardar(pedido);
  const flujo=load('src/services/FlujoComandaService.ts');
  db.prepare('DELETE FROM lan_meseros WHERE id=?').run('mesero-integracion');
  await assert.rejects(flujo.prepararYEnviar(pedido.id),/Mesero no autorizado/);
  const [rechazada]=await flujo.listarSeguimiento();assert.equal(rechazada.estado,'RECHAZADA');assert.match(rechazada.ultimo_error,/HTTP_403: Mesero no autorizado/);
  const snapshot=sqlite.prepare('SELECT payload_json FROM operaciones_pendientes WHERE id_operacion=?').get(rechazada.id_operacion).payload_json;
  // Una configuracion que apunta al receptor viejo no rehabilita el rechazo.
  const viejo=require('node:http').createServer((_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({estado:'ok',version:1}));});
  viejo.listen(0,'127.0.0.1');await once(viejo,'listening');
  try{await guardarConfiguracionPOS({urlBase:`http://127.0.0.1:${viejo.address().port}`,token});await assert.rejects(flujo.reintentarSeguimiento(rechazada.id_operacion),/POS anterior/);assert.equal((await flujo.listarSeguimiento())[0].estado,'RECHAZADA');}
  finally{await new Promise(r=>viejo.close(r));}
  await guardarConfiguracionPOS({urlBase,token});db.prepare('INSERT INTO lan_meseros VALUES (?)').run('mesero-integracion');
  await flujo.reintentarSeguimiento(rechazada.id_operacion);
  let [op]=await flujo.listarSeguimiento();assert.equal(op.id_operacion,rechazada.id_operacion);assert.equal(op.intentos,2);assert.equal(sqlite.prepare('SELECT payload_json FROM operaciones_pendientes WHERE id_operacion=?').get(op.id_operacion).payload_json,snapshot);
assert.equal(op.estado,'CONFIRMADA');assert.match(op.folio_confirmado,/^MYA-/);
  const local=sqlite.prepare('SELECT * FROM operaciones_pendientes WHERE id_operacion=?').get(op.id_operacion);const payload=JSON.parse(local.payload_json);
  assert.equal(payload.productos[0].productoTamanioId,v.id);assert.equal(op.total_confirmado_centavos,Math.round(v.precio*100)*2);
  const client=load('src/services/sync/PosLanClient.ts');await client.enviarPedidoPOS({urlBase,token,payload});
  const pedidos=await (await fetch(urlBase+'/api/local/pedidos',{headers:{Authorization:'Bearer '+token}})).json();assert.equal(pedidos.pedidos.length,1);assert.equal(pedidos.pedidos[0].observaciones,pedido.observaciones);
  // Cerrar la sesion cambia el actor, sin borrar la cola ni SecureStore LAN.
  establecerActorLocal(null);establecerActorLocal({id:'cocina-integracion',nombre:'Cocina de pruebas',rol:'cocina'});
  const cocina=load('src/services/CocinaPOSService.ts');let tablero=await cocina.obtenerCocinaPOS();assert.equal(tablero.tickets.length,1);
  const ticket=tablero.tickets[0];assert.equal(ticket.folio,op.folio_confirmado);assert.equal(ticket.productos[0].observaciones,'Sin cortar');assert.equal(ticket.productos[0].cantidad,2);
  await cocina.avanzarCocinaPOS(ticket);tablero=await cocina.obtenerCocinaPOS();assert.equal(tablero.tickets[0].cocinaEstado,'en_preparacion');
  assert.equal(db.prepare('SELECT count(*) n FROM cocina_tickets').get().n,1);
  console.log(`Catalogo: ${origen}; ${n} presentaciones verificadas; un pedido POS y un ticket de cocina.`);
 }finally{for(const c of service.sockets.clients)c.terminate();await new Promise(r=>service.sockets.close(r));await new Promise(r=>service.server.close(r));db.close();sqlite.close();fs.rmSync(dir,{recursive:true,force:true});}
});
