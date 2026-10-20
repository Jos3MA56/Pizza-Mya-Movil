import type {SQLiteDatabase} from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type {Pedido,ProductoComanda} from '../models/Pedido';
import type {PedidoRepository,ObservadorPedido} from './PedidoRepository';
import {SQLitePedidoRepository} from './SQLitePedidoRepository';
import {obtenerBaseDatos,transaccionLocal} from '../services/storage/database';
import {obtenerConfiguracionPOS} from '../services/sync/PosLanConfig';
import {solicitudPOS,ErrorHTTPPOS} from '../services/sync/PosLanClient';
import {exigirActorLocal} from '../services/SesionLocal';
import {PedidoSubject} from '../observers/PedidoSubject';
const minimo=(p:ProductoComanda)=>({id:p.id,productoId:p.productoId,productoTamanioId:p.productoTamanioId,tamanioId:p.tamanioId,cantidad:p.cantidad,observaciones:p.observaciones??'',estado:p.estado});
export interface CambioCompartido {operacionId:string;cuentaId:string;payload:string;estado:string;resultado:string|null;error:string|null;fecha:string}
export class CompartidoPedidoRepository implements PedidoRepository{
 private local=new SQLitePedidoRepository();private eventos=new PedidoSubject();private ocupado=false;
 constructor(private base:()=>Promise<SQLiteDatabase>=obtenerBaseDatos){}
 private async api(ruta:string,body?:unknown){const c=await obtenerConfiguracionPOS();if(!c)throw new Error('Vincula este telefono con el POS desde Perfil.');const r=await solicitudPOS(c.urlBase,c.token,'/cuentas'+ruta,body?{method:'POST',body:JSON.stringify(body)}:{});return r?.data??null;}
 private async cache(p:Pedido){const db=await this.base();await transaccionLocal(db,async tx=>{await tx.runAsync("INSERT INTO cuentas_cache VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET documento=excluded.documento WHERE json_extract(excluded.documento,'$.revision')>=json_extract(cuentas_cache.documento,'$.revision')",p.id,p.mesaId!,JSON.stringify(p));});const actual=await db.getFirstAsync<{documento:string}>('SELECT documento FROM cuentas_cache WHERE id=?',p.id);const ultimo=actual?JSON.parse(actual.documento) as Pedido:p;this.eventos.notificar(ultimo);return ultimo;}
 private async ultima(id:string){return (await this.base()).getFirstAsync<CambioCompartido>("SELECT * FROM cuentas_cola WHERE cuentaId=? AND estado IN ('ENVIANDO','RESULTADO_DESCONOCIDO') ORDER BY fecha LIMIT 1",id);}
 private async confirmar(op:string,resultado:any){await (await this.base()).runAsync("UPDATE cuentas_cola SET estado='CONFIRMADA',resultado=?,error=NULL WHERE operacionId=?",JSON.stringify(resultado),op);await this.cache(resultado.cuenta);return resultado;}
 private async conciliar(id:string,bloquear=false){const op=await this.ultima(id);if(!op)return;const r=await this.api(`/${id}/operaciones/${op.operacionId}`);if(r)await this.confirmar(op.operacionId,r);else if(bloquear)throw new Error('Hay un cambio sin confirmar. Abre Seguimiento y resuelve la operacion antes de editar.');}
 private async enviar(op:CambioCompartido){try{const r=await this.api(`/${op.cuentaId}/operaciones`,JSON.parse(op.payload));return await this.confirmar(op.operacionId,r);}catch(e){const definitivo=e instanceof ErrorHTTPPOS&&e.status>=400&&e.status<500&&e.status!==408;await (await this.base()).runAsync('UPDATE cuentas_cola SET estado=?,error=? WHERE operacionId=?',definitivo?(e.status===409?'CONFLICTO':'RECHAZADA'):'RESULTADO_DESCONOCIDO',e instanceof Error?e.message:'Resultado pendiente',op.operacionId);throw e;}}
 private async mutar(id:string,version:number,accion:string,datos:object={}){
  const actor=exigirActorLocal('mesero');if(this.ocupado)throw new Error('Espera a que termine el cambio actual.');this.ocupado=true;
  try{await this.conciliar(id,true);const body={operacionId:Crypto.randomUUID(),meseroId:actor.id,version,accion,...datos};const op:CambioCompartido={operacionId:body.operacionId,cuentaId:id,payload:JSON.stringify(body),estado:'ENVIANDO',resultado:null,error:null,fecha:new Date().toISOString()};await (await this.base()).runAsync('INSERT INTO cuentas_cola VALUES (?,?,?,?,?,?,?)',op.operacionId,id,op.payload,op.estado,null,null,op.fecha);return await this.enviar(op);}finally{this.ocupado=false;}
 }
 async obtenerPorId(id:string):Promise<Pedido|null>{
  exigirActorLocal('mesero');if(!id.startsWith('cuenta-'))return this.local.obtenerPorId(id);
  try{await this.conciliar(id);const r=await this.api('/'+id);return r?.cuenta?this.cache(r.cuenta):null;}
  catch(e){if(e instanceof ErrorHTTPPOS&&e.status<500)throw e;const row=await (await this.base()).getFirstAsync<{documento:string}>('SELECT documento FROM cuentas_cache WHERE id=?',id);if(!row)throw e;return {...JSON.parse(row.documento),sinConexion:true};}
 }
 async listarComandasActivas():Promise<Pedido[]>{
  exigirActorLocal('mesero');if(!await obtenerConfiguracionPOS())return this.local.listarComandasActivas();
  try{const r=await this.api('');if(!r?.cuentasCompartidas||!Array.isArray(r.cuentas))throw new Error('Reinicia el servidor POS para habilitar mesas compartidas.');const actuales:Pedido[]=[];for(const p of r.cuentas)actuales.push(await this.cache(p));return actuales;}
  catch(e){if(e instanceof ErrorHTTPPOS&&e.status<500)throw e;const filas=await (await this.base()).getAllAsync<{documento:string}>('SELECT documento FROM cuentas_cache ORDER BY mesa');if(!filas.length)throw e;return filas.map(f=>({...JSON.parse(f.documento),sinConexion:true}));}
 }
 async crearComanda(mesaId:number,usuarioId:string){
  if(exigirActorLocal('mesero').id!==usuarioId)throw new Error('Mesero no autorizado.');if(!await obtenerConfiguracionPOS())return this.local.crearComanda(mesaId,usuarioId);
  const r=await this.api('/mesa/'+mesaId,{meseroId:usuarioId});return this.cache(r.cuenta);
 }
 async obtenerComandaPorMesa(mesa:number){return (await this.listarComandasActivas()).find(p=>p.mesaId===mesa)??null;}
 async guardar(p:Pedido){if(!p.compartida)return this.local.guardar(p);if(p.sinConexion||p.estado!=='borrador')throw new Error('La cuenta compartida necesita conexion y no puede cerrarse desde esta pantalla.');await this.mutar(p.id,p.revision!,'guardar',{productos:(p.productos??[]).map(minimo),observaciones:p.observaciones??''});}
 async agregarProducto(id:string,producto:ProductoComanda,usuarioId:string){
  if(exigirActorLocal('mesero').id!==usuarioId)throw new Error('Mesero no autorizado.');if(!id.startsWith('cuenta-'))return this.local.agregarProducto(id,producto,usuarioId);
  const p=await this.obtenerPorId(id);if(!p||p.sinConexion)throw new Error('Conecta con el POS antes de modificar una cuenta compartida.');return (await this.mutar(id,p.revision!,'agregar',{producto:minimo(producto)})).cuenta as Pedido;
 }
 suscribir(id:string,fn:ObservadorPedido){return id.startsWith('cuenta-')?this.eventos.suscribir(id,fn):this.local.suscribir(id,fn);}
 async publicar(id:string){const p=await this.obtenerPorId(id);if(!p||p.sinConexion)throw new Error('Conecta con el POS para enviar los productos nuevos.');return this.mutar(id,p.revision!,'publicar');}
 async operaciones(id:string){exigirActorLocal('mesero');return (await this.base()).getAllAsync<CambioCompartido>('SELECT * FROM cuentas_cola WHERE cuentaId=? ORDER BY fecha DESC',id);}
 async resolverPendiente(id:string){
  const actor=exigirActorLocal('mesero');if(this.ocupado)throw new Error('Espera la operacion actual.');this.ocupado=true;
  try{const op=await this.ultima(id);if(!op)return;const r=await this.api(`/${id}/operaciones/${op.operacionId}`);if(r)return this.confirmar(op.operacionId,r);if(JSON.parse(op.payload).meseroId!==actor.id)throw new Error('Para reintentar este cambio inicia sesion con el mesero que lo realizo.');return this.enviar(op);}finally{this.ocupado=false;}
 }
}
export const cuentasCompartidas=new CompartidoPedidoRepository();
