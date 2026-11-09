import {test,expect,jest,beforeEach} from '@jest/globals';
import {leerEstacionCocina,guardarEstacionCocina} from '../../../services/EstacionCocinaDispositivo';
jest.mock('../../../services/EstacionCocinaDispositivo',()=>({leerEstacionCocina:jest.fn(),guardarEstacionCocina:jest.fn()}));
import React from 'react';

import {render,fireEvent,waitFor} from '@testing-library/react-native';
import {CocinaHomeScreen} from '../CocinaHomeScreen';
import {obtenerCocinaPOS,avanzarRenglonCocina,ticketsPorEstacion,type TicketPOS} from '../../../services/CocinaPOSService';
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native',()=>({useNavigation:()=>({navigate:jest.fn()})}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:require('react-native').View}));
jest.mock('../../../context/AuthContext',()=>({useAuth:()=>({usuario:{id:'cocina-test',nombre:'Cocina',rol:'cocina'},cerrarSesion:jest.fn()})}));
jest.mock('../../../viewmodels/usePosLanConfigViewModel',()=>({usePosLanConfigViewModel:()=>({urlBase:'http://pos.test:3101',token:'',mensaje:'Configura el POS',procesando:false,setUrlBase:jest.fn(),setToken:jest.fn(),guardarYVerificar:jest.fn()})}));
jest.mock('../../../services/CocinaPOSService',()=>({...jest.requireActual<typeof import('../../../services/CocinaPOSService')>('../../../services/CocinaPOSService'),obtenerCocinaPOS:jest.fn(),avanzarRenglonCocina:jest.fn()}));
const ticket:TicketPOS={id:'pedido-test',folio:'MYA-000002',mesa:7,meseroId:'mesero-real-id',fecha:'2026-10-19T20:00:00Z',observaciones:'Llevar juntas',cocinaEstado:'pendiente',cocinaVersion:1,estaciones:[{estacion:'pizzas',estado:'pendiente',version:1},{estacion:'complementos',estado:'pendiente',version:1}],productos:[{lineaId:'pizza',nombre:'Pizza tres quesos',tamanio:'Mediana',cantidad:2,categoriaId:'cat-pizza',observaciones:'Sin cortar',estacion:'pizzas'},{lineaId:'papas',nombre:'Papas especiales',tamanio:'Porcion',cantidad:1,categoriaId:'cat-papas',observaciones:'Sin sal',estacion:'complementos'}]};
beforeEach(()=>{jest.mocked(leerEstacionCocina).mockResolvedValue('pizzas');jest.mocked(guardarEstacionCocina).mockResolvedValue(undefined);jest.mocked(obtenerCocinaPOS).mockResolvedValue({tickets:[ticket],categorias:[]});jest.mocked(avanzarRenglonCocina).mockResolvedValue(undefined);jest.clearAllMocks();});
test('cada hoja conserva solo sus lineas, notas y estado independiente',()=>{
 const pizzas=ticketsPorEstacion([ticket],'pizzas'),complementos=ticketsPorEstacion([ticket],'complementos');
 expect(pizzas[0].productos.map(p=>p.lineaId)).toEqual(['pizza']);expect(complementos[0].productos.map(p=>p.lineaId)).toEqual(['papas']);
 expect(pizzas[0].observaciones).toBe('Llevar juntas');expect(complementos[0].productos[0].observaciones).toBe('Sin sal');
});
test('complementos conserva sus notas y avanza con doble toque',async()=>{
 const v=await render(<CocinaHomeScreen/>);
 await fireEvent.press(v.getByRole('button',{name:'Complementos'}));
 await waitFor(()=>expect(v.getByText('Papas especiales')).toBeTruthy());expect(v.queryByText('Pizza tres quesos')).toBeNull();
 expect(v.queryAllByRole('tab')).toHaveLength(0);expect(v.queryByText('Hola, Cocina')).toBeNull();expect(v.queryByText('Última consulta:',{exact:false})).toBeNull();
 expect(v.getByText('Nota: Sin sal')).toBeTruthy();
 const renglon=v.getByRole('button',{name:'1 por Papas especiales, Mesa 7. Entrada.'});
 await fireEvent.press(renglon);expect(avanzarRenglonCocina).not.toHaveBeenCalled();await fireEvent.press(renglon);
 await waitFor(()=>expect(avanzarRenglonCocina).toHaveBeenCalledWith(expect.objectContaining({producto:expect.objectContaining({lineaId:'papas'})})));
 await fireEvent.press(v.getByRole('button',{name:'Menú de cocina'}));expect(v.getByRole('button',{name:'Perfil'})).toBeTruthy();
},15000);

