import { SeguimientoScreen } from '../views/screens/SeguimientoScreen';
import { establecerActorLocal } from '../services/SesionLocal';

import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../views/screens/LoginScreen';
import { MeseroHomeScreen } from '../views/screens/MeseroHomeScreen';
import { CatalogoScreen } from '../views/screens/CatalogoScreen';
import { CocinaHomeScreen } from '../views/screens/CocinaHomeScreen';
import { EditarComandaScreen } from '../views/screens/EditarComandaScreen';
import {
  TipoPedidoScreen,
  type TipoPedido,
} from '../views/screens/TipoPedidoScreen';
import { SeleccionMesaScreen } from '../views/screens/SeleccionMesaScreen';
import { PedidoResumenScreen } from '../views/screens/PedidoResumenScreen';

export type RootStackParamList = {
  Login: undefined;
  Seguimiento: { pedidoId: string };
  MeseroHome: undefined;
  CocinaHome: undefined;
  AccesoNoAutorizado: undefined;
  TipoPedido: undefined;
  Catalogo: { pedidoId?: string } | undefined;
  SeleccionMesa: undefined;
  PedidoResumen: {
    pedidoId: string;
  };
  EditarComanda: {
    pedidoId: string;
  };
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

type TipoPedidoRouteProps =
  NativeStackScreenProps<
    RootStackParamList,
    'TipoPedido'
  >;

function TipoPedidoRoute({
  navigation,
}: TipoPedidoRouteProps) {
  const continuar = (tipo: TipoPedido) => {
    if (tipo === 'mesa') {
      navigation.navigate('SeleccionMesa');
    }
  };

  return (
    <TipoPedidoScreen
      onRegresar={() => navigation.goBack()}
      onContinuar={continuar}
    />
  );
}

type SeleccionMesaRouteProps =
  NativeStackScreenProps<
    RootStackParamList,
    'SeleccionMesa'
  >;

function SeleccionMesaRoute({
  navigation,
}: SeleccionMesaRouteProps) {
  return (
    <SeleccionMesaScreen
      onRegresar={() => navigation.goBack()}
      onAbrirComanda={(pedidoId) => {
        navigation.navigate('PedidoResumen', {
          pedidoId,
        });
      }}
    />
  );
}

type PedidoResumenRouteProps =
  NativeStackScreenProps<
    RootStackParamList,
    'PedidoResumen'
  >;

function PedidoResumenRoute({
  navigation,
  route,
}: PedidoResumenRouteProps) {
  return (
    <PedidoResumenScreen
      pedidoId={route.params.pedidoId}
      onSeguimiento={() => navigation.navigate('Seguimiento', { pedidoId: route.params.pedidoId })}
      onRegresar={() => navigation.goBack()}
      onEditarComanda={() => {
          navigation.navigate('EditarComanda', {
          pedidoId: route.params.pedidoId,
        });
      }}
    />
  );
}

type EditarComandaRouteProps =
  NativeStackScreenProps<
    RootStackParamList,
    'EditarComanda'
  >;

function EditarComandaRoute({
  navigation,
  route,
}: EditarComandaRouteProps) {
  return (
    <EditarComandaScreen
      pedidoId={route.params.pedidoId}
      onRegresar={() => navigation.goBack()}
      onGuardado={() => navigation.goBack()}
    />
  );
}

type CatalogoRouteProps = NativeStackScreenProps<RootStackParamList, 'Catalogo'>;
function CatalogoRoute({ navigation, route }: CatalogoRouteProps) {
  return <CatalogoScreen pedidoId={route.params?.pedidoId}
    onRegresar={() => navigation.goBack()}
    onAgregado={() => navigation.goBack()}
    onCrearPedido={() => navigation.navigate('TipoPedido')} />;
}

function SeguimientoRoute({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Seguimiento'>) {
  return <SeguimientoScreen pedidoId={route.params.pedidoId} onRegresar={() => navigation.goBack()} />;
}

export function RootNavigator() {
  const { usuario } = useAuth();
  establecerActorLocal(usuario);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
      >
        {!usuario ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
        ) : usuario.rol === 'mesero' ? (
          <>
            <Stack.Screen
              name="MeseroHome"
              component={MeseroHomeScreen}
            />
            <Stack.Screen name="Seguimiento" component={SeguimientoRoute} />
            <Stack.Screen
              name="Catalogo"
              component={CatalogoRoute}
            />
            <Stack.Screen
              name="TipoPedido"
              component={TipoPedidoRoute}
            />
            <Stack.Screen
              name="SeleccionMesa"
              component={SeleccionMesaRoute}
            />
            <Stack.Screen
              name="PedidoResumen"
              component={PedidoResumenRoute}
            />
            <Stack.Screen
              name="EditarComanda"
              component={EditarComandaRoute}
            />
          </>
        ) : usuario.rol === 'cocina' ? (
          <Stack.Screen
            name="CocinaHome"
            component={CocinaHomeScreen}
          />
        ) : (
          <Stack.Screen
            name="AccesoNoAutorizado"
            component={LoginScreen}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
