import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { CombinarPizzaModal } from '../components/CombinarPizzaModal';
import type { ProductoCatalogo } from '../../models/Catalogo';
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
  const [combinando, setCombinando] = useState(false);
  const [selecciones, setSelecciones] = useState<ProductoCatalogo[]>([]);
  const [repartiendo, setRepartiendo] = useState(false);
  const esPizza = (p: ProductoCatalogo) => /^pizzas?$/i.test(vm.categorias.find(c => c.id === p.categoriaId)?.nombre ?? '');
  const iniciarCombinacion = (p?: ProductoCatalogo) => {
    if (vm.agregando || (p && !esPizza(p))) return;
    setMensaje(''); setCombinando(true); vm.setCategoriaId(''); vm.setBusqueda('');
    setSelecciones(p ? [p] : vm.combinacionConfigurada?.especialidades ?? []);
  };
  const alternar = (p: ProductoCatalogo) => {
    if (!esPizza(p)) return;
    if (selecciones.some(s => s.id === p.id)) setSelecciones(selecciones.filter(s => s.id !== p.id));
    else if (selecciones.length < 4) { setSelecciones([...selecciones, p]); setMensaje(''); }
    else setMensaje('La jumbo permite hasta cuatro especialidades.');
  };
  const lista = useRef<FlatList<ProductoCatalogo>>(null);
  const visibles = combinando ? vm.productos.filter(esPizza) : vm.combinacionConfigurada ? [...vm.productos.filter(p => p.id === vm.seleccionado?.id), ...vm.productos.filter(p => p.id !== vm.seleccionado?.id)] : vm.productos;
  const Contenedor = embebido ? View : SafeAreaView;
  return (
    <Contenedor style={s.pantalla}>
      {!embebido && <View style={s.encabezado}>
        {!embebido && <Pressable accessibilityRole="button" onPress={onRegresar} disabled={vm.agregando}>
          <Text style={s.enlace}>← Regresar</Text>
        </Pressable>}
        <Text style={s.titulo}>Menú de Pizza Mya</Text>
      </View>}
      <View style={s.actualizacion}>
        <Text style={s.fecha}>
          {vm.cache?.fecha
            ? 'Actualizado: ' + new Date(vm.cache.fecha).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : 'Sin fecha de actualización'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Actualizar catálogo"
          disabled={vm.cargando || vm.agregando} style={[s.actualizar, (vm.cargando || vm.agregando) && s.deshabilitado]}
          onPress={() => void vm.cargar()}>
          <Text style={s.enlace}>↻ Actualizar</Text>
        </Pressable>
      </View>
      <View style={s.herramientas}>
        <Text style={s.secundario}>{combinando ? 'Seleccionadas: ' + selecciones.length + '/4' : 'Especialidades y productos'}</Text>
        <Pressable accessibilityRole="button" disabled={vm.agregando} style={s.combinar} onPress={() => combinando ? (setCombinando(false), setRepartiendo(false), setMensaje('')) : iniciarCombinacion()}><Text style={s.enlace}>{combinando ? 'Cancelar combinación' : 'Combinar'}</Text></Pressable>
      </View>
      {combinando && <View style={s.seleccionResumen}><Text style={s.descripcion}>{selecciones.length ? selecciones.map(p => p.nombre).join(' · ') : 'Selecciona de 2 a 4 especialidades.'}</Text><Text style={s.secundario}>{selecciones.length > 2 ? 'Disponible únicamente en jumbo.' : 'Mediana, grande o jumbo, según disponibilidad.'}</Text><Pressable accessibilityRole="button" disabled={selecciones.length < 2} onPress={() => setRepartiendo(true)} style={[s.continuar, selecciones.length < 2 && s.deshabilitado]}><Text style={s.blanco}>Elegir tamaño y reparto</Text></Pressable></View>}
      {vm.cache?.aviso && <Text style={s.avisoCache}>{vm.cache.aviso}.</Text>}
      {!!mensaje && <Text accessibilityRole="alert" style={s.exito}>{mensaje}</Text>}
      {vm.cargando ? <ActivityIndicator style={s.estado} size="large" color="#991F19" accessibilityLabel="Cargando catálogo" />
        : vm.error ? <View style={s.estado}>
          <Text accessibilityRole="alert" style={s.error}>{vm.error}</Text>
          <Pressable accessibilityRole="button" style={s.boton} onPress={() => void vm.cargar()}><Text style={s.blanco}>Reintentar</Text></Pressable>
        </View> : <FlatList
          ref={lista} style={s.lista} data={visibles} keyExtractor={p => p.id} contentContainerStyle={s.contenido}
          keyboardShouldPersistTaps="handled" extraData={[vm.seleccionado, vm.varianteId, vm.cantidad, vm.agregando, vm.errorAgregar, vm.orillaId, combinando, selecciones, vm.combinacionConfigurada]}
          ListHeaderComponent={<>
            <TextInput style={s.input} placeholder="Buscar productos" accessibilityLabel="Buscar productos"
              value={vm.busqueda} onChangeText={vm.setBusqueda} editable={!vm.agregando} />
            {!combinando && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categorias}>
              {[{ id: '', nombre: 'Todas' }, ...vm.categorias].map(c => <Pressable key={c.id}
                accessibilityRole="button" accessibilityState={{ selected: vm.categoriaId === c.id }} disabled={vm.agregando}
                style={[s.chip, vm.categoriaId === c.id && s.chipActivo]} onPress={() => vm.setCategoriaId(c.id)}>
                <Text style={vm.categoriaId === c.id ? s.blanco : s.enlace}>{c.nombre}</Text>
              </Pressable>)}
            </ScrollView>}
          </>}
          ListEmptyComponent={<Text style={s.estado}>No hay productos disponibles para esta búsqueda o categoría.</Text>}
          renderItem={({ item }) => {
            const abierto = !combinando && vm.seleccionado?.id === item.id;
            const marcada = selecciones.some(p => p.id === item.id);
            return <View style={[s.tarjeta, (abierto || (combinando && marcada)) && s.tarjetaAbierta]}>
              <Pressable accessibilityRole="button" accessibilityLabel={combinando ? `${marcada ? 'Quitar' : 'Seleccionar'} ${item.nombre} de combinación` : `${abierto ? 'Contraer' : 'Abrir'} ${item.nombre}`} accessibilityState={combinando ? {selected:marcada} : {expanded:abierto}} disabled={vm.agregando} onPress={() => combinando ? alternar(item) : abierto ? vm.contraer() : vm.seleccionar(item)} onLongPress={() => combinando ? alternar(item) : iniciarCombinacion(item)} delayLongPress={400} style={s.resumenProducto}>
                <View style={s.datosProducto}>
                  <Text style={s.nombre}>{combinando ? (marcada ? '✓ ' : '○ ') : ''}{abierto && vm.combinacionConfigurada ? vm.combinacionConfigurada.nombre : item.nombre}</Text>
                  <Text style={s.secundario}>{vm.categorias.find(c => c.id === item.categoriaId)?.nombre}</Text>
                </View>
                {!!item.tamanios.length && <Text style={s.precioDesde}>Desde {dinero(Math.min(...item.tamanios.map(t => t.precio)))}</Text>}
              </Pressable>
              {abierto && !!item.descripcion && <Text style={s.descripcion}>{item.descripcion}</Text>}
              {!abierto ? <Pressable accessibilityRole="button" disabled={vm.agregando || !item.tamanios.length}
                accessibilityLabel={`Seleccionar ${item.nombre}`} style={[s.botonSuave, !item.tamanios.length && s.deshabilitado]} onPress={() => { setMensaje(''); combinando ? alternar(item) : abierto ? vm.contraer() : vm.seleccionar(item); }} onLongPress={() => combinando ? alternar(item) : iniciarCombinacion(item)} delayLongPress={400}>
                <Text style={s.enlace}>{combinando ? (marcada ? '✓ Seleccionada' : 'Seleccionar especialidad') : item.tamanios.length ? 'Seleccionar tamaño' : 'Sin presentaciones disponibles'}</Text>
              </Pressable> : <>
                <Text style={s.etiqueta}>Tamaño o presentación</Text>
                {(vm.combinacionConfigurada ? item.tamanios.filter(t => t.id === vm.varianteId) : item.tamanios).map(t => <Pressable key={t.id} accessibilityRole="radio"
                  accessibilityLabel={`${t.nombre}, ${dinero(t.precio)}`} accessibilityState={{ checked: vm.varianteId === t.id }}
                  disabled={vm.agregando} style={[s.opcion, vm.varianteId === t.id && s.opcionActiva]} onPress={() => vm.setVarianteId(t.id)}>
                  <Text style={s.descripcion}>{vm.varianteId === t.id ? '●' : '○'} {t.nombre}</Text><Text style={s.enlace}>{dinero(t.precio)}</Text>
                </Pressable>)}
                {vm.combinacionConfigurada && <Pressable accessibilityRole="button" style={s.botonSuave} onPress={() => iniciarCombinacion()}><Text style={s.enlace}>Cambiar combinación</Text></Pressable>}
                {vm.esPizza && <>
                  <Text style={s.etiqueta}>Orilla</Text>
                  {[{ id: '', nombre: 'Sin orilla de queso', precios: [] }, ...vm.orillas].map(o =>
                    <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: vm.orillaId === o.id }}
                      disabled={vm.agregando} style={[s.opcion, vm.orillaId === o.id && s.opcionActiva]} onPress={() => vm.setOrillaId(o.id)}>
                      <Text style={s.descripcion}>{o.nombre}</Text>
                      <Text style={s.enlace}>{o.id ? '+' + dinero(o.precios.find(p => p.tamanioId === vm.variante?.tamanioId)?.precio ?? 0) : 'Sin recargo'}</Text>
                    </Pressable>)}
                </>}
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
                    <Text style={s.blanco}>{vm.agregando ? 'Agregando…' : `Agregar a comanda · ${dinero(vm.precioUnitario * vm.cantidad)}`}</Text>
                  </Pressable>
                </> : <Pressable accessibilityRole="button" style={s.boton} onPress={onCrearPedido}><Text style={s.blanco}>Abrir comanda para pedir</Text></Pressable>}
              </>}
            </View>;
          }}
          ListFooterComponent={pedidoId ? <Text style={s.aviso}>Los productos se agregan a la comanda local persistida. Esta acción no envía al POS.</Text> : undefined}
        />}
      {repartiendo && <CombinarPizzaModal productos={selecciones} onCerrar={() => setRepartiendo(false)} onConfirmar={c => { vm.configurarCombinacion(c); setRepartiendo(false); setCombinando(false); vm.setBusqueda(''); lista.current?.scrollToOffset({offset: 0, animated: true}); setMensaje('Combinación lista. Elige orilla y cantidad para agregarla.'); }} />}
    </Contenedor>
  );
}

