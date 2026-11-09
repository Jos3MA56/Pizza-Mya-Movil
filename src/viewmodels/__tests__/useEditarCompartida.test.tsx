import React from 'react';
import {test,expect,jest} from '@jest/globals';
import {Text,Pressable} from 'react-native';
import {render,fireEvent,waitFor} from '@testing-library/react-native';
import {useEditarComandaViewModel} from '../useEditarComandaViewModel';
import type {PedidoRepository} from '../../repositories/PedidoRepository';
import type {Pedido} from '../../models/Pedido';
test('una edicion de otro mesero conserva el formulario y exige recarga explicita',async()=>{
 let actual:Pedido={id:'cuenta-test',compartida:true,estado:'borrador',mesaId:5,creadoPor:'mesero-1',revision:0,total:10,productos:[{id:'linea',productoId:'pizza',nombre:'Pizza',categoria:'Pizzas',cantidad:1,precioUnitario:10,subtotal:10,estado:'pendiente'}]};
 const guardar=jest.fn(async(_p:Pedido)=>undefined);
 const repo:PedidoRepository={obtenerPorId:async()=>JSON.parse(JSON.stringify(actual)),guardar,suscribir:()=>()=>{},obtenerComandaPorMesa:async()=>actual,listarComandasActivas:async()=>[actual],crearComanda:async()=>actual,agregarProducto:async()=>actual};
 function Vista(){const v=useEditarComandaViewModel(actual.id,'mesero-2',repo);return <><Text testID="cantidad">{String(v.cantidades.linea??'cargando')}</Text><Text>{v.error}</Text><Pressable onPress={()=>v.cambiarCantidad('linea',1)}><Text>Aumentar</Text></Pressable><Pressable onPress={()=>void v.guardarCambios()}><Text>Guardar</Text></Pressable><Pressable onPress={()=>void v.recargar()}><Text>Recargar</Text></Pressable></>;}
 const v=await render(<Vista/>);await waitFor(()=>expect(v.getByTestId('cantidad').props.children).toBe('1'));
 await fireEvent.press(v.getByText('Aumentar'));expect(v.getByTestId('cantidad').props.children).toBe('2');
 actual={...actual,revision:1,productos:actual.productos!.map(p=>({...p,cantidad:9}))};
 await fireEvent.press(v.getByText('Guardar'));await waitFor(()=>expect(v.getByText(/Otro mesero/)).toBeTruthy());expect(guardar).not.toHaveBeenCalled();expect(v.getByTestId('cantidad').props.children).toBe('2');
 await fireEvent.press(v.getByText('Recargar'));await waitFor(()=>expect(v.getByTestId('cantidad').props.children).toBe('9'));
},30000);
