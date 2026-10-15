
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  COMPLEMENTOS_DEMO,
  type ComplementoDemo,
} from '../../data/opcionesPersonalizacionDemo';

export interface ComplementoSeleccionado {
  producto: ComplementoDemo;
  cantidad: number;
}

interface Props {
  onRegresar: () => void;
  onContinuar: (productos: ComplementoSeleccionado[]) => void;
}

const C = {
  fondo: '#FFF8F3',
  blanco: '#FFFFFF',
  naranja: '#FF7000',
  rojo: '#991F19',
  texto: '#35251F',
  secundario: '#85766E',
  borde: '#F0E3DA',
};

function dinero(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}

export function ComplementosScreen({
  onRegresar,
  onContinuar,
}: Props) {
  const [cantidades, setCantidades] =
    useState<Record<string, number>>({});

  const cambiarCantidad = (id: string, cambio: number) => {
    setCantidades((actual) => ({
      ...actual,
      [id]: Math.max(
        0,
        Math.min(99, (actual[id] ?? 0) + cambio)
      ),
    }));
  };

  const seleccionados = useMemo<ComplementoSeleccionado[]>(
    () =>
      COMPLEMENTOS_DEMO
        .filter((producto) => (cantidades[producto.id] ?? 0) > 0)
        .map((producto) => ({
          producto,
          cantidad: cantidades[producto.id],
        })),
    [cantidades]
  );

  const totalCentavos = seleccionados.reduce(
    (total, item) =>
      total + item.producto.precioCentavos * item.cantidad,
    0
  );

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Pressable onPress={onRegresar}>
          <Text style={styles.regresar}>← Regresar</Text>
        </Pressable>

        <Text style={styles.titulo}>
          Bebidas y complementos
        </Text>

        <Text style={styles.subtitulo}>
          Selecciona los productos adicionales del pedido.
        </Text>

        <Text style={styles.aviso}>
          Catálogo demostrativo. Precios no oficiales.
        </Text>
      </View>

      <ScrollView
        style={styles.contenido}
        contentContainerStyle={styles.lista}
      >
        {COMPLEMENTOS_DEMO.map((producto) => (
          <View key={producto.id} style={styles.tarjeta}>
            <View style={styles.info}>
              <Text style={styles.nombre}>
                {producto.nombre}
              </Text>

              <Text style={styles.categoria}>
                {producto.categoria}
              </Text>

              <Text style={styles.precio}>
                {dinero(producto.precioCentavos)}
              </Text>
            </View>

            <View style={styles.controles}>
              <Pressable
                style={styles.control}
                onPress={() => cambiarCantidad(producto.id, -1)}
                accessibilityLabel={`Quitar ${producto.nombre}`}
              >
                <Text style={styles.controlTexto}>−</Text>
              </Pressable>

              <Text style={styles.cantidad}>
                {cantidades[producto.id] ?? 0}
              </Text>

              <Pressable
                style={styles.control}
                onPress={() => cambiarCantidad(producto.id, 1)}
                accessibilityLabel={`Agregar ${producto.nombre}`}
              >
                <Text style={styles.controlTexto}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pie}>
        <View style={styles.totalFila}>
          <Text style={styles.totalEtiqueta}>
            Total demostrativo
          </Text>
          <Text style={styles.total}>
            {dinero(totalCentavos)}
          </Text>
        </View>

        <Pressable
          style={styles.boton}
          onPress={() => onContinuar(seleccionados)}
        >
          <Text style={styles.botonTexto}>
            Continuar
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.fondo },
  encabezado: {
    padding: 20,
    paddingTop: 18,
  },
  regresar: {
    color: C.rojo,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 24,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '900',
    color: C.texto,
  },
  subtitulo: {
    marginTop: 8,
    fontSize: 14,
    color: C.secundario,
  },
  aviso: {
    color: C.rojo,
    marginTop: 15,
    fontSize: 12,
    fontWeight: '700',
  },
  contenido: { flex: 1 },
  lista: {
    paddingHorizontal: 18,
    paddingBottom: 25,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: { flex: 1, gap: 5 },
  nombre: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
  },
  categoria: {
    fontSize: 12,
    color: C.secundario,
    textTransform: 'capitalize',
  },
  precio: {
    fontWeight: '800',
    color: C.rojo,
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  control: {
    width: 35,
    height: 35,
    backgroundColor: '#FFF0E3',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlTexto: {
    color: C.naranja,
    fontSize: 23,
    fontWeight: '800',
  },
  cantidad: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
  },
  pie: {
    backgroundColor: C.blanco,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },
  totalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalEtiqueta: {
    fontSize: 15,
    color: C.texto,
    fontWeight: '700',
  },
  total: {
    fontSize: 22,
    color: C.rojo,
    fontWeight: '900',
  },
  boton: {
    backgroundColor: C.naranja,
    alignItems: 'center',
    paddingVertical: 17,
    borderRadius: 13,
  },
  botonTexto: {
    color: C.blanco,
    fontSize: 16,
    fontWeight: '800',
  },
});
