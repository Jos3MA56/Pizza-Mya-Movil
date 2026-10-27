
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useEditarComandaViewModel } from '../../viewmodels/useEditarComandaViewModel';

interface Props {
  pedidoId: string;
  onRegresar: () => void;
  onGuardado: () => void;
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

export function EditarComandaScreen({
  pedidoId,
  onRegresar,
  onGuardado,
}: Props) {
  const { usuario } = useAuth();

  const vm = useEditarComandaViewModel(
    pedidoId,
    String(usuario?.id ?? '')
  );

  const editable = vm.pedido?.estado === 'borrador';

  const guardar = async () => {
    const correcto = await vm.guardarCambios();

    if (correcto) {
      Alert.alert(
        'Cambios guardados',
        'La comanda se actualizó localmente. Los cambios todavía no se han enviado al POS.',
        [{ text: 'Aceptar', onPress: onGuardado }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Pressable onPress={onRegresar}>
          <Text style={styles.regresar}>← Regresar</Text>
        </Pressable>

        <Text style={styles.titulo}>Editar comanda</Text>

        <Text style={styles.subtitulo}>
          {vm.pedido?.mesaId
            ? `Mesa ${vm.pedido.mesaId}`
            : 'Comanda local'}
        </Text>
      </View>

      {vm.cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator color={C.naranja} size="large" />
        </View>
      ) : !vm.pedido ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>
            {vm.error ?? 'No se encontró la comanda.'}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.contenido}
            contentContainerStyle={styles.scroll}
          >
            <Text style={styles.seccion}>Productos registrados</Text>

            {(vm.pedido.productos ?? []).length === 0 ? (
              <View style={styles.tarjeta}>
                <Text style={styles.textoSecundario}>
                  Esta comanda todavía no tiene productos.
                  Podrás agregarlos cuando se integre el catálogo.
                </Text>
              </View>
            ) : (
              (vm.pedido.productos ?? []).map((producto) => {
                const permiteEditar =
                  editable && producto.estado === 'pendiente';

                const cantidad =
                  vm.cantidades[producto.id] ?? producto.cantidad;

                return (
                  <View key={producto.id} style={styles.tarjeta}>
                    <Text style={styles.nombre}>
                      {producto.nombre}{producto.tamanio ? ' · ' + producto.tamanio : ''}
                    </Text>

                    <Text style={styles.textoSecundario}>
                      Estado: {producto.estado.replace(/_/g, ' ')}
                    </Text>

                    <View style={styles.fila}>
                      <View style={styles.controles}>
                        <Pressable
                          style={styles.control}
                          disabled={!permiteEditar || cantidad <= 1}
                          onPress={() =>
                            vm.cambiarCantidad(producto.id, -1)
                          }
                        >
                          <Text style={styles.controlTexto}>−</Text>
                        </Pressable>

                        <Text style={styles.cantidad}>
                          {cantidad}
                        </Text>

                        <Pressable
                          style={styles.control}
                          disabled={!permiteEditar || cantidad >= 99}
                          onPress={() =>
                            vm.cambiarCantidad(producto.id, 1)
                          }
                        >
                          <Text style={styles.controlTexto}>+</Text>
                        </Pressable>
                      </View>

                      <Text style={styles.precio}>
                        ${(cantidad * producto.precioUnitario).toFixed(2)}
                      </Text>
                    </View>

                    {!permiteEditar && (
                      <Text style={styles.bloqueado}>
                        Modificación no disponible
                      </Text>
                    )}
                  </View>
                );
              })
            )}

            <Text style={styles.seccion}>Observaciones para cocina</Text>

            <TextInput
              style={styles.entrada}
              value={vm.observaciones}
              onChangeText={vm.setObservaciones}
              placeholder="Ej. Sin cebolla, observaciones de la mesa..."
              placeholderTextColor="#9A8982"
              multiline
              maxLength={500}
              editable={editable}
              textAlignVertical="top"
            />

            <Text style={styles.nota}>
              Los cambios se registrarán con el identificador
              del mesero y la fecha. Los productos que ya se
              encuentran en preparación no se pueden modificar
              desde esta pantalla.
            </Text>

            {!!vm.error && (
              <Text style={styles.error}>{vm.error}</Text>
            )}
          </ScrollView>

          <View style={styles.pie}>
            <Pressable
              style={[
                styles.boton,
                (!editable || vm.guardando) && styles.deshabilitado,
              ]}
              disabled={!editable || vm.guardando}
              onPress={() => void guardar()}
            >
              {vm.guardando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.botonTexto}>
                  Guardar cambios
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  encabezado: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  regresar: {
    fontSize: 15,
    fontWeight: '700',
    color: C.rojo,
    marginBottom: 25,
  },
  titulo: {
    fontSize: 27,
    fontWeight: '900',
    color: C.texto,
  },
  subtitulo: {
    fontSize: 14,
    color: C.secundario,
    marginTop: 8,
  },
  contenido: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 25,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seccion: {
    fontSize: 17,
    fontWeight: '900',
    color: C.rojo,
    marginTop: 18,
    marginBottom: 12,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 16,
    marginBottom: 12,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '800',
    color: C.texto,
  },
  textoSecundario: {
    fontSize: 13,
    color: C.secundario,
    marginTop: 6,
    lineHeight: 19,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  control: {
    backgroundColor: '#FFF0E3',
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlTexto: {
    fontSize: 23,
    fontWeight: '700',
    color: C.naranja,
  },
  cantidad: {
    fontSize: 17,
    fontWeight: '800',
    color: C.texto,
  },
  precio: {
    fontSize: 15,
    fontWeight: '800',
    color: C.rojo,
  },
  bloqueado: {
    fontSize: 11,
    color: C.rojo,
    marginTop: 12,
  },
  entrada: {
    minHeight: 115,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    backgroundColor: C.blanco,
    padding: 15,
    fontSize: 14,
    color: C.texto,
  },
  nota: {
    fontSize: 12,
    color: C.secundario,
    lineHeight: 19,
    marginTop: 18,
  },
  error: {
    color: C.rojo,
    fontSize: 13,
    marginTop: 15,
  },
  pie: {
    backgroundColor: C.blanco,
    borderTopWidth: 1,
    borderTopColor: C.borde,
    padding: 18,
  },
  boton: {
    backgroundColor: C.naranja,
    paddingVertical: 17,
    borderRadius: 13,
    alignItems: 'center',
  },
  deshabilitado: {
    opacity: 0.5,
  },
  botonTexto: {
    fontSize: 16,
    fontWeight: '800',
    color: C.blanco,
  },
});
