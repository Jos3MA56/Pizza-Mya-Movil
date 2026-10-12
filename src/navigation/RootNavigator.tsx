
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../views/screens/LoginScreen';
import { MeseroHomeScreen } from '../views/screens/MeseroHomeScreen';
import { CocinaHomeScreen } from '../views/screens/CocinaHomeScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { usuario } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!usuario ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
        ) : usuario.rol === 'mesero' ? (
          <Stack.Screen
            name="MeseroHome"
            component={MeseroHomeScreen}
          />
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
