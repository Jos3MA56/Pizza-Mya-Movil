import React, { useState } from 'react';
import { ImagenProducto } from '../components/ImagenProducto';
import { View, Text, TextInput, Pressable, ScrollView, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useCatalogoViewModel } from '../../viewmodels/useCatalogoViewModel';

interface Props {
  pedidoId?: string;
  embebido?: boolean;
  onRegresar: () => void;
  onAgregado: () => void;
  onCrearPedido: () => void;
}
const dinero = (importe: number) => `$${importe.toFixed(2)}`;

export function CatalogoScreen({ pedidoId, onRegresar, onAgregado, onCrearPedido, embebido = false }: Props) {
  const { usuario } = useAuth();
  const vm = useCatalogoViewModel(pedidoId, String(usuario?.id ?? ''));
  const [mensaje, setMensaje] = useState('');
  const Contenedor = embebido ? View : SafeAreaView;
  return (
    <Contenedor style={s.pantalla}>
      <View style={s.encabezado}>
        {!embebido && <Pressable accessibilityRole="button" onPress={onRegresar} disabled={vm.agregando}>
          <Text style={s.enlace}>← Regresar</Text>
        </Pressable>}
        <Text style={s.titulo}>{embebido ? 'Catálogo de productos' : 'Menú de Pizza Mya'}</Text>
        <Text style={s.secundario}>{pedidoId ? 'Elige productos para tu comanda' : 'Categorías, productos y presentaciones'}</Text>
      </View>
      {!!mensaje && <Text accessibilityRole="alert" style={s.exito}>{mensaje}</Text>}
      {vm.cargando ? <ActivityIndicator style={s.estado} size="large" color="#991F19" accessibilityLabel="Cargando catálogo" />
        : vm.error ? <View style={s.estado}>
          <Text accessibilityRole="alert" style={s.error}>{vm.error}</Text>
          <Pressable accessibilityRole="button" style={s.boton} onPress={() => void vm.cargar()}><Text style={s.blanco}>Reintentar</Text></Pressable>
        </View> : <FlatList
          data={vm.productos} keyExtractor={p => p.id} contentContainerStyle={s.contenido}
          keyboardShouldPersistTaps="handled" extraData={[vm.seleccionado, vm.varianteId, vm.cantidad, vm.agregando, vm.errorAgregar]}
          ListHeaderComponent={<>
            <TextInput style={s.input} placeholder="Buscar productos" accessibilityLabel="Buscar productos"
              value={vm.busqueda} onChangeText={vm.setBusqueda} editable={!vm.agregando} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categorias}>
              {[{ id: '', nombre: 'Todas' }, ...vm.categorias].map(c => <Pressable key={c.id}
                accessibilityRole="button" accessibilityState={{ selected: vm.categoriaId === c.id }} disabled={vm.agregando}
                style={[s.chip, vm.categoriaId === c.id && s.chipActivo]} onPress={() => vm.setCategoriaId(c.id)}>
                <Text style={vm.categoriaId === c.id ? s.blanco : s.enlace}>{c.nombre}</Text>
              </Pressable>)}
            </ScrollView>
          </>}
          ListEmptyComponent={<Text style={s.estado}>No hay productos disponibles para esta búsqueda o categoría.</Text>}
          renderItem={({ item }) => {
            const abierto = vm.seleccionado?.id === item.id;
            return <View style={s.tarjeta}>
              <ImagenProducto nombre={item.nombre} url={abierto ? vm.variante?.imagenUrl ?? item.imagenUrl : item.imagenUrl} />
              <Text style={s.nombre}>{item.nombre}</Text>
              <Text style={s.secundario}>{vm.categorias.find(c => c.id === item.categoriaId)?.nombre}</Text>
              {!!item.descripcion && <Text style={s.descripcion}>{item.descripcion}</Text>}
              {!abierto ? <Pressable accessibilityRole="button" disabled={vm.agregando || !item.tamanios.length}
                style={[s.botonSuave, !item.tamanios.length && s.deshabilitado]} onPress={() => { setMensaje(''); vm.seleccionar(item); }}>
                <Text style={s.enlace}>{item.tamanios.length ? `Ver tamaños · desde ${dinero(Math.min(...item.tamanios.map(t => t.precio)))}` : 'Sin presentaciones disponibles'}</Text>
              </Pressable> : <>
                <Text style={s.etiqueta}>Tamaño o presentación</Text>
                {item.tamanios.map(t => <Pressable key={t.id} accessibilityRole="radio"
                  accessibilityLabel={`${t.nombre}, ${dinero(t.precio)}`} accessibilityState={{ checked: vm.varianteId === t.id }}
                  disabled={vm.agregando} style={[s.opcion, vm.varianteId === t.id && s.opcionActiva]} onPress={() => vm.setVarianteId(t.id)}>
                  <Text style={s.descripcion}>{vm.varianteId === t.id ? '●' : '○'} {t.nombre}</Text><Text style={s.enlace}>{dinero(t.precio)}</Text>
                </Pressable>)}
                {pedidoId ? <>
                  <Text style={s.etiqueta}>Cantidad</Text>
                  <View style={s.fila}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Disminuir cantidad" disabled={vm.agregando || vm.cantidad <= 1}
                      style={s.chip} onPress={() => vm.setCantidad(n => Math.max(1, n - 1))}><Text style={s.enlace}>−</Text></Pressable>
                    <Text style={s.nombre}>{vm.cantidad}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Aumentar cantidad" disabled={vm.agregando || vm.cantidad >= 99}
                      style={s.chip} onPress={() => vm.setCantidad(n => Math.min(99, n + 1))}><Text style={s.enlace}>＋</Text></Pressable>
                  </View>
                  {vm.errorAgregar && <Text accessibilityRole="alert" style={s.error}>{vm.errorAgregar}</Text>}
                  <Pressable accessibilityRole="button" disabled={vm.agregando || !vm.variante} style={[s.boton, vm.agregando && s.deshabilitado]}
                    onPress={async () => { if (await vm.agregar()) { setMensaje('Producto agregado a tu comanda. Puedes seguir eligiendo.'); vm.setCantidad(1); onAgregado(); } }}>
                    <Text style={s.blanco}>{vm.agregando ? 'Agregando…' : `Agregar a comanda · ${dinero((vm.variante?.precio ?? 0) * vm.cantidad)}`}</Text>
                  </Pressable>
                </> : <Pressable accessibilityRole="button" style={s.boton} onPress={onCrearPedido}><Text style={s.blanco}>Abrir comanda para pedir</Text></Pressable>}
              </>}
            </View>;
          }}
          ListFooterComponent={pedidoId ? <Text style={s.aviso}>Los productos se agregan a la comanda local de esta sesión. Esta acción no envía al POS.</Text> : null}
        />}
    </Contenedor>
  );
}

