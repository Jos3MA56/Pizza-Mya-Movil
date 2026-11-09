import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EstadoCocinaPOS, RenglonCocina } from '../../services/CocinaPOSService';
import type { CocinaViewModel } from '../../viewmodels/useCocinaViewModel';

export const COCINA_COLORS = {
  background: '#FFF8F3', white: '#FFFFFF', red: '#991F19', text: '#35251F',
  muted: '#6D5A51', border: '#E9DBD0', green: '#246243',
};

const C = COCINA_COLORS;
const ESTADOS: Record<EstadoCocinaPOS, { nombre: string; fondo: string; borde: string; texto: string }> = {
  pendiente: { nombre: 'Entrada', fondo: C.white, borde: '#BEAAA0', texto: C.muted },
  en_preparacion: { nombre: 'En preparación', fondo: '#FFE3C7', borde: '#D76613', texto: '#7A380E' },
  listo: { nombre: 'Lista', fondo: '#DDF2E3', borde: '#35945B', texto: C.green },
};
const DOBLE_TOQUE_MS = 400;

export function RenglonCocinaView({ renglon, vm, historial = false, numero }: {
  renglon: RenglonCocina;
  vm: CocinaViewModel;
  historial?: boolean;
  numero?: number;
}) {
  const [marcado, setMarcado] = useState(false);
  const ultimo = useRef<{ fecha: number; version: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  const { producto, ticket, estado, version } = renglon;
  const apariencia = ESTADOS[estado];
  const finalizado = historial || estado === 'listo';
  const bloqueado = !vm.conectado || vm.actualizando !== null;
  const destino = ticket.tipoPedido === 'para_llevar' ? `Para llevar · ${ticket.nombreCliente}` : `Mesa ${ticket.mesa}`;
  const siguiente = estado === 'pendiente' ? 'Pasar a preparación' : 'Marcar como lista';
  const hora = new Date(producto.recibidaEn ?? ticket.fecha).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  });

  function limpiarToque() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    ultimo.current = null;
    setMarcado(false);
  }

  function avanzar() {
    limpiarToque();
    if (!bloqueado && !finalizado) void vm.avanzar(renglon);
  }

  function tocar() {
    if (bloqueado || finalizado) return;
    const ahora = Date.now();
    const anterior = ultimo.current;
    if (anterior?.version === version && ahora - anterior.fecha <= DOBLE_TOQUE_MS) {
      avanzar();
      return;
    }
    if (timer.current !== null) clearTimeout(timer.current);
    ultimo.current = { fecha: ahora, version };
    setMarcado(true);
    timer.current = setTimeout(limpiarToque, DOBLE_TOQUE_MS);
  }

  const contenido = (
    <>
      {numero !== undefined && <Text style={[styles.number, { color: apariencia.texto }]}>{numero}.</Text>}
      <View style={styles.product}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{producto.cantidad > 1 ? `${producto.cantidad} × ` : ''}{producto.nombre}</Text>
          <Text style={[styles.badge, { color: apariencia.texto }]}>{apariencia.nombre}</Text>
        </View>
        <Text style={styles.detail}>{[producto.tamanio, destino].filter(Boolean).join(' · ')}</Text>
        {!!producto.orillaNombre && <Text style={styles.note}>Orilla: {producto.orillaNombre}</Text>}
        {!!producto.observaciones && <Text style={styles.note}>Nota: {producto.observaciones}</Text>}
        {!!ticket.observaciones && <Text style={styles.note}>Comanda: {ticket.observaciones}</Text>}
        <Text style={styles.meta}>{ticket.folio} · {hora}</Text>
        {historial && <Text style={styles.meta}>{producto.entregadaEn ? 'Lista · ' + new Date(producto.entregadaEn).toLocaleString('es-MX') : 'Lista · registro anterior'}</Text>}
      </View>
      {vm.actualizando === renglon.clave && <ActivityIndicator accessibilityLabel="Actualizando estado" color={C.red} />}
    </>
  );
  const estilo = [styles.row, { backgroundColor: apariencia.fondo, borderLeftColor: apariencia.borde }];

  if (finalizado) return <View style={estilo}>{contenido}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${producto.cantidad} por ${producto.nombre}, ${destino}. ${apariencia.nombre}.`}
      accessibilityHint="Toca dos veces el renglón para avanzar."
      accessibilityState={{ disabled: bloqueado, busy: vm.actualizando === renglon.clave }}
      accessibilityActions={[{ name: 'activate', label: siguiente }]}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'activate') avanzar(); }}
      disabled={bloqueado}
      onPress={tocar}
      style={[...estilo, marcado && styles.marked]}
    >
      {contenido}
    </Pressable>
  );
}

export function CocinaEstacionScreen({ vm, titulo, onMenu, onVolver }: { vm: CocinaViewModel; titulo: string; onMenu?: () => void; onVolver?: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.heading}>
        <View style={styles.headerText}>
          {
            onVolver ? <Pressable accessibilityRole="button" onPress={onVolver} hitSlop={8} style={styles.backToStations}>
              <Ionicons name="chevron-back" size={16} color={C.red} />
              <Text style={styles.linkText}>Estaciones</Text>
            </Pressable> : <Text style={styles.kicker}>COCINA</Text>
          }
          <Text accessibilityRole="header" style={styles.title}>{titulo}</Text>
        </View>
        {onMenu && <Pressable accessibilityRole="button" accessibilityLabel="Menú de cocina" onPress={onMenu} style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={C.red} />
        </Pressable>}
      </View>
      <View style={styles.legend}>
        {Object.values(ESTADOS).map(estado => <View key={estado.nombre} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: estado.fondo, borderColor: estado.borde }]} />
          <Text style={styles.legendText}>{estado.nombre}</Text>
        </View>)}
      </View>
      <Text style={styles.hint}>Doble toque para avanzar al siguiente estado.</Text>
      {!!vm.error && <Text accessibilityRole="alert" style={styles.error}>{vm.error}</Text>}
      <FlatList
        data={vm.renglones}
        keyExtractor={r => r.clave}
        renderItem={({ item, index }) => <RenglonCocinaView renglon={item} vm={vm} numero={index + 1} />}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshing={vm.cargando}
        onRefresh={() => void vm.cargar()}
        ListEmptyComponent={vm.cargando ? <ActivityIndicator style={styles.empty} color={C.red} /> : (
          <Text style={styles.empty}>{vm.conectado ? 'Los productos aparecerán aquí al enviar una comanda.' : 'Esperando conexión con el POS'}</Text>
        )}
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  backToStations: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 32 },
  linkText: { fontSize: 13, fontWeight: '700', color: C.red },
  headerText: { flex: 1, gap: 2 },
  kicker: { fontSize: 11, letterSpacing: 1.6, fontWeight: '800', color: C.red },
  title: { fontSize: 28, fontWeight: '800', color: C.text },
  link: { color: C.red, fontWeight: '700', padding: 8 },
  hint: { fontSize: 13, color: C.muted },
  menuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#F7E9DE' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: C.text, fontSize: 12, fontWeight: '600' },
  swatch: { width: 13, height: 13, borderRadius: 3, borderWidth: 1 },
  list: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  listContent: { paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, borderLeftWidth: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  marked: { borderLeftColor: C.red },
  number: { minWidth: 19, fontSize: 13, lineHeight: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  product: { flex: 1, gap: 4 },
  productHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 10, rowGap: 3 },
  productName: { flexShrink: 1, fontSize: 16, lineHeight: 21, fontWeight: '800', color: C.text },
  badge: { fontSize: 12, fontWeight: '800' },
  detail: { fontSize: 13, color: C.text },
  meta: { fontSize: 11, color: C.muted },
  note: { fontSize: 13, fontWeight: '600', color: C.red },
  error: { padding: 10, color: C.red, backgroundColor: '#FBE9E7', borderRadius: 8 },
  empty: { padding: 20, color: C.muted, fontSize: 13 },
});
