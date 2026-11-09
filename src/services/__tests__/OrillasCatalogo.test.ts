import {describe, test, expect} from '@jest/globals';
import {agregarProductoCatalogo} from '../AgregarProductoCatalogo';
import {InMemoryPedidoRepository} from '../../repositories/InMemoryPedidoRepository';
import {crearPayloadPOS} from '../sync/CrearPayloadPOS';
import {contenidoPOS} from '../sync/PosLanClient';

const orilla={id:'deditos',nombre:'Deditos de queso',precios:[{tamanioId:'mediana',precio:50},{tamanioId:'jumbo',precio:100}]};
const pizza={id:'pizza',nombre:'Hawaiana',categoriaId:'pizzas',descripcion:'',tamanios:[{id:'md',tamanioId:'mediana',nombre:'Mediana',precio:150},{id:'jb',tamanioId:'jumbo',nombre:'Jumbo',precio:250}]};
describe('Orillas en catálogo móvil',()=>{
 test.each<[string,number]>([['md',200],['jb',350]])('cobra precio y orilla por pizza en %s',async(variante,precio)=>{
  const repo=new InMemoryPedidoRepository();const p=await repo.crearComanda(1,'mesero');
  const actual=await agregarProductoCatalogo(repo,p.id,'mesero',pizza,'Pizzas',variante,2,'linea',orilla);
  expect(actual.total).toBe(precio*2);
  expect(actual.productos?.[0]).toMatchObject({orillaId:'deditos',orillaNombre:'Deditos de queso',precioUnitario:precio});
  const payload=crearPayloadPOS(actual,'solicitud-orillas');
  expect(payload.productos[0].orillaId).toBe('deditos');
  expect(contenidoPOS(payload)).not.toBe(contenidoPOS({...payload,productos:[{...payload.productos[0],orillaId:undefined}]}));
 });
 test('sin tarifa no agrega la pizza y no trata la ausencia como gratis',async()=>{
  const repo=new InMemoryPedidoRepository();const p=await repo.crearComanda(1,'mesero');
  await expect(agregarProductoCatalogo(repo,p.id,'mesero',pizza,'Pizzas','md',1,'linea',{...orilla,precios:[]})).rejects.toThrow('Orilla');
  expect((await repo.obtenerPorId(p.id))?.productos).toEqual([]);
 });
 test('sin orilla conserva el precio base',async()=>{
  const repo=new InMemoryPedidoRepository();const p=await repo.crearComanda(1,'mesero');
  const actual=await agregarProductoCatalogo(repo,p.id,'mesero',pizza,'Pizzas','md',1,'linea');
  expect(actual.total).toBe(150);expect(actual.productos?.[0].orillaId).toBeUndefined();
 });
});
