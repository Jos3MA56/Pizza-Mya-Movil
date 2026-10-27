const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {once}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
let config,rol='cocina';
function load(file,dependencies={}){
 const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',code)(name=>dependencies[name]??require(name),mod,mod.exports);return mod.exports;
}
const client=load('src/services/sync/PosLanClient.ts');
const cocina=load('src/services/CocinaPOSService.ts',{'./SesionLocal':{exigirActorLocal:()=>{if(rol!=='cocina')throw Error('Sesión no autorizada.');}},'./sync/PosLanConfig':{obtenerConfiguracionPOS:async()=>config},'./sync/PosLanClient':client});
const token='b'.repeat(64);
const ticket={id:'pedido-1',folio:'MYA-1',mesa:3,meseroId:'mesero-test',fecha:'2026-10-27T12:00:00Z',observaciones:'Juntas',cocinaEstado:'pendiente',cocinaVersion:5,estaciones:[{estacion:'pizzas',estado:'pendiente',version:2},{estacion:'complementos',estado:'en_preparacion',version:4}],productos:[{lineaId:'pizza',nombre:'Hawaiana',tamanio:'Mediana',categoriaId:'pizza',cantidad:2,observaciones:'Sin cortar',estacion:'pizzas'},{lineaId:'papas',nombre:'Papas',tamanio:'Porción',categoriaId:'papas',cantidad:1,observaciones:'Sin sal',estacion:'complementos'}]};
async function receptor(handler,run){
 const server=http.createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
 config={urlBase:`http://127.0.0.1:${server.address().port}`,token};rol='cocina';
 try{await run();}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}
test('consulta autenticada y separación conservan notas, tamaños y estado de cada estación',async()=>{
 const paths=[];
 await receptor((req,res)=>{assert.equal(req.headers.authorization,'Bearer '+token);paths.push(req.url);json(res,200,req.url.endsWith('/cocina')?{estacionesIndependientes:true,tickets:[ticket]}:{catalogo:{categorias:[{id:'pizza',nombre:'Pizzas'}]}});},async()=>{
  const r=await cocina.obtenerCocinaPOS();const p=cocina.ticketsPorEstacion(r.tickets,'pizzas')[0],c=cocina.ticketsPorEstacion(r.tickets,'complementos')[0];
  assert.equal(p.productos.length,1);assert.equal(p.productos[0].cantidad,2);assert.equal(p.productos[0].tamanio,'Mediana');assert.equal(p.productos[0].observaciones,'Sin cortar');assert.equal(p.observaciones,'Juntas');assert.equal(c.estadoEstacion,'en_preparacion');assert.equal(c.productos[0].observaciones,'Sin sal');
 });assert.deepEqual(paths.sort(),['/api/local/catalogo/v2','/api/local/cocina']);
});
test('PATCH envía únicamente la estación seleccionada y su versión',async()=>{
 const bodies=[];
 await receptor(async(req,res)=>{assert.equal(req.method,'PATCH');assert.equal(req.url,'/api/local/cocina/pedido-1');assert.equal(req.headers.authorization,'Bearer '+token);const chunks=[];for await(const b of req)chunks.push(b);bodies.push(JSON.parse(Buffer.concat(chunks)));json(res,200,{ok:true});},async()=>{await cocina.avanzarCocinaPOS(ticket,'pizzas');await cocina.avanzarCocinaPOS(ticket,'complementos');});
 assert.deepEqual(bodies,[{estacion:'pizzas',estado:'en_preparacion',version:2},{estacion:'complementos',estado:'listo',version:4}]);
});
test('sesión, configuración y estado final impiden solicitudes inválidas',async()=>{
 let requests=0;
 await receptor((req,res)=>{requests++;json(res,500,{});},async()=>{
  rol='mesero';await assert.rejects(cocina.obtenerCocinaPOS(),/no autorizada/);rol='cocina';
  const previous=config;config=null;await assert.rejects(cocina.obtenerCocinaPOS(),/Configura/);config=previous;
  await assert.rejects(cocina.avanzarCocinaPOS(ticket),/Selecciona/);
  await assert.rejects(cocina.avanzarCocinaPOS({...ticket,estaciones:[{estacion:'pizzas',estado:'listo',version:3}]},'pizzas'),/ya esta lista/);
 });assert.equal(requests,0);
});
test('rechaza receptor incompatible y propaga conflicto de versión',async()=>{
 await receptor((req,res)=>{if(req.method==='PATCH')json(res,409,{error:'La estación cambió; actualiza la comanda'});else json(res,200,req.url.endsWith('/cocina')?{estacionesIndependientes:false,tickets:[]}:{catalogo:{categorias:[]}});},async()=>{
  await assert.rejects(cocina.obtenerCocinaPOS(),/Reinicia/);
  await assert.rejects(cocina.avanzarCocinaPOS(ticket,'pizzas'),e=>e instanceof client.ErrorHTTPPOS&&e.status===409&&/estación cambió/.test(e.message));
 });
});
