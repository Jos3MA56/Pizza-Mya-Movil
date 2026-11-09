import React from 'react';
import {View,Text,FlatList,Pressable} from 'react-native';
import type {CocinaViewModel} from '../../viewmodels/useCocinaViewModel';
import {RenglonCocinaView,styles} from './CocinaEstacionScreen';
export function CocinaEntregadosScreen({vm,onVolver}:{vm:CocinaViewModel;onVolver:()=>void}){
 return <View style={styles.screen}>
  <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Entregados</Text><Pressable accessibilityRole="button" onPress={onVolver}><Text style={styles.link}>Volver a cocina</Text></Pressable></View>
  <Text style={styles.hint}>{vm.estacion==='pizzas'?'Pizzas':'Complementos'} · {vm.entregados.length} renglones</Text>
  {!!vm.error&&<Text accessibilityRole="alert" style={styles.error}>{vm.error}</Text>}
  <FlatList data={vm.entregados} keyExtractor={r=>r.clave} renderItem={({item})=><RenglonCocinaView renglon={item} vm={vm} historial/>}
   refreshing={vm.cargando} onRefresh={()=>void vm.cargar()} ListEmptyComponent={<Text style={styles.empty}>Todavía no hay productos entregados</Text>}/>
 </View>;
}