const s = StyleSheet.create({
  exito: { paddingHorizontal: 20, paddingBottom: 8, color: '#227548', fontWeight: '700' },
  pantalla: { flex: 1, backgroundColor: '#FFF8F3' },
  encabezado: { padding: 20, gap: 8 }, titulo: { fontSize: 25, fontWeight: '900', color: '#991F19' },
  secundario: { fontSize: 13, color: '#85766E' }, contenido: { paddingHorizontal: 18, paddingBottom: 32 },
  enlace: { color: '#991F19', fontWeight: '700' }, blanco: { color: '#FFF', fontWeight: '700', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#F0E3DA', borderRadius: 12, padding: 14, backgroundColor: '#FFF', color: '#35251F' },
  categorias: { gap: 8, paddingVertical: 16 }, chip: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#F5E8DD' },
  chipActivo: { backgroundColor: '#991F19' }, tarjeta: { padding: 18, marginBottom: 14, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0E3DA' },
  nombre: { fontSize: 18, fontWeight: '800', color: '#35251F' }, descripcion: { color: '#35251F', marginTop: 6, lineHeight: 21 },
  etiqueta: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: '#35251F' },
  opcion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#F0E3DA', marginBottom: 8, gap: 8 },
  opcionActiva: { borderColor: '#FF7000', backgroundColor: '#FFF0E3' }, fila: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  boton: { marginTop: 16, backgroundColor: '#991F19', padding: 16, borderRadius: 12 }, botonSuave: { padding: 12, marginTop: 14, borderRadius: 10, backgroundColor: '#FFF0E3' },
  estado: { padding: 25, textAlign: 'center', color: '#85766E' }, error: { color: '#991F19', marginTop: 10 },
  deshabilitado: { opacity: 0.5 }, aviso: { fontSize: 12, color: '#85766E', paddingVertical: 14, lineHeight: 18 },
});
