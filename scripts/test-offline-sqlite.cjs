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
const cache = new Map();
function load(filename) {
  const resolved = path.resolve(root, filename.endsWith('.ts') ? filename : filename + '.ts');
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const mod = { exports: {} }; cache.set(resolved, mod);
  const code = ts.transpileModule(fs.readFileSync(resolved,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const customRequire = name => {
    if (name === 'expo-sqlite') return { openDatabaseAsync: async () => bridge };
    if (name === 'expo-crypto') return { randomUUID };
    if (name === 'expo-secure-store') return { getItemAsync: async () => null };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(resolved), name));
    return require(name);
  };
  new Function('require','module','exports',code)(customRequire,mod,mod.exports);
  return mod.exports;
}
const schema = fs.readFileSync(path.join(root,'src/services/storage/database.ts'),'utf8');
// Bootstrap actual v1 DDL, seed sync rows, then run the real v2 migrator.
sqlite.exec(schema.match(/await tx.execAsync\(`([\s\S]*?)`\);/)[1]);
sqlite.exec("PRAGMA user_version=1; INSERT INTO comandas_locales VALUES ('old',NULL,'9','m','PENDIENTE',NULL,'date','date'); INSERT INTO operaciones_pendientes(id_operacion,comanda_id,mesero_id,tipo,payload_json,creada_en) VALUES ('old-op','old','m','PRUEBA_LOCAL','{}','date');");
const { obtenerBaseDatos } = load('src/services/storage/database.ts');
const { SQLitePedidoRepository, serializarPedido } = load('src/repositories/SQLitePedidoRepository.ts');
const { establecerActorLocal } = load('src/services/SesionLocal.ts');
const { prepararComanda, listarSeguimiento } = load('src/services/FlujoComandaService.ts');
const { CachedCatalogoRepository } = load('src/repositories/CachedCatalogoRepository.ts');
const { HttpCatalogoRepository } = load('src/repositories/CatalogoRepository.ts');
const { DemoCocinaService } = load('src/services/DemoCocinaService.ts');
const mesero = { id:'m',nombre:'Mesero',rol:'mesero' };
const cook = { id:'c',nombre:'Cocina',rol:'cocina' };
const item = (id, variant) => ({ id,productoId:'original-uuid',productoTamanioId:variant,tamanioId:'size-'+variant,tamanio:variant,nombre:'Pizza',categoria:'Pizzas',cantidad:3,precioUnitario:10.01,subtotal:0,estado:'pendiente',observaciones:'Sin cebolla' });
let pedido;
test('Flujo integrado sobre SQLite real', async t => {
  await t.test('migración incremental conserva operaciones v1', async () => {
    await obtenerBaseDatos();
    assert.equal(sqlite.prepare('PRAGMA user_version').get().user_version,2);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM operaciones_pendientes').get().n,1);
    assert.equal(sqlite.prepare('SELECT mesa_id FROM comandas_locales WHERE id_local=?').get('old').mesa_id,'9');
  });
  establecerActorLocal(mesero);
  const repo = new SQLitePedidoRepository();
  await t.test('doble apertura concurrente conserva una comanda por mesa', async () => {
    const [a,b] = await Promise.all([repo.crearComanda(1,'m'),repo.crearComanda(1,'m')]);
    assert.equal(a.id,b.id); pedido=a;
  });
  await t.test('dos presentaciones, centavos, edición e historial sobreviven conexión nueva', async () => {
    await repo.agregarProducto(pedido.id,item('line1','mediana'),'m');
    pedido = await repo.agregarProducto(pedido.id,item('line2','grande'),'m');
    pedido.productos[0].cantidad=2; pedido.observaciones='Mesa sin sal';
    pedido.historial.push({ id:'edit',fecha:'2026-10-19',usuarioId:'m',accion:'editar_producto',descripcion:'Editar cantidades y notas' });
    await repo.guardar(pedido);
    sqlite.close(); sqlite = new DatabaseSync(file); sqlite.exec('PRAGMA foreign_keys=ON');
    const nuevo = await new SQLitePedidoRepository().obtenerPorId(pedido.id);
    assert.equal(nuevo.total,50.05); assert.equal(nuevo.productos[0].productoTamanioId,'mediana');
    assert.equal(nuevo.productos[1].tamanioId,'size-grande'); assert.equal(nuevo.historial.length,4);
    assert.equal(nuevo.observaciones,'Mesa sin sal');
    const stored=JSON.parse(sqlite.prepare('SELECT documento FROM pedidos_mvvm WHERE id=?').get(pedido.id).documento);
    assert.equal(stored.totalCentavos,5005); assert.equal(stored.productos[0].precioUnitario,undefined);
  });
  await t.test('fallo de escritura revierte transacción y no notifica', async () => {
    let avisos=0; const off=repo.suscribir(pedido.id,()=>avisos++);
    const antes=await repo.obtenerPorId(pedido.id);
    sqlite.exec("CREATE TRIGGER impedir BEFORE UPDATE ON pedidos_mvvm BEGIN SELECT RAISE(ABORT,'fallo'); END");
    await assert.rejects(repo.guardar({...antes,observaciones:'No guardar'}),/fallo/);
    sqlite.exec('DROP TRIGGER impedir');
    assert.equal((await repo.obtenerPorId(pedido.id)).observaciones,antes.observaciones); assert.equal(avisos,0); off();
  });
  await t.test('primera ejecución sin caché y respuesta inválida preserva último catálogo', async () => {
    let fail=true;
    const datos={categorias:[],productos:[]};
    const origen={obtener:async()=>{if(fail)throw new Error('Sin red');return datos;}};
    const cached=new CachedCatalogoRepository(origen);
    await assert.rejects(cached.obtener(),/Sin catálogo guardado/);
    fail=false;assert.deepEqual(await cached.obtener(),datos);fail=true;
    assert.deepEqual(await cached.obtener(),datos); assert.equal(cached.estado.guardado,true);
    const invalido=new CachedCatalogoRepository(new HttpCatalogoRepository({get:async()=>({data:{ok:true,data:[{id:'bad'}]}})}));
    assert.deepEqual(await invalido.obtener(),datos);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM catalogo_cache').get().n,1);
  });
  await t.test('preparación concurrente: instantánea bloqueada, UUID estable, rollback atómico', async () => {
    sqlite.exec("CREATE TRIGGER impedir_cola BEFORE INSERT ON operaciones_pendientes WHEN NEW.tipo='COMANDA_CREAR' BEGIN SELECT RAISE(ABORT,'fallo-cola'); END");
    await assert.rejects(prepararComanda(pedido.id),/fallo-cola/);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM preparaciones_mvvm').get().n,0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM comandas_locales WHERE id_local=?').get(pedido.id).n,0);
    sqlite.exec('DROP TRIGGER impedir_cola');
    await Promise.all([prepararComanda(pedido.id),prepararComanda(pedido.id)]);
    const ops=await listarSeguimiento();assert.equal(ops.length,1);assert.equal(ops[0].estado,'BLOQUEADA');assert.equal(ops[0].intentos,0);
    assert.match(ops[0].ultimo_error,/presentaciones/);assert.match(ops[0].ultimo_error,/observaciones/);
    const snap=sqlite.prepare('SELECT documento,request_id FROM preparaciones_mvvm').get();
    await assert.rejects(repo.guardar(pedido),/bloqueada/);
    await assert.rejects(repo.agregarProducto(pedido.id,item('another','x'),'m'),/bloqueada/);
    await prepararComanda(pedido.id);assert.equal((await listarSeguimiento())[0].id_operacion,snap.request_id);
    assert.equal(JSON.parse(snap.documento).productos.length,2);
  });
  await t.test('restricción por usuario y rol también en repositorio', async () => {
    establecerActorLocal({...mesero,id:'otro'});
    await assert.rejects(repo.obtenerPorId(pedido.id),/otro mesero/);
    await assert.rejects(repo.crearComanda(1,'otro'),/otro mesero/);
    assert.equal((await listarSeguimiento()).length,0);
    establecerActorLocal(cook);await assert.rejects(repo.listarComandasActivas(),/autorizada/);
    establecerActorLocal(mesero);
  });
  let clock=1000;const demo=new DemoCocinaService(undefined,()=>clock);
  await t.test('simulador: error, espera, confirmación perdida y conciliación sin duplicar', async () => {
    await Promise.all([demo.crear(pedido.id),demo.crear(pedido.id)]);
    let [envio]=await demo.listar();assert.equal((await demo.listar()).length,1);
    await demo.procesar(envio.id,'red');
    [envio]=await demo.listar();assert.equal(envio.estado,'ERROR_REINTENTABLE');
    await assert.rejects(demo.procesar(envio.id),/Espera/);clock+=5000;
    await demo.procesar(envio.id,'perder_respuesta');
    [envio]=await demo.listar();assert.equal(envio.estado,'RESULTADO_DESCONOCIDO');
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM cocina_demo').get().n,0);
    await demo.procesar(envio.id);[envio]=await demo.listar();assert.equal(envio.estado,'CONFIRMADA');assert.equal(envio.intentos,2);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM cocina_demo').get().n,1);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM demo_recibos').get().n,1);
  });
  await t.test('cocina: solo rol autorizado y transiciones persistidas sin retrocesos', async () => {
    await assert.rejects(demo.cocina(),/autorizada/);
    establecerActorLocal(cook);const [ticket]=await demo.cocina();
    await demo.avanzar(ticket.id,'pendiente');
    await assert.rejects(demo.avanzar(ticket.id,'pendiente'),/cambió/);
    await demo.avanzar(ticket.id,'en_preparacion');
    await assert.rejects(demo.avanzar(ticket.id,'listo'),/lista/);
    assert.equal((await new DemoCocinaService().cocina())[0].estado,'listo');
    establecerActorLocal(mesero);assert.equal((await demo.estadoCocina(ticket.id)).estado,'listo');
  });
  await t.test('simulador: rechazo, conflicto, timeout, 404 y límite de intentos', async () => {
    for(const [i,scenario,expected] of [[2,'rechazar','RECHAZADA'],[3,'conflicto','CONFLICTO'],[4,'timeout','RESULTADO_DESCONOCIDO'],[5,'red','ERROR_REINTENTABLE']]) {
      const order=await repo.crearComanda(i,'m');await repo.agregarProducto(order.id,item('x','v'),'m');await demo.crear(order.id);
      const e=(await demo.listar()).find(e=>e.origen===order.id);await demo.procesar(e.id,scenario);
      assert.equal((await demo.listar()).find(x=>x.id===e.id).estado,expected);
      if(scenario==='timeout') { await demo.procesar(e.id);assert.equal((await demo.listar()).find(x=>x.id===e.id).estado,'RESULTADO_DESCONOCIDO'); }
      if(scenario==='red') { for(let n=1;n<6;n++){clock+=300000;await demo.procesar(e.id,'red');}clock+=300000;await assert.rejects(demo.procesar(e.id),/Espera/); }
    }
  });
  await t.test('SyncService real con transporte inyectado: respuestas, concurrencia y conciliación', async () => {
    const { SyncService } = load('src/services/sync/SyncService.ts');
    const { ErrorHTTPPOS } = load('src/services/sync/PosLanClient.ts');
    const { recuperarEnviosInterrumpidos } = load('src/repositories/OperacionPendienteRepository.ts');
    const token='a'.repeat(64), url='http://pos.test:3000';
    function seed(suffix) {
      const id='fixture-'+suffix, op='request-'+suffix;
      sqlite.prepare("INSERT INTO comandas_locales(id_local,mesa_id,mesero_id,creada_en,actualizada_en) VALUES (?,'8','m','date','date')").run(id);
      sqlite.prepare("INSERT INTO comanda_items_locales(id_local,comanda_id,producto_id,nombre_producto,cantidad,precio_centavos) VALUES (?,?,'fixture-sku','Fixture',1,100)").run('item-'+suffix,id);
      const payload={requestId:op,mesa:8,meseroId:'m',productos:[{productoId:'fixture-sku',cantidad:1}]};
      sqlite.prepare("INSERT INTO operaciones_pendientes(id_operacion,comanda_id,mesero_id,tipo,payload_json,creada_en) VALUES (?,?,'m','COMANDA_CREAR',?,'date')").run(op,id,JSON.stringify(payload));
      return {id,op,payload};
    }
    for (const [suffix,error,expected] of [['reject',new ErrorHTTPPOS(422,'rechazo'),'RECHAZADA'],['conflict',new ErrorHTTPPOS(409,'conflicto'),'CONFLICTO'],['timeout',new Error('POS_TIMEOUT'),'RESULTADO_DESCONOCIDO'],['network',new TypeError('Network request failed'),'RESULTADO_DESCONOCIDO'],['retry',new ErrorHTTPPOS(429,'ocupado'),'ERROR_REINTENTABLE']]) {
      const f=seed(suffix);let sends=0;
      const service=new SyncService({enviar:async()=>{sends++;throw error;},consultar:async()=>null});
      await assert.rejects(service.enviarOperacionPOS(f.op,url,token));
      assert.equal(sqlite.prepare('SELECT estado FROM operaciones_pendientes WHERE id_operacion=?').get(f.op).estado,expected);
      if(expected==='RESULTADO_DESCONOCIDO') {
        assert.equal(await service.conciliarOperacionPOS(f.op,url,token),'NO_ENCONTRADA');
        await assert.rejects(service.enviarOperacionPOS(f.op,url,token),/Estado no disponible/);assert.equal(sends,1);
      }
    }
    const f=seed('lost');let release;const wait=new Promise(r=>{release=r;});
    const recibo={id:'remote-fixture',requestId:f.op,folio:'POS-FIXTURE',totalCentavos:123};
    const service=new SyncService({enviar:async()=>{await wait;throw new Error('lost-response');},consultar:async()=>({...recibo,...f.payload,id:recibo.id})});
    const first=service.enviarOperacionPOS(f.op,url,token);
    await assert.rejects(service.enviarOperacionPOS(f.op,url,token),/ejecución/);
    release();await assert.rejects(first);
    assert.equal(await service.conciliarOperacionPOS(f.op,url,token),'CONFIRMADA');
    const receipt=sqlite.prepare('SELECT * FROM comandas_locales WHERE id_local=?').get(f.id);
    assert.equal(receipt.id_servidor,'remote-fixture');assert.equal(receipt.folio_confirmado,'POS-FIXTURE');assert.equal(receipt.total_confirmado_centavos,123);
    const interrupted=seed('interrupted');sqlite.prepare("UPDATE operaciones_pendientes SET estado='ENVIANDO' WHERE id_operacion=?").run(interrupted.op);
    await recuperarEnviosInterrumpidos();assert.equal(sqlite.prepare('SELECT estado FROM operaciones_pendientes WHERE id_operacion=?').get(interrupted.op).estado,'RESULTADO_DESCONOCIDO');
    const success=seed('success');
    await new SyncService({enviar:async()=>({status:201,duplicado:false,pedido:{...recibo,requestId:success.op}}),consultar:async()=>null}).enviarOperacionPOS(success.op,url,token);
    assert.equal(sqlite.prepare('SELECT estado FROM operaciones_pendientes WHERE id_operacion=?').get(success.op).estado,'CONFIRMADA');
  });
  sqlite.close();fs.rmSync(dir,{recursive:true,force:true});
});