const s = StyleSheet.create({
  herramientas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, gap: 8 }, combinar: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }, seleccionResumen: { marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFF0E3', gap: 6 }, continuar: { minHeight: 44, justifyContent: 'center', backgroundColor: '#991F19', borderRadius: 10, marginTop: 4 },
  exito: { paddingHorizontal: 20, paddingBottom: 8, color: '#227548', fontWeight: '700' },
  pantalla: { flex: 1, backgroundColor: '#FFF8F3' },
  lista: { flex: 1 },
  actualizacion: { marginHorizontal: 12, marginBottom: 8, paddingLeft: 12, paddingRight: 4, backgroundColor: '#F5E8DD', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fecha: { flex: 1, fontSize: 12, lineHeight: 17, color: '#67574E' },
  actualizar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  avisoCache: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 12, color: '#85766E' },
  encabezado: { padding: 16, gap: 8 }, titulo: { fontSize: 25, fontWeight: '900', color: '#991F19' },
  secundario: { fontSize: 13, color: '#85766E' }, contenido: { paddingHorizontal: 12, paddingBottom: 16 },
  enlace: { color: '#991F19', fontWeight: '700' }, blanco: { color: '#FFF', fontWeight: '700', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#F0E3DA', borderRadius: 12, padding: 14, backgroundColor: '#FFF', color: '#35251F' },
  categorias: { gap: 8, paddingVertical: 10 }, chip: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#F5E8DD' },
  chipActivo: { backgroundColor: '#991F19' }, tarjeta: { padding: 12, marginBottom: 8, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0E3DA' },
  tarjetaAbierta: { borderColor: '#FF7000' }, resumenProducto: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  datosProducto: { flex: 1, gap: 3 }, precioDesde: { color: '#991F19', fontSize: 13, fontWeight: '700', flexShrink: 0 },
  nombre: { fontSize: 17, fontWeight: '800', color: '#35251F' }, descripcion: { color: '#35251F', marginTop: 6, lineHeight: 21 },
  etiqueta: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: '#35251F' },
  opcion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#F0E3DA', marginBottom: 8, gap: 8 },
  opcionActiva: { borderColor: '#FF7000', backgroundColor: '#FFF0E3' }, fila: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  boton: { marginTop: 16, backgroundColor: '#991F19', padding: 16, borderRadius: 12 }, botonSuave: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, marginTop: 8, borderRadius: 8, backgroundColor: '#FFF0E3' },
  estado: { padding: 25, textAlign: 'center', color: '#85766E' }, error: { color: '#991F19', marginTop: 10 },
  deshabilitado: { opacity: 0.5 }, aviso: { fontSize: 12, color: '#85766E', paddingVertical: 14, lineHeight: 18 },
});
