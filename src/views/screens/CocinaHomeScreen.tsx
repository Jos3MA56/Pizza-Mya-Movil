import React from 'react';
import {ScrollView,View,Text,Pressable} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import {useCocinaViewModel} from '../../viewmodels/useCocinaViewModel';
export function CocinaHomeScreen(){
 const {cerrarSesion}=useAuth();const vm=useCocinaViewModel();
 return <ScrollView contentContainerStyle={{padding:24,gap:18,backgroundColor:'#FFF8F3'}}>
  <Text style={{fontSize:26,fontWeight:'bold'}}>Cocina · Pedidos del POS</Text>
  <Text>{vm.conectado?'Conectado al POS por red local':'Sin conexión: los datos visibles pueden estar desactualizados'}</Text>
  <Text>Consulta cada 3 segundos. Cambiar de sesión conserva los pedidos en la computadora.</Text>
  <Pressable onPress={()=>void vm.cargar()}><Text>Actualizar</Text></Pressable>
  <View style={{gap:12}}><Pressable onPress={()=>vm.setCategoria('')}><Text>{!vm.categoria?'✓ ':''}Todas las categorías</Text></Pressable>{vm.categorias.map(c=><Pressable key={c.id} onPress={()=>vm.setCategoria(c.id)}><Text>{vm.categoria===c.id?'✓ ':''}{c.nombre}</Text></Pressable>)}</View>
  <View style={{flexDirection:'row',gap:12}}>{(['pendiente','en_preparacion','listo'] as const).map(e=><Pressable key={e} onPress={()=>vm.setFiltro(e)}><Text>{vm.filtro===e?'✓ ':''}{e.replace(/_/g,' ')}</Text></Pressable>)}</View>
  {!!vm.error&&<Text accessibilityRole="alert">{vm.error}</Text>}
  {vm.conectado&&!vm.tickets.length&&<Text>Sin pedidos en este estado y categoría.</Text>}
  {vm.tickets.map(t=><View key={t.id} style={{padding:18,backgroundColor:'white',gap:8}}>
   <Text style={{fontWeight:'bold'}}>Mesa {t.mesa} ? {t.folio}</Text><Text>{new Date(t.fecha).toLocaleString()}</Text>
   {t.productos.filter(p=>!vm.categoria||p.categoriaId===vm.categoria).map(p=><Text key={p.lineaId}>{p.cantidad} × {p.nombre} ? {p.tamanio} {p.observaciones?`? ${p.observaciones}`:''}</Text>)}
   <Text>Observaciones: {t.observaciones||'Sin observaciones'}</Text><Text>Estado: {t.cocinaEstado.replace(/_/g,' ')}</Text>
   {t.cocinaEstado!=='listo'&&<Pressable disabled={!vm.conectado} onPress={()=>void vm.avanzar(t)}><Text>{t.cocinaEstado==='pendiente'?'Iniciar preparación del ticket completo':'Marcar ticket completo listo'}</Text></Pressable>}
  </View>)}
  <Text>El estado corresponde al ticket completo, incluso al filtrar por categoría.</Text>
  <Pressable onPress={cerrarSesion}><Text>Cerrar sesión</Text></Pressable>
 </ScrollView>;
}
