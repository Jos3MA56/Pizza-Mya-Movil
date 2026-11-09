import { Ionicons } from '@expo/vector-icons';
import {obtenerBaseDatos} from '../../services/storage/database';
import {obtenerConfiguracionPOS} from '../../services/sync/PosLanConfig';
import {solicitudPOS} from '../../services/sync/PosLanClient';

import React, { useEffect, useMemo, useState } from 'react';
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

const MAXIMO_MESAS = 50;

export function SeleccionMesaScreen({
  onRegresar,
  onAbrirComanda,
}: Props) {
  const { usuario } = useAuth();
  const {
    comandas,
    cargando,
    error: errorComandas,
    abrirMesa,
  } = useComandasViewModel();

  const [mesaSeleccionada, setMesaSeleccionada] =
    useState<number | null>(null);

  const [procesando, setProcesando] = useState(false);

  const [mesas, setMesas] = useState<number[]>([]);
  const [errorMesas, setErrorMesas] = useState('');
  const [agregando, setAgregando] = useState(false);
  const error = errorMesas || errorComandas;

  async function consultarMesas(): Promise<number[]> {
    const config = await obtenerConfiguracionPOS();
    if (!config) throw new Error('Vincula primero el POS desde Perfil.');
    const respuesta = await solicitudPOS(config.urlBase, config.token, '/mesas');
    if (!Array.isArray(respuesta?.data?.mesas)) {
      throw new Error('Respuesta de mesas no valida.');
    }
    const ids = respuesta.data.mesas.map((mesa: { id: number }) => mesa.id);
    const db = await obtenerBaseDatos();
    await db.runAsync(
      'INSERT INTO pos_mesas_cache VALUES (1,?) ON CONFLICT(id) DO UPDATE SET documento=excluded.documento',
      JSON.stringify(ids)
    );
    return ids;
  }

  useEffect(() => {
    let activo = true;
    let consultando = false;
    async function actualizar() {
      if (consultando) return;
      consultando = true;
      try {
        const ids = await consultarMesas();
        if (activo) {
          setMesas(ids);
          setMesaSeleccionada(actual => actual !== null && !ids.includes(actual) ? null : actual);
          setErrorMesas('');
        }
      } catch (causa) {
        try {
          const db = await obtenerBaseDatos();
          const cache = await db.getFirstAsync<{ documento: string }>(
            'SELECT documento FROM pos_mesas_cache WHERE id=1'
          );
          if (activo) {
            if (cache) setMesas(JSON.parse(cache.documento));
            setErrorMesas(cache
              ? 'Sin conexion: mostrando mesas guardadas.'
              : causa instanceof Error ? causa.message : 'Sin conexion con el POS.');
          }
        } catch {
          if (activo) setErrorMesas('No se pudieron consultar las mesas.');
        }
      } finally {
        consultando = false;
      }
    }
    void actualizar();
    const intervalo = setInterval(() => void actualizar(), 2000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  async function agregarMesa() {
    if (agregando || mesas.length >= MAXIMO_MESAS) return;
    setAgregando(true);
    try {
      const config = await obtenerConfiguracionPOS();
      if (!config) throw new Error('Vincula primero el POS desde Perfil.');
      const respuesta = await solicitudPOS(config.urlBase, config.token, '/mesas', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const id = respuesta.data.mesa.id as number;
      // Conservar el resultado confirmado aunque falle la consulta posterior.
      setMesas(actuales => [...new Set([...actuales, id])].sort((a, b) => a - b));
      setMesaSeleccionada(id);
      setErrorMesas('');
    } catch (causa) {
      Alert.alert('No se pudo agregar la mesa', causa instanceof Error
        ? causa.message : 'Comprueba la conexion con el POS.');
    } finally {
      setAgregando(false);
    }
  }

  function confirmarEliminarMesa() {
    const ultima = Math.max(...mesas);
    Alert.alert('Eliminar mesa', `Eliminar la mesa ${ultima}? Las mesas 1 a 20 son permanentes.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void eliminarMesa(ultima) },
    ]);
  }

  async function eliminarMesa(id: number) {
    if (agregando || id <= 20) return;
    setAgregando(true);
    try {
      const config = await obtenerConfiguracionPOS();
      if (!config) throw new Error('Vincula primero el POS desde Perfil.');
      await solicitudPOS(config.urlBase, config.token, `/mesas/${id}`, { method: 'DELETE' });
      setMesas(actuales => actuales.filter(numero => numero !== id));
      setMesaSeleccionada(actual => actual === id ? null : actual);
    } catch (causa) {
      Alert.alert('No se pudo eliminar', causa instanceof Error ? causa.message : 'Comprueba la conexion.');
    } finally {
      setAgregando(false);
    }
  }

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

      <View style={styles.administrarMesas}>
        <Text style={styles.contadorMesas}>{mesas.length} / {MAXIMO_MESAS} mesas</Text>
        <Pressable
          accessibilityRole="button"
          disabled={agregando || mesas.length >= MAXIMO_MESAS || mesas.length === 0}
          onPress={() => void agregarMesa()}
          style={[styles.agregarMesa, (agregando || mesas.length >= MAXIMO_MESAS) && styles.botonDeshabilitado]}
        >
          <Text style={styles.agregarTexto}>
            {agregando ? 'Agregando...' : mesas.length >= MAXIMO_MESAS ? 'Limite alcanzado' : '+ Agregar mesa'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={agregando || mesas.length <= 20}
        onPress={confirmarEliminarMesa}
        style={[styles.eliminarMesa, (agregando || mesas.length <= 20) && styles.botonDeshabilitado]}
      >
        <Text style={styles.agregarTexto}>Eliminar ultima mesa adicional</Text>
      </Pressable>

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
        showsVerticalScrollIndicator={true}
        bounces={false}
        overScrollMode="never"
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
              <Ionicons name="restaurant-outline" size={22} color={COLORES.secundario} />

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
            (procesando || cargando || mesaSeleccionada === null) && styles.botonDeshabilitado,
          ]}
          disabled={procesando || cargando || mesaSeleccionada === null}
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
  eliminarMesa: {
    alignSelf: 'flex-end',
    marginRight: 20,
    padding: 10,
  },
  administrarMesas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  contadorMesas: {
    color: COLORES.secundario,
    fontSize: 13,
  },
  agregarMesa: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORES.blanco,
  },
  agregarTexto: {
    color: COLORES.rojo,
    fontWeight: '700',
  },
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
    minHeight: 0,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 25,
  },
  mesa: {
    width: '31.33%',
    margin: '1%',
    height: 96,
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
