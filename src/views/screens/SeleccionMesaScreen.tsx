
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useComandasViewModel } from '../../viewmodels/useComandasViewModel';

interface Props {
  onRegresar: () => void;
  onAbrirComanda: (pedidoId: string) => void;
}

const COLORES = {
  fondo: '#FFF8F3',
  blanco: '#FFFFFF',
  naranja: '#FF7000',
  rojo: '#991F19',
  texto: '#35251F',
  secundario: '#85766E',
  borde: '#F0E3DA',
  verde: '#26845A',
  verdeFondo: '#E7F5EC',
  rojoFondo: '#FBE9E7',
  naranjaFondo: '#FFF0E3',
};

const TOTAL_MESAS_DEMO = 20;
const MAXIMO_MESAS = 50;

export function SeleccionMesaScreen({
  onRegresar,
  onAbrirComanda,
}: Props) {
  const { usuario } = useAuth();
  const {
    comandas,
    cargando,
    error,
    abrirMesa,
  } = useComandasViewModel();

  const [mesaSeleccionada, setMesaSeleccionada] =
    useState<number | null>(null);

  const [procesando, setProcesando] = useState(false);

  // Configuración provisional.
  // Posteriormente vendrá del módulo de mesas del POS.
  const mesas = useMemo(
    () =>
      Array.from(
        { length: Math.min(TOTAL_MESAS_DEMO, MAXIMO_MESAS) },
        (_, indice) => indice + 1
      ),
    []
  );

  const comandasPorMesa = useMemo(() => {
    const resultado = new Map<number, string>();

    for (const comanda of comandas) {
      if (comanda.mesaId !== undefined) {
        resultado.set(comanda.mesaId, comanda.id);
      }
    }

    return resultado;
  }, [comandas]);

  const mesaOcupada =
    mesaSeleccionada !== null &&
    comandasPorMesa.has(mesaSeleccionada);

  const continuar = async () => {
    if (mesaSeleccionada === null) {
      Alert.alert(
        'Selecciona una mesa',
        'Debes seleccionar una mesa para continuar.'
      );
      return;
    }

    if (!usuario?.id) {
      Alert.alert(
        'Sesión no válida',
        'No se pudo identificar al mesero.'
      );
      return;
    }

    setProcesando(true);

    try {
      const pedido = await abrirMesa(
        mesaSeleccionada,
        String(usuario.id)
      );

      if (!pedido) {
        Alert.alert(
          'No se pudo abrir la comanda',
          'Verifica la información de la mesa e inténtalo nuevamente.'
        );
        return;
      }

      onAbrirComanda(pedido.id);
    } catch (causa: unknown) {
      Alert.alert(
        'Error',
        causa instanceof Error
          ? causa.message
          : 'Ocurrió un error al abrir la mesa.'
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Pressable onPress={onRegresar}>
          <Text style={styles.regresar}>← Regresar</Text>
        </Pressable>

        <Text style={styles.titulo}>
          Seleccionar mesa
        </Text>

        <Text style={styles.subtitulo}>
          Elige la mesa que deseas atender.
        </Text>
      </View>

      <View style={styles.leyenda}>
        <View style={styles.leyendaElemento}>
          <View style={[styles.punto, {
            backgroundColor: COLORES.verde,
          }]} />
          <Text style={styles.leyendaTexto}>Libre</Text>
        </View>

        <View style={styles.leyendaElemento}>
          <View style={[styles.punto, {
            backgroundColor: COLORES.rojo,
          }]} />
          <Text style={styles.leyendaTexto}>Ocupada</Text>
        </View>

        <View style={styles.leyendaElemento}>
          <View style={[styles.punto, {
            backgroundColor: COLORES.naranja,
          }]} />
          <Text style={styles.leyendaTexto}>
            Seleccionada
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.lista}
        contentContainerStyle={styles.cuadricula}
        showsVerticalScrollIndicator={false}
      >
        {mesas.map((numero) => {
          const ocupada = comandasPorMesa.has(numero);
          const seleccionada = mesaSeleccionada === numero;

          return (
            <Pressable
              key={numero}
              onPress={() => setMesaSeleccionada(numero)}
              accessibilityRole="button"
              accessibilityLabel={`Mesa ${numero}, ${
                ocupada ? 'ocupada' : 'libre'
              }`}
              accessibilityState={{ selected: seleccionada }}
              style={[
                styles.mesa,
                ocupada ? styles.mesaOcupada : styles.mesaLibre,
                seleccionada && styles.mesaSeleccionada,
              ]}
            >
              <Text style={styles.iconoMesa}>▣</Text>

              <Text style={styles.numeroMesa}>
                M{numero}
              </Text>

              <Text
                style={[
                  styles.estadoMesa,
                  ocupada
                    ? styles.textoOcupada
                    : styles.textoLibre,
                ]}
              >
                {ocupada ? 'Ocupada' : 'Libre'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.pie}>
        <View style={styles.resumen}>
          <Text style={styles.resumenTitulo}>
            {mesaSeleccionada === null
              ? 'Ninguna mesa seleccionada'
              : `Mesa ${mesaSeleccionada}`}
          </Text>

          <Text style={styles.resumenDescripcion}>
            {mesaSeleccionada === null
              ? 'Selecciona una mesa para continuar'
              : mesaOcupada
                ? 'Se abrirá la comanda existente'
                : 'Se creará una nueva comanda'}
          </Text>
        </View>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        <Pressable
          style={[
            styles.boton,
            (procesando || cargando) && styles.botonDeshabilitado,
          ]}
          disabled={procesando || cargando}
          onPress={() => void continuar()}
        >
          {procesando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonTexto}>
              {mesaOcupada
                ? 'Abrir comanda'
                : 'Continuar'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  encabezado: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  regresar: {
    fontSize: 15,
    color: COLORES.rojo,
    fontWeight: '700',
    marginBottom: 26,
  },
  titulo: {
    fontSize: 27,
    color: COLORES.texto,
    fontWeight: '900',
  },
  subtitulo: {
    fontSize: 14,
    color: COLORES.secundario,
    marginTop: 9,
  },
  leyenda: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  leyendaElemento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  punto: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  leyendaTexto: {
    color: COLORES.secundario,
    fontSize: 12,
    fontWeight: '600',
  },
  lista: {
    flex: 1,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 25,
  },
  mesa: {
    width: '23%',
    margin: '1%',
    aspectRatio: 0.95,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesaLibre: {
    backgroundColor: COLORES.verdeFondo,
    borderColor: '#B7E0CA',
  },
  mesaOcupada: {
    backgroundColor: COLORES.rojoFondo,
    borderColor: '#EBC6C1',
  },
  mesaSeleccionada: {
    backgroundColor: COLORES.naranjaFondo,
    borderColor: COLORES.naranja,
    borderWidth: 2.5,
  },
  iconoMesa: {
    fontSize: 21,
    color: COLORES.secundario,
  },
  numeroMesa: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORES.texto,
    marginTop: 3,
  },
  estadoMesa: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  textoLibre: {
    color: COLORES.verde,
  },
  textoOcupada: {
    color: COLORES.rojo,
  },
  pie: {
    padding: 20,
    backgroundColor: COLORES.blanco,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  resumen: {
    marginBottom: 15,
  },
  resumenTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORES.texto,
  },
  resumenDescripcion: {
    fontSize: 12,
    color: COLORES.secundario,
    marginTop: 4,
  },
  error: {
    color: COLORES.rojo,
    fontSize: 12,
    marginBottom: 10,
  },
  boton: {
    backgroundColor: COLORES.naranja,
    borderRadius: 13,
    paddingVertical: 17,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.65,
  },
  botonTexto: {
    color: COLORES.blanco,
    fontSize: 16,
    fontWeight: '800',
  },
});
