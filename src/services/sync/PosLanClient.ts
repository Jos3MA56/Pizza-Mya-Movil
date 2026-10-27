export interface ProductoPedidoPOS { productoId: string; cantidad: number; lineaId?: string; productoTamanioId?: string; tamanioId?: string; observaciones?: string }
export interface PayloadPedidoPOS { versionContrato?: 2; requestId: string; comandaLocalId?: string; mesa: number; meseroId: string; observaciones?: string; totalLocalCentavos?: number; productos: ProductoPedidoPOS[] }
export interface PedidoConfirmadoPOS { id: string; requestId: string; folio: string; totalCentavos: number; contenido?: PayloadPedidoPOS; cocinaEstado?: string }
export interface PedidoConsultadoPOS extends PedidoConfirmadoPOS { mesa: number; meseroId: string; productos: ProductoPedidoPOS[] }
export interface ResultadoEnvioPOS { status: 200 | 201; duplicado: boolean; pedido: PedidoConfirmadoPOS }
export class ErrorHTTPPOS extends Error { constructor(public readonly status:number,mensaje:string){super(mensaje);this.name='ErrorHTTPPOS';} }
export function contenidoPOS(p: PayloadPedidoPOS): string {
 return JSON.stringify({versionContrato:p.versionContrato,requestId:p.requestId,comandaLocalId:p.comandaLocalId,mesa:p.mesa,meseroId:p.meseroId,observaciones:p.observaciones??'',totalLocalCentavos:p.totalLocalCentavos,productos:p.productos.map(i=>({lineaId:i.lineaId,productoId:i.productoId,productoTamanioId:i.productoTamanioId,tamanioId:i.tamanioId,cantidad:i.cantidad,observaciones:i.observaciones??''})).sort((a,b)=>(a.lineaId??a.productoId).localeCompare(b.lineaId??b.productoId))});
}
export async function solicitudPOS(urlBase:string,token:string,ruta:string,init:RequestInit={}):Promise<any>{
 if(!/^https?:\/\//.test(urlBase)||!/^[a-fA-F0-9]{64}$/.test(token))throw new Error('Configuración LAN inválida.');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
 try{
  const r=await fetch(`${urlBase.replace(/\/+$/,'')}/api/local${ruta}`,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...init.headers},signal:controller.signal});
  if(r.status===404&&init.method!=='POST'&&init.method!=='PATCH')return null;
  const data=await r.json();if(!r.ok)throw new ErrorHTTPPOS(r.status,data?.error??`Error HTTP ${r.status}`);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Respuesta POS inválida.');
  return {data,status:r.status};
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('POS_TIMEOUT');throw e;}finally{clearTimeout(timer);}
}
function validarRecibo(p:any,requestId:string){
 if(!p||typeof p.id!=='string'||!p.id.trim()||p.requestId!==requestId||typeof p.folio!=='string'||!p.folio.trim()||!Number.isSafeInteger(p.totalCentavos)||p.totalCentavos<0)throw new Error('Confirmación POS inválida.');
}
export async function enviarPedidoPOS({urlBase,token,payload}:{urlBase:string;token:string;payload:PayloadPedidoPOS}):Promise<ResultadoEnvioPOS>{
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(payload.requestId)||!Number.isInteger(payload.mesa)||payload.mesa<1||!payload.meseroId?.trim()||!Array.isArray(payload.productos)||payload.productos.length<1||payload.productos.length>50)throw new Error('Comanda inválida.');
 const ids=new Set();for(const p of payload.productos){const id=p.lineaId??p.productoId;if(!p.productoId?.trim()||!Number.isInteger(p.cantidad)||p.cantidad<1||p.cantidad>99||ids.has(id))throw new Error('Productos inválidos.');ids.add(id);}
 const r=await solicitudPOS(urlBase,token,'/pedidos',{method:'POST',body:JSON.stringify(payload)});const d=r.data;
 if(![200,201].includes(r.status)||typeof d.duplicado!=='boolean'||d.duplicado!==(r.status===200))throw new Error('Respuesta de idempotencia inesperada.');
 validarRecibo(d.pedido,payload.requestId);
 if(payload.versionContrato===2&&(!d.pedido.contenido||contenidoPOS(d.pedido.contenido)!==contenidoPOS(payload)))throw new Error('El recibo no coincide con la comanda completa.');
 return {status:r.status,duplicado:d.duplicado,pedido:d.pedido};
}
export async function consultarPedidoPOS({urlBase,token,requestId}:{urlBase:string;token:string;requestId:string}):Promise<PedidoConsultadoPOS|null>{
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId))throw new Error('RequestId inválido.');
 const r=await solicitudPOS(urlBase,token,`/pedidos/por-request/${encodeURIComponent(requestId)}`);if(!r)return null;
 const p=r.data.pedido;validarRecibo(p,requestId);
 if(!Number.isInteger(p.mesa)||typeof p.meseroId!=='string'||!Array.isArray(p.productos)||!p.productos.length||!p.productos.every((i:any)=>typeof i.productoId==='string'&&Number.isInteger(i.cantidad)&&i.cantidad>0))throw new Error('Pedido consultado inválido.');
 return p;
}
