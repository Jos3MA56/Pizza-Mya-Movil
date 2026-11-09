import React from 'react';
import { test, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import { CatalogoScreen } from '../CatalogoScreen';
import { useCatalogoViewModel } from '../../../viewmodels/useCatalogoViewModel';
jest.mock('react-native-safe-area-context', () => ({SafeAreaView: require('react-native').View}));
jest.mock('../../../context/AuthContext', () => ({useAuth: () => ({usuario: {id: 'mesero'}})}));
jest.mock('../../../viewmodels/useCatalogoViewModel', () => ({useCatalogoViewModel: jest.fn()}));
const pizzas = ['Hawaiana', 'PP', 'Lovers', 'Pastor'].map((nombre, i) => ({id: `p${i}`, nombre, categoriaId: 'pizzas', descripcion: '', tamanios: ['Mediana', 'Grande', 'Jumbo'].map(t => ({id: `p${i}-${t}`, tamanioId: t, nombre: t, precio: 150 + i * 35}))}));
const configurar = jest.fn();
beforeEach(() => {
 jest.clearAllMocks();
 jest.mocked(useCatalogoViewModel).mockReturnValue({productos: [...pizzas, {id: 'agua', nombre: 'Agua', categoriaId: 'bebidas', descripcion: '', tamanios: []}], categorias: [{id: 'pizzas', nombre: 'Pizzas', orden: 0}, {id: 'bebidas', nombre: 'Bebidas', orden: 1}], cache: {guardado: false}, cargando: false, error: null, errorAgregar: null, seleccionado: null, combinacionConfigurada: null, configurarCombinacion: configurar, categoriaId: '', setCategoriaId: jest.fn(), busqueda: '', setBusqueda: jest.fn(), seleccionar: jest.fn(), contraer: jest.fn(), cargar: jest.fn(), agregando: false, variante: undefined, varianteId: '', cantidad: 1, orillaId: '', precioUnitario: 0, orillas: [], esPizza: false, setOrillaId: jest.fn(), setCantidad: jest.fn(), setVarianteId: jest.fn(), agregar: jest.fn<() => Promise<boolean>>() } as ReturnType<typeof useCatalogoViewModel>);
});
test('pulsación larga inicia selección; confirma reparto y especialidad destacada', async () => {
 const v = await render(<CatalogoScreen pedidoId="comanda" onRegresar={jest.fn()} onAgregado={jest.fn()} onCrearPedido={jest.fn()}/>);
 await fireEvent(v.getByRole('button', {name: 'Abrir Hawaiana'}), 'longPress');
 expect(v.getByText('Seleccionadas: 1/4')).toBeTruthy();expect(v.queryByText('Agua')).toBeNull();
 await fireEvent.press(v.getByRole('button', {name: 'Seleccionar PP'}));
 expect(v.getByText('Seleccionadas: 2/4')).toBeTruthy();
 await fireEvent.press(v.getByRole('button', {name: 'Elegir tamaño y reparto'}));
 await fireEvent.press(v.getByRole('radio', {name: /Jumbo/}));
 await fireEvent.press(v.getByRole('radio', {name: /Un cuarto y tres cuartos/}));
 await fireEvent.press(v.getByRole('radio', {name: /PP/}));
 await fireEvent.press(v.getByRole('button', {name: 'Confirmar combinación'}));
 expect(configurar).toHaveBeenCalledWith(expect.objectContaining({nombre: 'Jumbo 1/4 PP - Hawaiana'}));
});
test('botón Combinar permite cuatro selecciones y cancelar no confirma cambios', async () => {
 const v = await render(<CatalogoScreen pedidoId="comanda" onRegresar={jest.fn()} onAgregado={jest.fn()} onCrearPedido={jest.fn()}/>);
 await fireEvent.press(v.getByRole('button', {name: 'Combinar'}));
 for (const p of pizzas) await fireEvent.press(v.getByRole('button', {name: 'Seleccionar ' + p.nombre}));
 await fireEvent.press(v.getByRole('button', {name: 'Elegir tamaño y reparto'}));
 expect(v.queryByRole('radio', {name: /Mediana/})).toBeNull();expect(v.getByRole('radio', {name: /Cuatro cuartos iguales/})).toBeTruthy();
 await fireEvent.press(v.getByRole('button', {name: 'Cerrar combinación'}));
 await fireEvent.press(v.getByRole('button', {name: 'Cancelar combinación'}));
 expect(configurar).not.toHaveBeenCalled();expect(v.getByText('Agua')).toBeTruthy();
});
