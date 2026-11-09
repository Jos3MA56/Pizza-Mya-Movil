import React, { useState } from 'react';
import { Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { EstacionCocina } from '../../services/CocinaPOSService';
import { useAuth } from '../../context/AuthContext';
import { useCocinaViewModel } from '../../viewmodels/useCocinaViewModel';
import { CocinaEstacionScreen, COCINA_COLORS as C } from './CocinaEstacionScreen';

const estaciones = {
  pizzas: { titulo: 'Pizzas', icono: 'pizza-outline' },
  complementos: { titulo: 'Complementos', icono: 'restaurant-outline' },
} as const;

export function CocinaHomeScreen() {
  const [estacion, setEstacion] = useState<EstacionCocina | null>(null);
  const [menu, setMenu] = useState(false);
  const { cerrarSesion } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const vm = useCocinaViewModel(estacion ?? 'pizzas');

  function volverAEstaciones() {
    setMenu(false);
    setEstacion(null);
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" />
      {estacion ? (
        <CocinaEstacionScreen
          key={estacion}
          vm={vm}
          titulo={estaciones[estacion].titulo}
          onMenu={() => setMenu(true)}
          onVolver={volverAEstaciones}
        />
      ) : (
        <View style={s.setup}>
          <Text style={s.kicker}>PIZZA MYA · COCINA</Text>
          <Text accessibilityRole="header" style={s.title}>Elige una estación</Text>
          <Text style={s.info}>Abre la lista de Pizzas o Complementos.</Text>
          {(['pizzas', 'complementos'] as const).map(opcion => (
            <Pressable key={opcion} accessibilityRole="button" accessibilityLabel={estaciones[opcion].titulo} onPress={() => setEstacion(opcion)} style={s.estacion}>
              <View style={s.icono}><Ionicons name={estaciones[opcion].icono} size={23} color={C.red} /></View>
              <Text style={s.estacionTexto}>{estaciones[opcion].titulo}</Text>
              <Ionicons name="chevron-forward" size={20} color={C.muted} />
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Menú de cocina" onPress={() => setMenu(true)} style={s.option}>
            <Text style={s.optionText}>Opciones</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <View style={s.overlay}>
          <View style={s.menu} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={s.title}>{estacion ? estaciones[estacion].titulo : 'Cocina'}</Text>
            <Text style={s.info}>{vm.conectado ? 'POS conectado' : 'Sin conexión con el POS'}</Text>
            {estacion && <Pressable accessibilityRole="button" onPress={volverAEstaciones} style={s.option}><Text style={s.optionText}>Cambiar estación</Text></Pressable>}
            <Pressable accessibilityRole="button" onPress={() => { setMenu(false); void vm.cargar(); }} style={s.option}><Text style={s.optionText}>Actualizar pedidos</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setMenu(false); navigation.navigate('Perfil'); }} style={s.option}><Text style={s.optionText}>Perfil</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setMenu(false); void cerrarSesion(); }} style={s.option}><Text style={s.optionText}>Cerrar sesión</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setMenu(false)} style={s.option}><Text style={s.optionText}>Cerrar menú</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  setup: { flex: 1, padding: 24, paddingTop: 36, gap: 14 },
  kicker: { color: C.red, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  info: { fontSize: 14, lineHeight: 21, color: C.muted },
  estacion: { minHeight: 66, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7E9DE' },
  estacionTexto: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  overlay: { flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 28 },
  menu: { padding: 20, gap: 8, borderRadius: 18, backgroundColor: C.white },
  option: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 },
  optionText: { fontSize: 16, fontWeight: '700', color: C.red },
});
