import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import { usePosLanConfigViewModel } from '../../viewmodels/usePosLanConfigViewModel';
import { vincularDesdeQR } from '../../services/sync/VincularPOS';

const C = {
  fondo: '#FFF8F3',
  blanco: '#FFFFFF',
  vino: '#80251F',
  rojo: '#991F19',
  texto: '#35251F',
  secundario: '#6D5A51',
  borde: '#EFE0D6',
  crema: '#F8EDE4',
  durazno: '#FFD7B9',
  verde: '#245E42',
  verdeClaro: '#E7F3EB',
};

export function PerfilScreen({ onVolver }: { onVolver: () => void }) {
  const { usuario, cerrarSesion } = useAuth();
  const vm = usePosLanConfigViewModel();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [manual, setManual] = useState(false);
  const [verId, setVerId] = useState(false);
  const bloqueo = useRef(false);

  const nombre = usuario?.nombre?.trim() || 'Mi cuenta';
  const iniciales = nombre.split(/\s+/).slice(0, 2).map(parte => Array.from(parte)[0]).join('').toUpperCase();
  const rol = usuario?.rol === 'cocina' ? 'Cocina' : 'Mesero';
  const estado = vm.conectado ? 'Conectado' : vm.configurada ? 'Sin conexión' : 'Sin vincular';
  const accionOcupada = ocupado || vm.procesando;

  async function escanear() {
    setMensaje('');
    const resultado = permiso?.granted ? permiso : await pedirPermiso();
    if (resultado.granted) {
      bloqueo.current = false;
      setEscaneando(true);
    } else {
      setMensaje('Permite el acceso a la cámara desde los ajustes del teléfono para escanear el QR.');
    }
  }

  async function recibir(data: string) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    try {
      await vincularDesdeQR(data);
      setMensaje('Celular vinculado. El POS se reconectará automáticamente.');
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo vincular el celular.');
    } finally {
      setEscaneando(false);
      setOcupado(false);
    }
  }

  function confirmarDesvinculacion() {
    Alert.alert('Desvincular POS', 'Tus pedidos se conservarán. Vuelve a vincular el celular para enviarlos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desvincular', style: 'destructive', onPress: () => {
        setMensaje('');
        void vm.desvincularPOS();
      } },
    ]);
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={onVolver} style={s.back}>
          <Ionicons name="chevron-back" size={19} color={C.rojo} />
          <Text style={s.link}>Volver</Text>
        </Pressable>

        <View style={s.hero}>
          <Text accessibilityRole="header" style={s.kicker}>MI PERFIL</Text>
          <View style={s.identity}>
            <View style={s.avatar}><Text style={s.initials}>{iniciales}</Text></View>
            <View style={s.identityText}>
              <Text style={s.name}>{nombre}</Text>
              <Text style={s.role}>{rol} · Pizza Mya</Text>
            </View>
          </View>
          {!!usuario?.id && (
            <View style={s.account}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: verId }} onPress={() => setVerId(!verId)} style={s.accountRow}>
                <Ionicons name="id-card-outline" size={18} color={C.durazno} />
                <Text style={s.accountLabel}>ID de usuario</Text>
                <Ionicons name={verId ? 'chevron-up' : 'chevron-down'} size={16} color={C.durazno} />
              </Pressable>
              {verId && <Text selectable style={s.userId}>{usuario.id}</Text>}
            </View>
          )}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.iconTile}><Ionicons name="desktop-outline" size={23} color={C.rojo} /></View>
            <View style={s.identityText}>
              <Text accessibilityRole="header" style={s.heading}>Conexión al POS</Text>
              <Text style={s.info}>Vinculación del dispositivo</Text>
            </View>
          </View>

          <View style={[s.status, vm.conectado && s.statusConnected]}>
            <Ionicons name={vm.conectado ? 'checkmark-circle' : 'radio-button-off'} size={17} color={vm.conectado ? C.verde : C.secundario} />
            <Text style={[s.statusText, vm.conectado && s.statusTextConnected]}>{estado}</Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={s.info}>{vm.mensaje}</Text>
          {!vm.configurada && (
            <Text style={s.info}>Conecta ambos equipos al mismo Wi-Fi. En el POS, abre «Vincular celular» y escanea el código.</Text>
          )}
          {!!mensaje && <Text accessibilityRole="alert" style={s.notice}>{mensaje}</Text>}

          {escaneando ? (
            <>
              <Text style={s.label}>Coloca el código QR dentro del recuadro.</Text>
              <View style={s.cameraFrame}>
                <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={e => void recibir(e.data)} />
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.cameraGuide]}>
                  {ocupado ? <ActivityIndicator color={C.blanco} /> : <View style={s.cameraTarget} />}
                </View>
              </View>
              <Pressable accessibilityRole="button" disabled={ocupado} onPress={() => setEscaneando(false)} style={s.back}>
                <Text style={s.link}>Cancelar escaneo</Text>
              </Pressable>
            </>
          ) : (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: accionOcupada, busy: ocupado }} disabled={accionOcupada} onPress={() => void escanear()} style={[s.button, accionOcupada && s.disabled]}>
              {ocupado ? <ActivityIndicator color={C.blanco} /> : (
                <>
                  <Ionicons name="qr-code-outline" size={19} color={C.blanco} />
                  <Text style={s.buttonText}>{vm.configurada ? 'Escanear otro QR' : 'Escanear QR del POS'}</Text>
                </>
              )}
            </Pressable>
          )}

          <View style={s.settings}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: manual }} onPress={() => setManual(!manual)} style={s.settingRow}>
              <Ionicons name="options-outline" size={20} color={C.secundario} />
              <Text style={s.settingLabel}>Configuración manual</Text>
              <Ionicons name={manual ? 'chevron-up' : 'chevron-down'} size={16} color={C.secundario} />
            </Pressable>
            {manual && (
              <View style={s.fields}>
                <Text style={s.label}>Dirección del POS</Text>
                <TextInput accessibilityLabel="Dirección del POS" value={vm.urlBase} onChangeText={vm.setUrlBase} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.78:3101" placeholderTextColor={C.secundario} style={s.input} />
                <Text style={s.label}>Token LAN</Text>
                <TextInput accessibilityLabel="Token LAN" value={vm.token} onChangeText={vm.setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Escribe el token del POS" placeholderTextColor={C.secundario} style={s.input} />
                <Pressable accessibilityRole="button" disabled={accionOcupada || escaneando} onPress={() => { setMensaje(''); void vm.guardarYVerificar(); }} style={[s.button, (accionOcupada || escaneando) && s.disabled]}>
                  <Text style={s.buttonText}>{vm.procesando ? 'Verificando…' : 'Verificar y guardar'}</Text>
                </Pressable>
              </View>
            )}
            {vm.configurada && (
              <Pressable accessibilityRole="button" disabled={accionOcupada || escaneando} onPress={confirmarDesvinculacion} style={s.settingRow}>
                <Ionicons name="unlink-outline" size={20} color={C.rojo} />
                <Text style={[s.settingLabel, s.link]}>Desvincular dispositivo</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={cerrarSesion} style={s.signOut}>
          <Ionicons name="log-out-outline" size={22} color={C.rojo} />
          <Text style={s.link}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.fondo },
  content: { padding: 20, paddingTop: 12, paddingBottom: 28, gap: 16 },
  back: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 },
  link: { color: C.rojo, fontWeight: '700', fontSize: 14 },
  hero: { borderRadius: 24, padding: 20, gap: 15, backgroundColor: C.vino },
  kicker: { color: C.durazno, fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 19, backgroundColor: C.durazno, alignItems: 'center', justifyContent: 'center' },
  initials: { color: C.vino, fontSize: 23, fontWeight: '800' },
  identityText: { flex: 1, gap: 3 },
  name: { fontSize: 26, fontWeight: '800', color: C.blanco },
  role: { fontSize: 14, color: C.durazno },
  account: { borderTopWidth: 1, borderTopColor: '#A95D51' },
  accountRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 },
  accountLabel: { flex: 1, color: C.blanco, fontSize: 13, fontWeight: '700' },
  userId: { color: C.durazno, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde, borderRadius: 22, padding: 18, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.crema },
  heading: { fontSize: 19, fontWeight: '800', color: C.texto },
  info: { fontSize: 13, lineHeight: 19, color: C.secundario },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.crema },
  statusConnected: { backgroundColor: C.verdeClaro },
  statusText: { fontWeight: '700', fontSize: 12, color: C.secundario },
  statusTextConnected: { color: C.verde },
  button: { minHeight: 48, padding: 12, borderRadius: 14, backgroundColor: C.rojo, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { fontSize: 14, color: C.blanco, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.55 },
  settings: { borderTopWidth: 1, borderTopColor: C.borde },
  settingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9 },
  settingLabel: { flex: 1, fontWeight: '700', fontSize: 14, color: C.texto },
  fields: { gap: 8, paddingVertical: 8 },
  label: { fontSize: 13, fontWeight: '700', color: C.texto },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.borde, backgroundColor: C.fondo, padding: 12, borderRadius: 12, color: C.texto },
  cameraFrame: { height: 250, borderRadius: 16, overflow: 'hidden', backgroundColor: C.texto },
  cameraGuide: { alignItems: 'center', justifyContent: 'center' },
  cameraTarget: { width: 145, height: 145, borderWidth: 2, borderColor: C.blanco, borderRadius: 16 },
  notice: { color: C.texto, backgroundColor: C.crema, borderRadius: 12, padding: 12, lineHeight: 20 },
  signOut: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde, borderRadius: 16 },
});
