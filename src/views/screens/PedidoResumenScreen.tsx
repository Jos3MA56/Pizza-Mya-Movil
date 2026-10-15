
import React from 'react';
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

import { usePedidoResumenViewModel } from '../../viewmodels/usePedidoResumenViewModel';

interface Props {
  pedidoId: string;
  onRegresar: () => void;
  onAgregarProductos: () => void;
  onEditarComanda: () => void;
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
  onAgregarProductos,
  onEditarComanda,
}: Props) {
  const {
    pedido,
    cargando,
    error,
    totalFormateado,
  } = usePedidoResumenViewModel(pedidoId);

  const productos = pedido?.productos ?? [];

  const productosVisibles = productos.filter(
    (producto) => producto.estado !== 'cancelado'
  );

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Pressable
          onPress={onRegresar}
          accessibilityRole="button"
        >
          <Text style={styles.regresar}>
            ← Regresar
          </Text>
        </Pressable>

        <Text style={styles.titulo}>
          Resumen del pedido
        </Text>

        <Text style={styles.subtitulo}>
          Revisa los productos registrados en la comanda.
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
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : !pedido ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>
            No se encontró la comanda.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.contenido}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
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

            <View style={styles.folio}>
              <Text style={styles.etiqueta}>
                REFERENCIA DE COMANDA
              </Text>

              <Text style={styles.folioTexto}>
                {pedido.folio ?? pedido.id}
              </Text>
            </View>

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
                  Esta mesa ya tiene una comanda abierta,
                  pero todavía no se han agregado productos.
                </Text>
              </View>
            ) : (
              productosVisibles.map((producto) => (
                <View
                  key={producto.id}
                  style={styles.producto}
                >
                  <View style={styles.cantidad}>
                    <Text style={styles.cantidadTexto}>
                      {producto.cantidad}x
                    </Text>
                  </View>

                  <View style={styles.productoDetalle}>
                    <Text style={styles.productoNombre}>
                      {producto.nombre}
                    </Text>

                    <Text style={styles.productoDescripcion}>
                      {producto.categoria}
                      {' · '}
                      {producto.estado.replace(/_/g, ' ')}
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

              <Pressable
                style={styles.agregar}
                onPress={onEditarComanda}
                accessibilityRole="button"
              >
              <Text style={styles.agregarTexto}>
                ✎ Editar comanda
              </Text>
              <Text style={styles.agregarTexto}>
                + Agregar productos
              </Text>
            </Pressable>

            <View style={styles.observaciones}>
              <Text style={styles.observacionesTitulo}>
                Observaciones para cocina
              </Text>

              <Text style={styles.observacionesTexto}>
                {pedido.observaciones?.trim() ||
                  'Sin observaciones registradas.'}
              </Text>
            </View>

            <Text style={styles.aviso}>
              Los datos se mantienen temporalmente en memoria.
              Esta pantalla no confirma el envío a cocina
              ni al POS.
            </Text>
          </ScrollView>

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
              onPress={() =>
                Alert.alert(
                  'Confirmación pendiente',
                  'El envío de comandas al POS y cocina ' +
                    'se integrará cuando esté disponible ' +
                    'el módulo de sincronización.'
                )
              }
              accessibilityRole="button"
            >
              <Text style={styles.botonTexto}>
                Confirmar pedido
              </Text>
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
  agregar: {
    borderWidth: 1.5,
    borderColor: C.naranja,
    borderStyle: 'dashed',
    backgroundColor: C.blanco,
    borderRadius: 13,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 14,
  },
  agregarTexto: {
    color: C.naranja,
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
