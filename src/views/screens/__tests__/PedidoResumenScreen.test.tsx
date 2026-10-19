import React from 'react';
import { describe, test, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import { PedidoResumenScreen } from '../PedidoResumenScreen';
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../CatalogoScreen', () => ({ CatalogoScreen: () => {
  const { Text } = require('react-native');
  return <Text>Catálogo integrado en comanda</Text>;
} }));
jest.mock('../../../viewmodels/usePedidoResumenViewModel', () => ({ usePedidoResumenViewModel: () => ({
  pedido: { id: 'pedido', estado: 'borrador', mesaId: 1, productos: [], total: 0 },
  cargando: false, error: null, totalFormateado: '$0.00',
}) }));

describe('Catálogo dentro de comanda', () => {
  test('abre en catálogo, permite ver resumen y separa agregar de editar', async () => {
    const editar = jest.fn();
    const seguimiento = jest.fn();
    const vista = await render(<PedidoResumenScreen pedidoId="pedido" onRegresar={() => undefined} onEditarComanda={editar} onSeguimiento={seguimiento} />);
    expect(vista.getByText('Catálogo integrado en comanda')).toBeTruthy();
    await fireEvent.press(vista.getByText('Ver mi pedido'));
    expect(vista.getByText('Comanda sin productos')).toBeTruthy();
    await fireEvent.press(vista.getByText('+ Agregar productos'));
    expect(vista.getByText('Catálogo integrado en comanda')).toBeTruthy();
    expect(editar).not.toHaveBeenCalled();
    await fireEvent.press(vista.getByText('Ver mi pedido'));
    await fireEvent.press(vista.getByText('✎ Editar comanda'));
    expect(editar).toHaveBeenCalledTimes(1);
    await fireEvent.press(vista.getByText('Preparar / seguimiento'));
    expect(seguimiento).toHaveBeenCalledTimes(1);
  }, 15000);
});
