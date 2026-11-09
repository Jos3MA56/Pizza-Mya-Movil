import {guardarConfiguracionPOS} from './PosLanConfig';
export function leerQRPOS(texto:string,ahora=Date.now()){
 let d:any;try{d=JSON.parse(texto);}catch{throw new Error('Este QR no pertenece al POS.');}
 if(d?.tipo!=='pizza-mya-pos'||d.version!==1||typeof d.urlBase!=='string'||!/^http:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):\d{1,5}$/.test(d.urlBase)||typeof d.codigo!=='string'||!/^[a-f0-9]{64}$/.test(d.codigo))throw new Error('QR de POS invalido.');
 const url=new URL(d.urlBase);if(Number(url.port)<1||Number(url.port)>65535||url.hostname.split('.').some(p=>Number(p)>255))throw new Error('Direccion LAN invalida.');
 if(!Number.isSafeInteger(d.venceEn)||d.venceEn<=ahora||d.venceEn>ahora+180000)throw new Error('QR vencido. Genera otro en Electron.');
 return d as {urlBase:string;codigo:string;venceEn:number};
}
export async function vincularDesdeQR(texto:string){
 const qr=leerQRPOS(texto),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  const r=await fetch(qr.urlBase+'/api/local/vinculacion/canjear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codigo:qr.codigo}),signal:controller.signal});
  const d=await r.json();if(!r.ok)throw new Error(d.error??'No se pudo vincular el POS.');
  if(d.versionContrato!==2||typeof d.token!=='string'||!/^[a-fA-F0-9]{64}$/.test(d.token))throw new Error('Respuesta de vinculacion invalida.');
  await guardarConfiguracionPOS({urlBase:qr.urlBase,token:d.token,vinculadaEn:new Date().toISOString()});
 }finally{clearTimeout(timer);}
}
