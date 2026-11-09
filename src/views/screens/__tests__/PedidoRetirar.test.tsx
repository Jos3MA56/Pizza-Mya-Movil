import React from 'react';
import {test,expect,jest,beforeEach} from '@jest/globals';
import {render,fireEvent,waitFor} from '@testing-library/react-native';
import {PedidoResumenScreen} from '../PedidoResumenScreen';
import {usePedidoResumenViewModel} from '../../../viewmodels/usePedidoResumenViewModel';
import type {Pedido} from '../../../models/Pedido';
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:require('react-native').View}));
jest.mock('../CatalogoScreen',()=>({CatalogoScreen:()=>null}));
jest.mock('../../../viewmodels/usePedidoResumenViewModel',()=>({usePedidoResumenViewModel:jest.fn()}));
let actual:Pedido;
const guardarNota=jest.fn<(id:string,nota:string,revision?:number)=>Promise<Pedido>>();
const retirar=jest.fn<(id:string,motivo?:string,revision?:number)=>Promise<boolean>>();
beforeEach(()=>{
 jest.clearAllMocks();guardarNota.mockReset();actual={id:'cuenta-prueba',compartida:true,estado:'borrador',mesaId:5,revision:2,total:370,productos:[{id:'pizza',productoId:'hawaiana',nombre:'Hawaiana',categoria:'Pizzas',cantidad:2,precioUnitario:185,subtotal:370,estado:'pendiente'}]};
 guardarNota.mockImplementation(async(id,nota)=>{actual={...actual,revision:(actual.revision??0)+1,productos:actual.productos!.map(p=>p.id===id?{...p,observaciones:nota}:p)};return actual;});
 retirar.mockImplementation(async()=>{actual={...actual,total:0,productos:actual.productos!.map(p=>({...p,estado:'cancelado'}))};return true;});
 jest.mocked(usePedidoResumenViewModel).mockImplementation(()=>({pedido:actual,guardarNota,guardandoNota:null,cargando:false,error:null,errorAccion:null,retirando:null,retirarProducto:retirar,limpiarErrorAccion:jest.fn(),totalFormateado:'$'+actual.total.toFixed(2),titulo:'Comanda',estado:'borrador',marcarEstado:jest.fn<()=>Promise<void>>() }));
});
async function abrir(){const v=await render(<PedidoResumenScreen pedidoId={actual.id} onRegresar={jest.fn()} onEditarComanda={jest.fn()}/>);await fireEvent.press(v.getByRole('tab',{name:/Mi pedido/}));return v;}
test('antes de enviar confirma retiro sin motivo y actualiza precio y lista',async()=>{
 const v=await abrir();await fireEvent.press(v.getByRole('button',{name:'Quitar Hawaiana'}));
 expect(v.queryByLabelText('Motivo de cancelación')).toBeNull();
 await fireEvent.press(v.getByRole('button',{name:'Confirmar retiro'}));
 await waitFor(()=>expect(v.getByText('$0.00')).toBeTruthy());expect(retirar).toHaveBeenCalledWith('pizza',undefined,2);expect(v.queryByText('Hawaiana')).toBeNull();
});
test('en cocina pendiente exige motivo y conserva el formulario si el POS rechaza',async()=>{
 actual.productos![0]={...actual.productos![0],publicada:true,estadoCocina:'pendiente'};retirar.mockResolvedValue(false);
 const v=await abrir();await fireEvent.press(v.getByRole('button',{name:'Cancelar Hawaiana'}));
 await fireEvent.press(v.getByRole('button',{name:'Confirmar cancelación'}));expect(retirar).not.toHaveBeenCalled();
 await fireEvent.changeText(v.getByLabelText('Motivo de cancelación'),'Cliente cambió de opinión');
 await fireEvent.press(v.getByRole('button',{name:'Confirmar cancelación'}));
 expect(retirar).toHaveBeenCalledWith('pizza','Cliente cambió de opinión',2);expect(v.getByLabelText('Motivo de cancelación').props.value).toBe('Cliente cambió de opinión');expect(actual.total).toBe(370);
});
test('no ofrece cancelación cuando ya inició preparación',async()=>{
 actual.productos![0]={...actual.productos![0],publicada:true,estadoCocina:'en_preparacion'};
 const v=await abrir();expect(v.queryByRole('button',{name:'Cancelar Hawaiana'})).toBeNull();expect(v.getByText('Preparación iniciada: ya no se puede cancelar aquí.')).toBeTruthy();
});

test('guarda una nota en su producto, conserva el total y bloquea enviar mientras hay texto pendiente',async()=>{
 const v=await abrir();await fireEvent.changeText(v.getByTestId('nota-producto-pizza'),'Sin tocino');
 expect(v.getByRole('button',{name:'Preparar / seguimiento'}).props.accessibilityState.disabled).toBe(true);
 await fireEvent.press(v.getByRole('button',{name:'Guardar nota de Hawaiana'}));
 await waitFor(()=>expect(guardarNota).toHaveBeenCalledWith('pizza','Sin tocino',2));expect(actual.total).toBe(370);expect(v.getByTestId('nota-producto-pizza').props.value).toBe('Sin tocino');
 expect(v.getByRole('button',{name:'Preparar / seguimiento'}).props.accessibilityState.disabled).toBe(false);
});
test('conserva el texto si falla el guardado; una nota publicada se consulta sin editar',async()=>{
 guardarNota.mockRejectedValue(new Error('La comanda cambió'));
 const v=await abrir();await fireEvent.changeText(v.getByTestId('nota-producto-pizza'),'Sin piña');await fireEvent.press(v.getByRole('button',{name:'Guardar nota de Hawaiana'}));
 await waitFor(()=>expect(v.getByText('La comanda cambió')).toBeTruthy());expect(v.getByTestId('nota-producto-pizza').props.value).toBe('Sin piña');
 await v.unmount();actual.productos![0]={...actual.productos![0],publicada:true,observaciones:'Sin tocino'};
 const otra=await abrir();expect(otra.getByTestId('nota-producto-pizza').props.editable).toBe(false);expect(otra.getByTestId('nota-producto-pizza').props.value).toBe('Sin tocino');
});
test('permite guardar notas de dos productos consecutivamente con la nueva revisión',async()=>{
 actual.productos!.push({...actual.productos![0],id:'segunda',nombre:'Pepperoni'});
 const v=await abrir();await fireEvent.changeText(v.getByTestId('nota-producto-pizza'),'Sin tocino');await fireEvent.changeText(v.getByTestId('nota-producto-segunda'),'Bien cocida');
 await fireEvent.press(v.getByRole('button',{name:'Guardar nota de Hawaiana'}));await waitFor(()=>expect(actual.revision).toBe(3));
 await fireEvent.press(v.getByRole('button',{name:'Guardar nota de Pepperoni'}));await waitFor(()=>expect(guardarNota).toHaveBeenCalledWith('segunda','Bien cocida',3));
});
