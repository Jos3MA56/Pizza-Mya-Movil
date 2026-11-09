import React, { useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';

export function ImagenProducto({ url, nombre }: { url?: string; nombre: string }) {
  const [fallida, setFallida] = useState<string | undefined>();
  if (!url || fallida === url) return <View style={s.placeholder} accessibilityLabel={`Imagen no disponible de ${nombre}`}>
    <Text style={s.icono}>▧</Text><Text style={s.texto}>Imagen no disponible</Text>
  </View>;
  return <Image source={{ uri: url }} style={s.imagen} resizeMode="contain"
    accessibilityLabel={`Imagen de ${nombre}`} onError={() => setFallida(url)} />;
}
const s = StyleSheet.create({
  imagen: { width: '100%', height: 150, borderRadius: 12, marginBottom: 12, backgroundColor: '#FFF8F3' },
  placeholder: { height: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E3', borderRadius: 12, marginBottom: 12, gap: 8 },
  icono: { fontSize: 32, color: '#9A8982' }, texto: { fontSize: 12, color: '#85766E' },
});
