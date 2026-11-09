import React, { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { ProductoCatalogo } from '../../models/Catalogo';
import { prepararCombinacion, tamaniosCombinables, type RepartoPizza, type CombinacionConfigurada } from '../../services/CombinacionesPizza';

export function CombinarPizzaModal({ productos, onCerrar, onConfirmar }: { productos: ProductoCatalogo[]; onCerrar: () => void; onConfirmar: (c: CombinacionConfigurada) => void }) {
  const tamanios = tamaniosCombinables(productos);
  const [tamanioId, setTamanioId] = useState(tamanios[0]?.tamanioId ?? '');
  const [reparto, setReparto] = useState<RepartoPizza>('iguales');
  const [destacada, setDestacada] = useState('');
  const tamanio = tamanios.find(t => t.tamanioId === tamanioId);
  const jumbo = /^(jumbo|jb)$/i.test(tamanio?.nombre.trim() ?? '');
  let resultado: CombinacionConfigurada | undefined;
  try { resultado = prepararCombinacion(productos, tamanioId, reparto, destacada); } catch {}
  const opcion = (label: string, selected: boolean, press: () => void) => <Pressable key={label} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={press} style={[s.opcion, selected && s.activa]}><Text style={s.texto}>{selected ? '● ' : '○ '}{label}</Text></Pressable>;
  return <Modal transparent animationType="slide" visible onRequestClose={onCerrar}>
    <View style={s.fondo}><View style={s.panel} accessibilityViewIsModal>
      <View style={s.cabecera}><Text accessibilityRole="header" style={s.titulo}>Combinar pizza</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar combinación" style={s.cerrar} onPress={onCerrar}><Text style={s.enlace}>Cerrar</Text></Pressable></View>
      <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
        <Text style={s.ayuda}>{productos.map(p => p.nombre).join(' · ')}</Text>
        {!tamanios.length ? <Text accessibilityRole="alert" style={s.error}>Estas especialidades no comparten un tamaño disponible. Regresa y cambia la selección.</Text> : <>
          <Text style={s.etiqueta}>Tamaño</Text>
          {tamanios.map(t => opcion(t.nombre, tamanioId === t.tamanioId, () => { setTamanioId(t.tamanioId); setReparto('iguales'); setDestacada(''); }))}
          <Text style={s.etiqueta}>¿Cómo se reparte?</Text>
          {opcion(productos.length === 2 ? 'Mitad y mitad' : productos.length === 3 ? 'Tres partes iguales' : 'Cuatro cuartos iguales', reparto === 'iguales', () => { setReparto('iguales'); setDestacada(''); })}
          {jumbo && productos.length < 4 && opcion(productos.length === 2 ? 'Un cuarto y tres cuartos' : 'Una mitad y dos cuartos', reparto !== 'iguales', () => { setReparto(productos.length === 2 ? 'cuarto' : 'mitad'); setDestacada(''); })}
          {reparto !== 'iguales' && <View><Text style={s.etiqueta}>¿Qué especialidad lleva {reparto === 'cuarto' ? '1/4' : '1/2'}?</Text>{productos.map(p => opcion(p.nombre, destacada === p.id, () => setDestacada(p.id)))}</View>}
          <View style={s.preview}><Text style={s.etiqueta}>Así aparecerá en comanda y cocina</Text><Text testID="vista-previa-combinacion" style={s.nombre}>{resultado?.nombre ?? 'Selecciona la especialidad de la porción indicada.'}</Text>{resultado && <Text style={s.precio}>${resultado.precio.toFixed(2)} · antes de orilla y extras</Text>}</View>
        </>}
      </ScrollView>
      <Pressable accessibilityRole="button" disabled={!resultado} style={[s.confirmar, !resultado && s.deshabilitado]} onPress={() => resultado && onConfirmar(resultado)}><Text style={s.blanco}>Confirmar combinación</Text></Pressable>
    </View></View>
  </Modal>;
}
const s = StyleSheet.create({ fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }, panel: { maxHeight: '90%', padding: 18, paddingBottom: 30, backgroundColor: '#FFF8F3', borderTopLeftRadius: 24, borderTopRightRadius: 24 }, cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, titulo: { fontSize: 23, fontWeight: '800', color: '#35251F' }, cerrar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }, enlace: { color: '#991F19', fontWeight: '700' }, contenido: { paddingBottom: 12 }, ayuda: { color: '#85766E', lineHeight: 21 }, etiqueta: { fontWeight: '700', color: '#35251F', marginTop: 14, marginBottom: 8 }, opcion: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: '#E5D4C7', borderRadius: 12, marginBottom: 8, justifyContent: 'center', backgroundColor: '#FFF' }, activa: { borderColor: '#FF7000', backgroundColor: '#FFF0E3' }, texto: { color: '#35251F', fontSize: 15 }, error: { color: '#991F19', paddingVertical: 20 }, preview: { padding: 12, backgroundColor: '#F5E8DD', borderRadius: 12, marginTop: 8 }, nombre: { fontWeight: '800', fontSize: 18, color: '#35251F', lineHeight: 25 }, precio: { marginTop: 8, color: '#67574E' }, confirmar: { marginTop: 10, minHeight: 48, justifyContent: 'center', backgroundColor: '#991F19', borderRadius: 12 }, blanco: { color: '#FFF', fontWeight: '700', textAlign: 'center' }, deshabilitado: { opacity: 0.45 } });
