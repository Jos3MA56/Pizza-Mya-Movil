import { StatusBar } from 'expo-status-bar';
import { PedidoResumenScreen } from './src/views/screens/PedidoResumenScreen';

export default function App() {
  return (
    <>
      <PedidoResumenScreen />
      <StatusBar style="auto" />
    </>
  );
}