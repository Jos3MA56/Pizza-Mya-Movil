
import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import type {
  RootStackParamList,
} from '../../navigation/RootNavigator';

import { useAuth } from '../../context/AuthContext';
import { useComandasViewModel } from '../../viewmodels/useComandasViewModel';

type Navigation =
  NativeStackNavigationProp<
    RootStackParamList,
    'MeseroHome'
  >;

const COLORS = {
  background: '#FFF8F3',
  white: '#FFFFFF',
  orange: '#FF7000',
  orangeDark: '#E55B00',
  red: '#991F19',
  brown: '#9D231D',
  text: '#35251F',
  muted: '#9A8982',
  border: '#F0E3DA',
  green: '#227548',
};

export function MeseroHomeScreen() {
  const { usuario, cerrarSesion } = useAuth();
  const navigation = useNavigation<Navigation>();

  const {
    comandas,
    cargando,
    error,
  } = useComandasViewModel();

  const nombre = usuario?.nombre?.trim()?.split(' ')[0] || 'Mesero';

  const abrirProximamente = (titulo: string) => {
    Alert.alert(
      titulo,
      'Esta sección se implementará despues.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      {/* ENCABEZADO */}
      <View style={styles.header}>
        <View style={styles.brand}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Logo de Pizza Mya"
            />
        </View>

        <View style={styles.userArea}>
          <View>
            <Text style={styles.userName}>
              Hola, {nombre}
            </Text>
            <Text style={styles.userRole}>
              Mesero
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BIENVENIDA */}
        <Text style={styles.greeting}>
          ¿Listo para más pizzas hoy?
        </Text>

        <Text style={styles.description}>
          Atiende y gestiona los pedidos del restaurante.
        </Text>

        {/* TARJETAS PRINCIPALES */}
        <View style={styles.actionRow}>

          <Pressable
            style={[styles.actionCard, styles.orangeCard]}
            onPress={() => navigation.navigate('TipoPedido')}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>＋</Text>
            </View>

            <View>
              <Text style={styles.actionTitle}>
                Nuevo pedido
              </Text>
              <Text style={styles.actionDescription}>
                Abrir comanda rápida
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.actionCard, styles.redCard]}
            onPress={() => abrirProximamente('Pedidos activos')}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>▤</Text>
            </View>

            <View>
              <Text style={styles.actionTitle}>
                Pedidos{'\n'}activos
              </Text>
              <Text style={styles.actionDescription}>
                Ver mesas atendidas
              </Text>
            </View>
          </Pressable>

        </View>

        {/* INDICADORES */}
        <View style={styles.indicators}>
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              ◉ Estado local
            </Text>
          </View>

          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              ↻ Sin verificación
            </Text>
          </View>

          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              ▣ {comandas.length} comandas
            </Text>
          </View>
        </View>

        {/* ACTIVIDAD RECIENTE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Actividad reciente
          </Text>

          <Pressable
            onPress={() => abrirProximamente('Actividad reciente')}
          >
            <Text style={styles.seeAll}>
              Ver todo
            </Text>
          </Pressable>
        </View>

        {cargando ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Cargando comandas...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : comandas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Sin actividad reciente
            </Text>
            <Text style={styles.emptyText}>
              Las comandas creadas durante esta sesión
              aparecerán aquí.
            </Text>
          </View>
        ) : (
          comandas.slice(0, 4).map((pedido) => (
            <View
              key={pedido.id}
              style={styles.orderCard}
            >
              <View style={styles.tableBadge}>
                <Text style={styles.tableText}>
                  {pedido.mesaId !== undefined
                    ? `M${pedido.mesaId}`
                    : '—'}
                </Text>
              </View>

              <View style={styles.orderInformation}>
                <Text
                  style={styles.orderTitle}
                  numberOfLines={1}
                >
                  Pedido {pedido.folio ?? pedido.id}
                </Text>

                <Text
                  style={styles.orderDescription}
                  numberOfLines={1}
                >
                  {pedido.productos?.length
                    ? pedido.productos
                        .map((p) => p.nombre)
                        .join(', ')
                    : 'Sin productos registrados'}
                </Text>
              </View>

              <Text style={styles.orderStatus}>
                {pedido.estado === 'borrador'
                  ? 'Borrador'
                  : pedido.estado === 'enviado'
                    ? 'Enviado*'
                    : 'Cancelado'}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.disclaimer}>
          *El estado del prototipo no confirma recepción
          por el POS ni por cocina.
        </Text>
      </ScrollView>

      {/* NAVEGACIÓN INFERIOR */}
      <View style={styles.bottomNavigation}>

        <Pressable style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navActive]}>
            ⌂
          </Text>
          <Text style={[styles.navLabel, styles.navActive]}>
            Inicio
          </Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => abrirProximamente('Menú')}
        >
          <Text style={styles.navIcon}>☰</Text>
          <Text style={styles.navLabel}>Menú</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => abrirProximamente('Pedidos')}
        >
          <Text style={styles.navIcon}>▤</Text>
          <Text style={styles.navLabel}>Pedidos</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() =>
            Alert.alert(
              'Perfil',
              `Sesión: ${usuario?.nombre ?? 'Mesero'}`,
              [
                { text: 'Volver', style: 'cancel' },
                {
                  text: 'Cerrar sesión',
                  onPress: cerrarSesion,
                },
              ]
            )
          }
        >
          <Text style={styles.navIcon}>♙</Text>
          <Text style={styles.navLabel}>Perfil</Text>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 17,
    paddingVertical: 14,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 82,
    height: 82,
    marginBottom: 8,
  },
  userArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  userName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  userRole: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'right',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE0C8',
    borderColor: COLORS.orange,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.red,
    fontSize: 17,
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 13,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.red,
  },
  description: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minHeight: 148,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#802B12',
    shadowOpacity: 0.1,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  orangeCard: {
    backgroundColor: COLORS.orange,
  },
  redCard: {
    backgroundColor: COLORS.red,
  },
  actionIcon: {
    width: 39,
    height: 39,
    backgroundColor: '#FFFFFF25',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: {
    fontSize: 23,
    color: COLORS.white,
    fontWeight: '700',
  },
  actionTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '900',
  },
  actionDescription: {
    color: '#FFF3E9',
    fontSize: 11,
    marginTop: 4,
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
    marginBottom: 20,
  },
  indicator: {
    flex: 1,
    backgroundColor: '#F5ECE6',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.red,
  },
  seeAll: {
    color: COLORS.orangeDark,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.red,
    textAlign: 'center',
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  tableBadge: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#FFF1E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.red,
  },
  orderInformation: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  orderDescription: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  orderStatus: {
    fontSize: 10,
    color: COLORS.orangeDark,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 10,
    textAlign: 'center',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 9,
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navIcon: {
    fontSize: 24,
    color: '#857A73',
  },
  navLabel: {
    fontSize: 11,
    color: '#857A73',
  },
  navActive: {
    color: COLORS.orange,
    fontWeight: '800',
  },
});
