import React from 'react';
import { test, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import { CombinarPizzaModal } from '../CombinarPizzaModal';
import type { ProductoCatalogo } from '../../../models/Catalogo';
const pizzas: ProductoCatalogo[] = ['Hawaiana', 'PP', 'Lovers', 'Pastor'].map((nombre, i) => ({id: `p${i}`, nombre, categoriaId: 'pizzas', descripcion: '', tamanios: ['Mediana', 'Grande', 'Jumbo'].map(t => ({id: `p${i}-${t}`, tamanioId: t, nombre: t, precio: 150 + i * 35}))}));
test('pide elegir la especialidad del cuarto y muestra esa especialidad primero', async () => {
 const confirmar = jest.fn();const v = await render(<CombinarPizzaModal productos={pizzas.slice(0, 2)} onCerrar={jest.fn()} onConfirmar={confirmar}/>);
 await fireEvent.press(v.getByRole('radio', {name: /Jumbo/}));
 await fireEvent.press(v.getByRole('radio', {name: /Un cuarto y tres cuartos/}));
 expect(v.getByText('¿Qué especialidad lleva 1/4?')).toBeTruthy();
 await fireEvent.press(v.getByRole('button', {name: 'Confirmar combinación'}));expect(confirmar).not.toHaveBeenCalled();
 await fireEvent.press(v.getByRole('radio', {name: /PP/}));
 expect(v.getByTestId('vista-previa-combinacion').props.children).toBe('Jumbo 1/4 PP - Hawaiana');
 await fireEvent.press(v.getByRole('button', {name: 'Confirmar combinación'}));
 expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({nombre: 'Jumbo 1/4 PP - Hawaiana', precio: 185}));
});
test('tres especialidades permiten solo jumbo y ofrecen la mitad explícita', async () => {
 const v = await render(<CombinarPizzaModal productos={pizzas.slice(0, 3)} onCerrar={jest.fn()} onConfirmar={jest.fn()}/>);
 expect(v.queryByRole('radio', {name: /Mediana/})).toBeNull();
 await fireEvent.press(v.getByRole('radio', {name: /Una mitad y dos cuartos/}));
 await fireEvent.press(v.getByRole('radio', {name: /Lovers/}));
 expect(v.getByTestId('vista-previa-combinacion').props.children).toBe('Jumbo 1/2 Lovers - Hawaiana - PP');
});
