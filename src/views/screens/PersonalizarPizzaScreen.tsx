
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  TamanioPizza,
  ModalidadPizza,
  EspecialidadSeleccionada,
  PersonalizacionPizza,
} from '../../models/PersonalizacionPizza';

import { calcularPrecioPizza } from '../../services/calcularPrecioPizza';

interface Props {
  onRegresar: () => void;
  onContinuar: (pizza: PersonalizacionPizza) => void;
}

// Datos exclusivos de demostración.
// No representan el catálogo ni los precios oficiales de Pizza Mya.
const PRECIOS_DEMO: Record<TamanioPizza, Record<string, number>> = {
  IND: { hawaiana: 12000, pepperoni: 13000, mexicana: 14000 },
  MD: { hawaiana: 25000, pepperoni: 28000, mexicana: 27000 },
  GD: { hawaiana: 32000, pepperoni: 35000, mexicana: 34000 },
  JB: { hawaiana: 41000, pepperoni: 44000, mexicana: 43000 },
};

const ESPECIALIDADES = [
  { id: 'hawaiana', nombre: 'Hawaiana' },
  { id: 'pepperoni', nombre: 'Pepperoni' },
  { id: 'mexicana', nombre: 'Mexicana' },
];

const TAMANIOS: TamanioPizza[] = ['IND', 'MD', 'GD', 'JB'];

function dinero(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}

const C = {
  fondo: '#FFF8F3',
  blanco: '#FFFFFF',
  naranja: '#FF7000',
  rojo: '#991F19',
  texto: '#35251F',
  secundario: '#85766E',
  borde: '#F0E3DA',
  seleccion: '#FFF0E3',
};

