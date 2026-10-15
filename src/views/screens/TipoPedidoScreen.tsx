
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

export type TipoPedido = 'mesa';

type OpcionPedido = {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  disponible: boolean;
};

interface Props {
  onRegresar: () => void;
  onContinuar: (tipo: TipoPedido) => void;
}

const OPCIONES: OpcionPedido[] = [
  {
    id: 'mesa',
    titulo: 'Mesa',
    descripcion: 'Consumo dentro del restaurante',
    icono: '🍽️',
    disponible: true,
  },
  {
    id: 'para_llevar',
    titulo: 'Para llevar',
    descripcion: 'Pedido para recoger',
    icono: '🛍️',
    disponible: false,
  },
  {
    id: 'reparto',
    titulo: 'Reparto',
    descripcion: 'Entrega a domicilio',
    icono: '🛵',
    disponible: false,
  },
  {
    id: 'mesa_pendiente',
    titulo: 'Mesa pendiente',
    descripcion: 'Asignar mesa posteriormente',
    icono: '🕒',
    disponible: false,
  },
];

export function TipoPedidoScreen({
  onRegresar,
  onContinuar,
}: Props) {
  const [seleccionado, setSeleccionado] =
    useState<TipoPedido>('mesa');

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Pressable
          style={styles.back}
          onPress={onRegresar}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>
            ← Regresar
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Tipo de pedido
        </Text>

        <Text style={styles.subtitle}>
          Selecciona cómo se atenderá al cliente.
        </Text>

        <View style={styles.grid}>
          {OPCIONES.map((opcion) => {
            const activa =
              opcion.disponible &&
              seleccionado === opcion.id;

            return (
              <Pressable
                key={opcion.id}
                disabled={!opcion.disponible}
                onPress={() => setSeleccionado('mesa')}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: activa,
                  disabled: !opcion.disponible,
                }}
                style={[
                  styles.card,
                  activa && styles.cardSelected,
                  !opcion.disponible && styles.cardDisabled,
                ]}
              >
                <Text style={styles.icon}>
                  {opcion.icono}
                </Text>

                <Text
                  style={[
                    styles.cardTitle,
                    activa && styles.selectedText,
                  ]}
                >
                  {opcion.titulo}
                </Text>

                <Text style={styles.description}>
                  {opcion.descripcion}
                </Text>

                {!opcion.disponible && (
                  <Text style={styles.pending}>
                    Próximamente
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.continueButton}
          onPress={() => onContinuar(seleccionado)}
          accessibilityRole="button"
        >
          <Text style={styles.continueText}>
            Continuar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const NARANJA = '#F97316';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F1',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 24,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
  },
  backText: {
    color: '#9A3412',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#292524',
    marginTop: 18,
  },
  subtitle: {
    fontSize: 15,
    color: '#78716C',
    marginTop: 10,
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    minHeight: 175,
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: NARANJA,
    backgroundColor: '#FFF0E4',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  icon: {
    fontSize: 31,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#44403C',
    textAlign: 'center',
  },
  selectedText: {
    color: '#C2410C',
  },
  description: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 8,
  },
  pending: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#A8A29E',
    marginTop: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    backgroundColor: '#FFF8F1',
  },
  continueButton: {
    backgroundColor: NARANJA,
    paddingVertical: 17,
    borderRadius: 13,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
