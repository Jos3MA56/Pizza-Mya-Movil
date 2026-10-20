import React from 'react';
import {test,expect,jest,beforeEach} from '@jest/globals';
import {render,fireEvent,waitFor} from '@testing-library/react-native';
import {CocinaHomeScreen} from '../CocinaHomeScreen';
import {obtenerCocinaPOS,avanzarCocinaPOS,ticketsPorEstacion,type TicketPOS} from '../../../services/CocinaPOSService';
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:require('react-native').View}));
jest.mock('../../../context/AuthContext',()=>({useAuth:()=>({usuario:{id:'cocina-test',nombre:'Cocina',rol:'cocina'},cerrarSesion:jest.fn()})}));
jest.mock('../../../viewmodels/usePosLanConfigViewModel',()=>({usePosLanConfigViewModel:()=>({urlBase:'http://pos.test:3101',token:'',mensaje:'Configura el POS',procesando:false,setUrlBase:jest.fn(),setToken:jest.fn(),guardarYVerificar:jest.fn()})}));
jest.mock('../../../services/CocinaPOSService',()=>({...jest.requireActual<typeof import('../../../services/CocinaPOSService')>('../../../services/CocinaPOSService'),obtenerCocinaPOS:jest.fn(),avanzarCocinaPOS:jest.fn()}));
const ticket:TicketPOS={id:'pedido-test',folio:'MYA-000002',mesa:7,meseroId:'mesero-real-id',fecha:'2026-10-19T20:00:00Z',observaciones:'Llevar juntas',cocinaEstado:'pendiente',cocinaVersion:1,estaciones:[{estacion:'pizzas',estado:'pendiente',version:1},{estacion:'complementos',estado:'pendiente',version:1}],productos:[{lineaId:'pizza',nombre:'Pizza tres quesos',tamanio:'Mediana',cantidad:2,categoriaId:'cat-pizza',observaciones:'Sin cortar',estacion:'pizzas'},{lineaId:'papas',nombre:'Papas especiales',tamanio:'Porcion',cantidad:1,categoriaId:'cat-papas',observaciones:'Sin sal',estacion:'complementos'}]};
beforeEach(()=>{jest.mocked(obtenerCocinaPOS).mockResolvedValue({tickets:[ticket],categorias:[]});jest.mocked(avanzarCocinaPOS).mockResolvedValue(undefined);jest.clearAllMocks();});
test('cada hoja conserva solo sus lineas, notas y estado independiente',()=>{
 const pizzas=ticketsPorEstacion([ticket],'pizzas'),complementos=ticketsPorEstacion([ticket],'complementos');
 expect(pizzas[0].productos.map(p=>p.lineaId)).toEqual(['pizza']);expect(complementos[0].productos.map(p=>p.lineaId)).toEqual(['papas']);
 expect(pizzas[0].observaciones).toBe('Llevar juntas');expect(complementos[0].productos[0].observaciones).toBe('Sin sal');
});
test('permite cambiar de pizzas a complementos y avanzar solo la estacion seleccionada',async()=>{
 const v=await render(<CocinaHomeScreen/>);
 await waitFor(()=>expect(v.getByText('Pizza tres quesos')).toBeTruthy());expect(v.queryByText('Papas especiales')).toBeNull();
 expect(v.getByText('MYA-000002')).toBeTruthy();expect(v.getByText('Nota: Sin cortar')).toBeTruthy();
 await fireEvent.press(v.getByRole('tab',{name:'Complementos'}));
 expect(v.getByText('Papas especiales')).toBeTruthy();expect(v.queryByText('Pizza tres quesos')).toBeNull();expect(v.getByText('Nota: Sin sal')).toBeTruthy();
 await fireEvent.press(v.getByRole('button',{name:'Iniciar preparación'}));
 await waitFor(()=>expect(avanzarCocinaPOS).toHaveBeenCalledWith(expect.objectContaining({id:'pedido-test'}),'complementos'));
 await fireEvent.press(v.getByRole('button',{name:'Conexión POS'}));expect(v.getByLabelText('Token LAN')).toBeTruthy();
},15000);
