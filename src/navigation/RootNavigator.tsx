
import React from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../views/screens/LoginScreen';
import { MeseroHomeScreen } from '../views/screens/MeseroHomeScreen';
import { CocinaHomeScreen } from '../views/screens/CocinaHomeScreen';
import { EditarComandaScreen } from '../views/screens/EditarComandaScreen';

import { PersonalizarPizzaScreen } from '../views/screens/PersonalizarPizzaScreen';

import {
  ComplementosScreen,
  type ComplementoSeleccionado,
} from '../views/screens/ComplementosScreen';

import type {
  PersonalizacionPizza,
} from '../models/PersonalizacionPizza';

import { calcularPrecioPizza } from '../services/calcularPrecioPizza';

import {
  TipoPedidoScreen,
  type TipoPedido,
} from '../views/screens/TipoPedidoScreen';
import { SeleccionMesaScreen } from '../views/screens/SeleccionMesaScreen';
import { PedidoResumenScreen } from '../views/screens/PedidoResumenScreen';

export type RootStackParamList = {
  Login: undefined;
  MeseroHome: undefined;
  CocinaHome: undefined;
  AccesoNoAutorizado: undefined;
  TipoPedido: undefined;
  SeleccionMesa: undefined;
  PedidoResumen: {
    pedidoId: string;
  };
  EditarComanda: {
    pedidoId: string;
  };
  
PersonalizarPizzaDemo: {
  pedidoId: string;
};

ComplementosDemo: {
  pedidoId: string;
  pizza: PersonalizacionPizza;
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
      onRegresar={() => navigation.goBack()}
      
onAgregarProductos={() => {
  navigation.navigate('PersonalizarPizzaDemo', {
    pedidoId: route.params.pedidoId,
  });
}}

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


type PersonalizarPizzaRouteProps =
  NativeStackScreenProps<
    RootStackParamList,
    'PersonalizarPizzaDemo'
  >;

function PersonalizarPizzaRoute({
  navigation,
  route,
}: PersonalizarPizzaRouteProps) {
  return (
    <PersonalizarPizzaScreen
      onRegresar={() => navigation.goBack()}
      onContinuar={(pizza) => {
        navigation.navigate('ComplementosDemo', {
          pedidoId: route.params.pedidoId,
          pizza,
        });
      }}
    />
  );
}

type ComplementosRouteProps =
  NativeStackScreenProps<
    RootStackParamList,
    'ComplementosDemo'
  >;

function ComplementosRoute({
  navigation,
  route,
}: ComplementosRouteProps) {
  const { pedidoId, pizza } = route.params;

  const finalizar = (
    complementos: ComplementoSeleccionado[]
  ) => {
    const precioPizza = calcularPrecioPizza(pizza);

    const totalComplementos = complementos.reduce(
      (total, item) =>
        total +
        item.producto.precioCentavos * item.cantidad,
      0
    );

    const totalDemostrativo =
      (precioPizza.totalCentavos +
        totalComplementos) / 100;

    const descripcionPizza =
      pizza.modalidad === 'mitad_mitad'
        ? `${pizza.especialidadPrincipal.nombre} / ${
            pizza.segundaEspecialidad?.nombre ?? ''
          }`
        : pizza.especialidadPrincipal.nombre;

    const descripcionComplementos =
      complementos.length > 0
        ? complementos
            .map(
              (item) =>
                `${item.cantidad} x ${item.producto.nombre}`
            )
            .join('\n')
        : 'Ninguno';

    Alert.alert(
      'Vista previa de selección',
      `Pizza: ${descripcionPizza}\n` +
        `Tamaño: ${pizza.tamanio}\n` +
        `Cantidad: ${pizza.cantidad}\n\n` +
        `Complementos:\n${descripcionComplementos}\n\n` +
        `Total de demostración: $${totalDemostrativo.toFixed(2)}\n\n` +
        'Esta selección todavía no se guarda en el pedido. ' +
        'Se requiere integrar el catálogo real.',
      [
        {
          text: 'Seguir editando',
          style: 'cancel',
        },
        {
          text: 'Volver al pedido',
          onPress: () => {
            navigation.popTo('PedidoResumen', {
              pedidoId,
            });
          },
        },
      ]
    );
  };

  return (
    <ComplementosScreen
      onRegresar={() => navigation.goBack()}
      onContinuar={finalizar}
    />
  );
}


export function RootNavigator() {
  const { usuario } = useAuth();

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
            
<Stack.Screen
  name="PersonalizarPizzaDemo"
  component={PersonalizarPizzaRoute}
/>

<Stack.Screen
  name="ComplementosDemo"
  component={ComplementosRoute}
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
