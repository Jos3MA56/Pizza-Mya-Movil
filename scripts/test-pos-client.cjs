// Verifica el cliente móvil contra un receptor HTTP aislado, sin depender del repositorio POS.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {once}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file){
 const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',code)(require,mod,mod.exports);return mod.exports;
}
const {enviarPedidoPOS,consultarPedidoPOS,ErrorHTTPPOS,contenidoPOS}=load('src/services/sync/PosLanClient.ts');
const {crearPayloadPOS}=load('src/services/sync/CrearPayloadPOS.ts');
const token='a'.repeat(64);
const pedido={id:'comanda',mesaId:3,creadoPor:'mesero',total:300,observaciones:'Llevar juntas',productos:[{id:'linea',productoId:'producto',productoTamanioId:'presentacion',tamanioId:'mediana',cantidad:2,observaciones:'Sin cebolla',estado:'pendiente'},{id:'cancelada',estado:'cancelado'}]};
const payload=()=>crearPayloadPOS(pedido,'request-prueba-01');
async function receptor(handler,run){
 const server=http.createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
 try{await run(`http://127.0.0.1:${server.address().port}`);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
test('conserva identificadores de línea, producto, tamaño, notas y total; excluye cancelados',()=>{
 const p=payload();assert.equal(p.productos.length,1);assert.equal(p.totalLocalCentavos,30000);
 assert.deepEqual(p.productos[0],{lineaId:'linea',productoId:'producto',productoTamanioId:'presentacion',tamanioId:'mediana',cantidad:2,observaciones:'Sin cebolla'});
 assert.equal(p.observaciones,'Llevar juntas');assert.throws(()=>crearPayloadPOS({...pedido,mesaId:null},'request-prueba-01'));
 assert.throws(()=>crearPayloadPOS({...pedido,productos:[{...pedido.productos[0],productoTamanioId:''}]},'request-prueba-01'));
});
test('envía por HTTP con Bearer, confirma recibo y repite el mismo contenido sin cambiar requestId',async()=>{
 const received=[];
 await receptor(async(req,res)=>{
  assert.equal(req.headers.authorization,'Bearer '+token);
  const chunks=[];for await(const b of req)chunks.push(b);
  const data=JSON.parse(Buffer.concat(chunks));received.push(data);
  const duplicado=received.length>1;
  res.writeHead(duplicado?200:201,{'Content-Type':'application/json'});
  res.end(JSON.stringify({duplicado,pedido:{id:'remoto',requestId:data.requestId,folio:'MYA-1',totalCentavos:30000,contenido:data}}));
 },async urlBase=>{
  assert.equal((await enviarPedidoPOS({urlBase,token,payload:payload()})).duplicado,false);
  assert.equal((await enviarPedidoPOS({urlBase,token,payload:payload()})).duplicado,true);
 });
 assert.deepEqual(received[0],received[1]);assert.equal(received[0].productos[0].observaciones,'Sin cebolla');
});
test('rechaza una confirmación que cambia notas aunque conserve los IDs',async()=>{
 await receptor(async(req,res)=>{
  for await(const b of req){};
  const contenido={...payload(),observaciones:'Otra nota'};
  res.writeHead(201,{'Content-Type':'application/json'});res.end(JSON.stringify({duplicado:false,pedido:{id:'remoto',requestId:contenido.requestId,folio:'MYA-1',totalCentavos:30000,contenido}}));
 },async urlBase=>assert.rejects(enviarPedidoPOS({urlBase,token,payload:payload()}),/no coincide/));
 assert.notEqual(contenidoPOS(payload()),contenidoPOS({...payload(),observaciones:'Otra nota'}));
});
test('propaga el motivo HTTP 403 y distingue una consulta sin recibo',async()=>{
 await receptor((req,res)=>{
  res.writeHead(req.method==='POST'?403:404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Mesero no autorizado'}));
 },async urlBase=>{
  await assert.rejects(enviarPedidoPOS({urlBase,token,payload:payload()}),e=>e instanceof ErrorHTTPPOS&&e.status===403&&/Mesero no autorizado/.test(e.message));
  assert.equal(await consultarPedidoPOS({urlBase,token,requestId:'request-prueba-01'}),null);
 });
});
