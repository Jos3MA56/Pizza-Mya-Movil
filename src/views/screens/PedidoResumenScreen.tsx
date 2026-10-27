
import React, { useState } from 'react';

import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogoScreen } from './CatalogoScreen';

import { usePedidoResumenViewModel } from '../../viewmodels/usePedidoResumenViewModel';

interface Props {
  pedidoId: string;
  onRegresar: () => void;
  onEditarComanda: () => void;
  onAgregarProductos: () => void;
}

const C = {
  fondo: '#FFF8F3',
  blanco: '#FFFFFF',
  naranja: '#FF7000',
  rojo: '#991F19',
  texto: '#35251F',
  secundario: '#85766E',
  borde: '#F0E3DA',
  suave: '#FFF0E3',
};

export function PedidoResumenScreen({
  pedidoId,
  onRegresar,
  onEditarComanda,
  onAgregarProductos,
}: Props) {
  const {
    pedido,
    cargando,
    error,
    totalFormateado,
  } = usePedidoResumenViewModel(pedidoId);

  const [seccion, setSeccion] = useState<
    'catalogo' | 'resumen'
  >('catalogo');

  const productos = pedido?.productos ?? [];

  const productosVisibles = productos.filter(
    (producto) => producto.estado !== 'cancelado'
  );

  const cantidadProductos = productosVisibles.reduce(
    (total, producto) => total + producto.cantidad,
    0
  );

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Pressable
          onPress={onRegresar}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Text style={styles.regresar}>
            ← Regresar
          </Text>
        </Pressable>

        <Text style={styles.titulo}>
          Comanda
        </Text>

        <Text style={styles.subtitulo}>
          Elige productos y revisa tu pedido sin salir
          de la comanda.
        </Text>
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator
            size="large"
            color={C.naranja}
          />
          <Text style={styles.ayuda}>
            Cargando comanda...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>
            {error}
          </Text>
        </View>
      ) : !pedido ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>
            No se encontró la comanda.
          </Text>
        </View>
      ) : (
        <>
          {/* PESTAÑAS */}
          <View style={styles.pestanas}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{
                selected: seccion === 'catalogo',
              }}
              onPress={() => setSeccion('catalogo')}
              style={[
                styles.pestana,
                seccion === 'catalogo' &&
                  styles.pestanaActiva,
              ]}
            >
              <Text style={styles.agregarTexto}>
                Catálogo de productos
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{
                selected: seccion === 'resumen',
              }}
              onPress={() => setSeccion('resumen')}
              style={[
                styles.pestana,
                seccion === 'resumen' &&
                  styles.pestanaActiva,
              ]}
            >
              <Text style={styles.agregarTexto}>
                Mi pedido ({cantidadProductos})
              </Text>
            </Pressable>
          </View>

          {seccion === 'catalogo' ? (
            <CatalogoScreen
              embebido
              pedidoId={pedidoId}
              onRegresar={() =>
                setSeccion('resumen')
              }
              onAgregado={() => undefined}
              onCrearPedido={() => undefined}
            />
          ) : (
            <ScrollView
              style={styles.contenido}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              {/* MESA */}
              <View style={styles.tarjetaMesa}>
                <View>
                  <Text style={styles.etiqueta}>
                    MESA ASIGNADA
                  </Text>

                  <Text style={styles.numeroMesa}>
                    {pedido.mesaId !== undefined
                      ? `Mesa ${pedido.mesaId}`
                      : 'Sin mesa'}
                  </Text>
                </View>

                <View style={styles.estado}>
                  <Text style={styles.estadoTexto}>
                    {pedido.estado === 'borrador'
                      ? 'Borrador local'
                      : pedido.estado === 'enviado'
                        ? 'Enviado (sin verificar)'
                        : 'Cancelado'}
                  </Text>
                </View>
              </View>

              {/* FOLIO */}
              <View style={styles.folio}>
                <Text style={styles.etiqueta}>
                  REFERENCIA DE COMANDA
                </Text>

                <Text style={styles.folioTexto}>
                  {pedido.folio ?? pedido.id}
                </Text>
              </View>

              {/* PRODUCTOS */}
              <View style={styles.seccionTitulo}>
                <Text style={styles.tituloProductos}>
                  Productos de la comanda
                </Text>

                <Text style={styles.contador}>
                  {productosVisibles.length} registros
                </Text>
              </View>

              {productosVisibles.length === 0 ? (
                <View style={styles.vacio}>
                  <Text style={styles.vacioIcono}>
                    🍕
                  </Text>

                  <Text style={styles.vacioTitulo}>
                    Comanda sin productos
                  </Text>

                  <Text style={styles.vacioDescripcion}>
                    Esta mesa ya tiene una comanda
                    abierta, pero todavía no se han
                    agregado productos.
                  </Text>
                </View>
              ) : (
                productosVisibles.map((producto) => (
                  <View
                    key={producto.id}
                    style={styles.producto}
                  >
                    <View style={styles.cantidad}>
                      <Text
                        style={styles.cantidadTexto}
                      >
                        {producto.cantidad}x
                      </Text>
                    </View>

                    <View style={styles.productoDetalle}>
                      <Text
                        style={styles.productoNombre}
                      >
                        {producto.nombre}
                      </Text>

                      <Text
                        style={styles.productoDescripcion}
                      >
                        {producto.categoria}
                        {producto.tamanio
                          ? ' · ' + producto.tamanio
                          : ''}
                        {' · '}
                        {producto.estado.replace(
                          /_/g,
                          ' '
                        )}
                      </Text>

                      {producto.observaciones ? (
                        <Text style={styles.nota}>
                          Nota: {producto.observaciones}
                        </Text>
                      ) : null}
                    </View>

                    <Text style={styles.precio}>
                      ${producto.subtotal.toFixed(2)}
                    </Text>
                  </View>
                ))
              )}

              {/* ACCIONES DEL PEDIDO */}
              <View style={styles.accionesPedido}>
                {/* CATÁLOGO REAL */}
                <Pressable
                  style={styles.botonAgregar}
                  onPress={() =>
                    setSeccion('catalogo')
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Agregar productos del catálogo"
                >
                  <Text style={styles.textoAgregar}>
                    + Agregar productos del catálogo
                  </Text>
                </Pressable>

                {/* EDITAR COMANDA */}
                <Pressable
                  style={styles.botonEditar}
                  onPress={onEditarComanda}
                  accessibilityRole="button"
                  accessibilityLabel="Editar comanda"
                >
                  <Text style={styles.textoEditar}>
                    ✎ Editar comanda
                  </Text>
                </Pressable>

                {/* PERSONALIZACIÓN DEMOSTRATIVA */}
                <Pressable
                  style={styles.botonDemo}
                  onPress={onAgregarProductos}
                  accessibilityRole="button"
                  accessibilityLabel="Personalizar pizza demostrativa"
                >
                  <Text style={styles.textoDemo}>
                    🍕 Personalizar pizza (demo)
                  </Text>
                </Pressable>
              </View>

              {/* OBSERVACIONES */}
              <View style={styles.observaciones}>
                <Text
                  style={styles.observacionesTitulo}
                >
                  Observaciones para cocina
                </Text>

                <Text
                  style={styles.observacionesTexto}
                >
                  {pedido.observaciones?.trim() ||
                    'Sin observaciones registradas.'}
                </Text>
              </View>

              <Text style={styles.aviso}>
                Esta pantalla no confirma por sí sola
                el envío de la comanda al POS o cocina.
                La personalización demostrativa todavía
                no guarda productos en el pedido.
              </Text>
            </ScrollView>
          )}

          {/* PIE DE PANTALLA */}
          <View style={styles.pie}>
            <View style={styles.totalFila}>
              <Text style={styles.totalEtiqueta}>
                Total de la comanda
              </Text>

              <Text style={styles.total}>
                {totalFormateado}
              </Text>
            </View>

            <Pressable
              style={styles.boton}
              onPress={() => {
                if (seccion === 'catalogo') {
                  setSeccion('resumen');
                  return;
                }

                Alert.alert(
                  'Confirmación pendiente',
                  'El envío de comandas al POS y ' +
                    'cocina requiere completar su ' +
                    'integración y validación.'
                );
              }}
              accessibilityRole="button"
            >
              <Text style={styles.botonTexto}>
                {seccion === 'catalogo'
                  ? 'Ver mi pedido'
                  : 'Confirmar pedido'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pestanas: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },

  pestana: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
  },

  pestanaActiva: {
    backgroundColor: '#FFE7D2',
  },

  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  encabezado: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },

  regresar: {
    fontSize: 15,
    color: C.rojo,
    fontWeight: '700',
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
    paddingBottom: 24,
  },

  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    gap: 12,
  },

  ayuda: {
    color: C.secundario,
  },

  error: {
    color: C.rojo,
    textAlign: 'center',
  },

  tarjetaMesa: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  etiqueta: {
    fontSize: 10,
    fontWeight: '800',
    color: C.secundario,
    letterSpacing: 0.6,
  },

  numeroMesa: {
    fontSize: 22,
    fontWeight: '900',
    color: C.rojo,
    marginTop: 6,
  },

  estado: {
    backgroundColor: C.suave,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: '48%',
  },

  estadoTexto: {
    color: C.rojo,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  folio: {
    marginTop: 18,
    marginBottom: 22,
    paddingHorizontal: 3,
  },

  folioTexto: {
    fontSize: 12,
    color: C.texto,
    marginTop: 7,
  },

  seccionTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  tituloProductos: {
    fontSize: 17,
    fontWeight: '900',
    color: C.rojo,
  },

  contador: {
    fontSize: 11,
    color: C.secundario,
  },

  vacio: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderColor: C.borde,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
  },

  vacioIcono: {
    fontSize: 35,
    marginBottom: 12,
  },

  vacioTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
    textAlign: 'center',
  },

  vacioDescripcion: {
    fontSize: 13,
    color: C.secundario,
    textAlign: 'center',
    marginTop: 9,
    lineHeight: 19,
  },

  producto: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  cantidad: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: C.suave,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cantidadTexto: {
    fontWeight: '900',
    color: C.rojo,
  },

  productoDetalle: {
    flex: 1,
  },

  productoNombre: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },

  productoDescripcion: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 5,
    textTransform: 'capitalize',
  },

  nota: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 5,
  },

  precio: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
  },

  agregarTexto: {
    color: C.naranja,
    fontSize: 15,
    fontWeight: '800',
  },

  accionesPedido: {
    marginTop: 16,
    gap: 12,
  },

  botonAgregar: {
    backgroundColor: C.naranja,
    borderRadius: 13,
    paddingVertical: 17,
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  textoAgregar: {
    color: C.blanco,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  botonEditar: {
    backgroundColor: C.blanco,
    borderWidth: 1.5,
    borderColor: C.rojo,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
  },

  textoEditar: {
    color: C.rojo,
    fontSize: 15,
    fontWeight: '800',
  },

  botonDemo: {
    backgroundColor: C.suave,
    borderWidth: 1.5,
    borderColor: C.naranja,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
  },

  textoDemo: {
    color: C.rojo,
    fontSize: 15,
    fontWeight: '800',
  },

  observaciones: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    padding: 16,
    marginTop: 22,
  },

  observacionesTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },

  observacionesTexto: {
    fontSize: 13,
    color: C.secundario,
    marginTop: 9,
  },

  aviso: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 17,
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
    alignItems: 'center',
    marginBottom: 15,
  },

  totalEtiqueta: {
    fontSize: 15,
    fontWeight: '700',
    color: C.texto,
  },

  total: {
    fontSize: 24,
    fontWeight: '900',
    color: C.rojo,
  },

  boton: {
    backgroundColor: C.naranja,
    borderRadius: 13,
    paddingVertical: 17,
    alignItems: 'center',
  },

  botonTexto: {
    fontSize: 16,
    fontWeight: '800',
    color: C.blanco,
  },
});