test('abre el selector aun con una estación guardada y permite volver y cambiar',async()=>{
 jest.mocked(leerEstacionCocina).mockResolvedValue('complementos');
 const v=await render(<CocinaHomeScreen/>);
 expect(v.getByRole('header',{name:'Elige una estación'})).toBeTruthy();
 await fireEvent.press(v.getByRole('button',{name:'Pizzas'}));
 await waitFor(()=>expect(v.getByText('2 × Pizza tres quesos')).toBeTruthy());
 await fireEvent.press(v.getByRole('button',{name:'Estaciones'}));
 await fireEvent.press(v.getByRole('button',{name:'Complementos'}));
 await waitFor(()=>expect(v.getByText('Papas especiales')).toBeTruthy());
 expect(v.queryByText('2 × Pizza tres quesos')).toBeNull();
 await fireEvent.press(v.getByRole('button',{name:'Menú de cocina'}));
 await fireEvent.press(v.getByRole('button',{name:'Cambiar estación'}));
 expect(v.getByRole('header',{name:'Elige una estación'})).toBeTruthy();
 expect(guardarEstacionCocina).not.toHaveBeenCalled();
},15000);

test('preparar un producto lo mantiene en su lugar en la lista',async()=>{
 const datos:TicketPOS={...ticket,productos:Array.from({length:12},(_,i)=>({...ticket.productos[0],lineaId:'p'+i,nombre:'Pizza FIFO '+i,estadoCocina:'pendiente' as const,versionCocina:1,ordenCocina:i+1}))};
 jest.mocked(obtenerCocinaPOS).mockImplementation(async()=>({tickets:[{...datos,productos:datos.productos.map(p=>({...p}))}],categorias:[]}));
 jest.mocked(avanzarRenglonCocina).mockImplementation(async r=>{const p=datos.productos.find(p=>p.lineaId===r.producto.lineaId)!;p.estadoCocina='en_preparacion';p.versionCocina=2;});
 const v=await render(<CocinaHomeScreen/>);
 await fireEvent.press(v.getByRole('button',{name:'Pizzas'}));
 const row=await v.findByRole('button',{name:'2 por Pizza FIFO 0, Mesa 7. Entrada.'});
 await fireEvent.press(row);await fireEvent.press(row);
 await waitFor(()=>expect(v.getByRole('button',{name:'2 por Pizza FIFO 0, Mesa 7. En preparación.'})).toBeTruthy());
 const filas=v.getAllByRole('button',{name:/por Pizza FIFO/});
 expect(filas[0]).toBe(v.getByRole('button',{name:'2 por Pizza FIFO 0, Mesa 7. En preparación.'}));
},15000);
test('el doble toque deja el producto listo en la misma lista',async()=>{
 const datos:TicketPOS={...ticket,productos:[{...ticket.productos[0],estadoCocina:'en_preparacion',versionCocina:2,ordenCocina:1}]};
 jest.mocked(obtenerCocinaPOS).mockImplementation(async()=>({tickets:[{...datos,productos:datos.productos.map(p=>({...p}))}],categorias:[]}));
 jest.mocked(avanzarRenglonCocina).mockImplementation(async()=>{datos.productos[0]={...datos.productos[0],estadoCocina:'listo',versionCocina:3,entregadaEn:'2026-10-27T15:00:00Z'};});
 const v=await render(<CocinaHomeScreen/>);
 await fireEvent.press(v.getByRole('button',{name:'Pizzas'}));
 const row=await v.findByRole('button',{name:'2 por Pizza tres quesos, Mesa 7. En preparación.'});
 await fireEvent.press(row);expect(avanzarRenglonCocina).not.toHaveBeenCalled();await fireEvent.press(row);
 await waitFor(()=>expect(v.queryByRole('button',{name:/por Pizza tres quesos/})).toBeNull());
 expect(avanzarRenglonCocina).toHaveBeenCalledTimes(1);
 expect(v.getByText('2 × Pizza tres quesos')).toBeTruthy();
 expect(v.getByText('Nota: Sin cortar')).toBeTruthy();
 await fireEvent.press(v.getByRole('button',{name:'Menú de cocina'}));
 expect(v.queryByRole('button',{name:'Ver entregados'})).toBeNull();
},15000);
