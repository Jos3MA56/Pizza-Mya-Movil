import React from 'react';
import { Text, View } from 'react-native';
import type { Pedido } from '../../models/Pedido';
import { usePedidoResumenViewModel } from '../../viewmodels/usePedidoResumenViewModel';

const pedidoDemo: Pedido = { id: 'DEMO-001', estado: 'borrador', total: 0 };

/** Vista demostrativa sin navegación, red ni lógica de persistencia. */
export function PedidoResumenScreen() {
  const vm = usePedidoResumenViewModel(pedidoDemo);
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{vm.titulo}</Text>
      <Text>Estado: {vm.estado}</Text>
      <Text>Total: {vm.totalFormateado}</Text>
    </View>
  );
}