export function PersonalizarPizzaScreen({
  onRegresar,
  onContinuar,
}: Props) {
  const [tamanio, setTamanio] = useState<TamanioPizza>('MD');

  const [modalidad, setModalidad] =
    useState<ModalidadPizza>('completa');

  const [primera, setPrimera] = useState('hawaiana');
  const [segunda, setSegunda] = useState('pepperoni');
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');

  const personalizacion = useMemo<PersonalizacionPizza>(() => {
    const obtenerEspecialidad = (
      id: string
    ): EspecialidadSeleccionada => ({
      id,
      nombre:
        ESPECIALIDADES.find((e) => e.id === id)?.nombre ?? id,
      precioCentavos: PRECIOS_DEMO[tamanio][id],
    });

    return {
      tamanio,
      modalidad,
      especialidadPrincipal: obtenerEspecialidad(primera),
      segundaEspecialidad:
        modalidad === 'mitad_mitad'
          ? obtenerEspecialidad(segunda)
          : undefined,
      ingredientesExtras: [],
      ingredientesSin: [],
      cantidad,
      observaciones,
    };
  }, [tamanio, modalidad, primera, segunda, cantidad, observaciones]);

  const precio = useMemo(
    () => calcularPrecioPizza(personalizacion),
    [personalizacion]
  );

  const continuar = () => {
    if (
      modalidad === 'mitad_mitad' &&
      primera === segunda
    ) {
      Alert.alert(
        'Selecciona otra especialidad',
        'Para mitad y mitad debes elegir dos especialidades diferentes.'
      );
      return;
    }

    onContinuar(personalizacion);
  };

  const selectorEspecialidades = (
    titulo: string,
    valor: string,
    onChange: (id: string) => void
  ) => (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>

      {ESPECIALIDADES.map((especialidad) => (
        <Pressable
          key={especialidad.id}
          style={[
            styles.opcion,
            valor === especialidad.id && styles.opcionActiva,
          ]}
          onPress={() => onChange(especialidad.id)}
          accessibilityRole="radio"
          accessibilityState={{
            selected: valor === especialidad.id,
          }}
        >
          <View style={styles.opcionInfo}>
            <Text style={styles.opcionNombre}>
              {especialidad.nombre}
            </Text>

            <Text style={styles.opcionPrecio}>
              {dinero(PRECIOS_DEMO[tamanio][especialidad.id])}
            </Text>
          </View>

          <Text style={styles.radio}>
            {valor === especialidad.id ? '◉' : '○'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Pressable onPress={onRegresar}>
          <Text style={styles.regresar}>← Regresar</Text>
        </Pressable>

        <Text style={styles.titulo}>
          Personaliza tu pizza
        </Text>

        <Text style={styles.subtitulo}>
          Selecciona el tamaño y las especialidades.
        </Text>
      </View>

      <ScrollView
        style={styles.contenido}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avisoDemo}>
          <Text style={styles.avisoTexto}>
            Modo demostración: precios de ejemplo.
          </Text>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Tamaño</Text>

          <View style={styles.tamanios}>
            {TAMANIOS.map((opcion) => (
              <Pressable
                key={opcion}
                style={[
                  styles.tamanio,
                  tamanio === opcion && styles.tamanioActivo,
                ]}
                onPress={() => setTamanio(opcion)}
              >
                <Text
                  style={[
                    styles.tamanioTexto,
                    tamanio === opcion && styles.textoActivo,
                  ]}
                >
                  {opcion}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>
            ¿Cómo quieres tu pizza?
          </Text>

          <View style={styles.modalidades}>
            <Pressable
              style={[
                styles.modalidad,
                modalidad === 'completa' && styles.opcionActiva,
              ]}
              onPress={() => setModalidad('completa')}
            >
              <Text style={styles.modalidadIcono}>🍕</Text>
              <Text style={styles.modalidadTexto}>
                Completa
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalidad,
                modalidad === 'mitad_mitad' && styles.opcionActiva,
              ]}
              onPress={() => {
                if (primera === segunda) {
                    const alternativa = ESPECIALIDADES.find(
                    (especialidad) => especialidad.id !== primera
                );

                if (alternativa) {
                    setSegunda(alternativa.id);
                }
              }

                setModalidad('mitad_mitad');
            }}
            >
              <Text style={styles.modalidadIcono}>◐</Text>
              <Text style={styles.modalidadTexto}>
                Mitad y mitad
              </Text>
            </Pressable>
          </View>
        </View>

        {selectorEspecialidades(
          modalidad === 'mitad_mitad'
            ? 'Primera mitad'
            : 'Especialidad',
          primera,
(id) => {
  setPrimera(id);

  if (modalidad === 'mitad_mitad' && id === segunda) {
    const alternativa = ESPECIALIDADES.find(
      (especialidad) => especialidad.id !== id
    );

    if (alternativa) {
      setSegunda(alternativa.id);
    }
  }
}
        )}

        {modalidad === 'mitad_mitad' &&
            selectorEspecialidades(
            'Segunda mitad',
            segunda,
            (id) => {
                if (id === primera) {
                Alert.alert(
                    'Especialidad repetida',
                    'Selecciona una especialidad diferente para la segunda mitad.'
                );
                return;
            }
            setSegunda(id);
            }
        )}

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Cantidad</Text>

          <View style={styles.cantidadFila}>
            <Pressable
              style={styles.control}
              disabled={cantidad <= 1}
              onPress={() => setCantidad((n) => Math.max(1, n - 1))}
            >
              <Text style={styles.controlTexto}>−</Text>
            </Pressable>

            <Text style={styles.cantidadNumero}>
              {cantidad}
            </Text>

            <Pressable
              style={styles.control}
              disabled={cantidad >= 99}
              onPress={() => setCantidad((n) => Math.min(99, n + 1))}
            >
              <Text style={styles.controlTexto}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>
            Observaciones
          </Text>

          <TextInput
            style={styles.entrada}
            placeholder="Indicaciones para cocina..."
            placeholderTextColor={C.secundario}
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.nota}>
          Ingredientes adicionales, masa, orilla y complementos
          se incorporarán en el Paso 5 utilizando
          las opciones disponibles del catálogo.
        </Text>
      </ScrollView>

      <View style={styles.pie}>
        <View style={styles.precioFila}>
          <Text style={styles.precioEtiqueta}>
            Precio base unitario
          </Text>
          <Text style={styles.precioBase}>
            {dinero(precio.precioBaseCentavos)}
          </Text>
        </View>

        <View style={styles.precioFila}>
          <Text style={styles.totalEtiqueta}>
            Total demostrativo
          </Text>
          <Text style={styles.total}>
            {dinero(precio.totalCentavos)}
          </Text>
        </View>

        <Pressable
          style={styles.boton}
          onPress={continuar}
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  regresar: {
    color: C.rojo,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 22,
  },
  titulo: {
    fontSize: 27,
    fontWeight: '900',
    color: C.texto,
  },
  subtitulo: {
    color: C.secundario,
    fontSize: 14,
    marginTop: 8,
  },
  contenido: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 30 },
  avisoDemo: {
    backgroundColor: '#FFF0E3',
    borderRadius: 10,
    padding: 12,
  },
  avisoTexto: {
    color: C.rojo,
    fontSize: 12,
    fontWeight: '700',
  },
  seccion: { marginTop: 22 },
  seccionTitulo: {
    fontSize: 17,
    fontWeight: '900',
    color: C.rojo,
    marginBottom: 12,
  },
  tamanios: { flexDirection: 'row', gap: 9 },
  tamanio: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    paddingVertical: 15,
  },
  tamanioActivo: {
    backgroundColor: C.naranja,
    borderColor: C.naranja,
  },
  tamanioTexto: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },
  textoActivo: { color: C.blanco },
  modalidades: { flexDirection: 'row', gap: 12 },
  modalidad: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    borderRadius: 15,
    paddingVertical: 19,
    alignItems: 'center',
    gap: 8,
  },
  modalidadIcono: { fontSize: 27 },
  modalidadTexto: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  opcion: {
    backgroundColor: C.blanco,
    borderWidth: 1.5,
    borderColor: C.borde,
    borderRadius: 13,
    padding: 16,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  opcionActiva: {
    borderColor: C.naranja,
    backgroundColor: C.seleccion,
  },
  opcionInfo: { gap: 5 },
  opcionNombre: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },
  opcionPrecio: { fontSize: 12, color: C.secundario },
  radio: { fontSize: 22, color: C.naranja },
  cantidadFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  control: {
    width: 43,
    height: 43,
    borderRadius: 11,
    backgroundColor: C.seleccion,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlTexto: {
    fontSize: 25,
    fontWeight: '800',
    color: C.naranja,
  },
  cantidadNumero: {
    fontSize: 19,
    fontWeight: '900',
    color: C.texto,
  },
  entrada: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 13,
    minHeight: 95,
    padding: 14,
    fontSize: 14,
    color: C.texto,
  },
  nota: {
    fontSize: 12,
    lineHeight: 19,
    color: C.secundario,
    marginTop: 20,
  },
  pie: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 18,
    backgroundColor: C.blanco,
    borderTopWidth: 1,
    borderTopColor: C.borde,
    gap: 10,
  },
  precioFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  precioEtiqueta: { color: C.secundario, fontSize: 12 },
  precioBase: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  totalEtiqueta: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  total: {
    color: C.rojo,
    fontSize: 22,
    fontWeight: '900',
  },
  boton: {
    backgroundColor: C.naranja,
    paddingVertical: 17,
    borderRadius: 13,
    alignItems: 'center',
    marginTop: 5,
  },
  botonTexto: {
    fontSize: 16,
    color: C.blanco,
    fontWeight: '800',
  },
});
