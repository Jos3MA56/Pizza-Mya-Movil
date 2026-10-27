import React,{useState} from 'react';
import {View,Text,Pressable,Image,StyleSheet,StatusBar,ScrollView,TextInput,ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../context/AuthContext';
import {useCocinaViewModel} from '../../viewmodels/useCocinaViewModel';
import {usePosLanConfigViewModel} from '../../viewmodels/usePosLanConfigViewModel';
import {CocinaPizzasScreen} from './CocinaPizzasScreen';
import {CocinaComplementosScreen} from './CocinaComplementosScreen';
import {COCINA_COLORS as C} from './CocinaEstacionScreen';
export function CocinaHomeScreen(){
 const {usuario,cerrarSesion}=useAuth(),vm=useCocinaViewModel(),conexion=usePosLanConfigViewModel();
 const [configurando,setConfigurando]=useState(false);
 return <SafeAreaView style={styles.container}>
  <StatusBar barStyle="dark-content" backgroundColor={C.background}/>
  <View style={styles.header}><Image source={require('../../../assets/logo.png')} resizeMode="contain" style={styles.logo}/><View style={styles.user}><Text style={styles.name}>Hola, {usuario?.nombre?.split(' ')[0]??'Cocina'}</Text><Text style={styles.role}>Cocina</Text><Pressable accessibilityRole="button" onPress={cerrarSesion}><Text style={styles.logout}>Cerrar sesión</Text></Pressable></View></View>
  <View style={styles.connection}><View style={styles.status}><View style={[styles.dot,{backgroundColor:vm.conectado?C.green:C.orange}]}/><Text style={styles.statusText}>{vm.conectado?'POS conectado':'Sin conexión con el POS'}</Text></View><Pressable accessibilityRole="button" onPress={()=>setConfigurando(!configurando)}><Text style={styles.configLink}>{configurando?'Volver a cocina':'Conexión POS'}</Text></Pressable></View>
  {configurando?<ScrollView contentContainerStyle={styles.configContent} keyboardShouldPersistTaps="handled"><View style={styles.configCard}>
   <Text style={styles.configTitle}>Conexión con POS Electron</Text><Text accessibilityRole="alert" style={styles.message}>{conexion.mensaje}</Text>
   <Text style={styles.label}>Dirección del POS</Text><TextInput accessibilityLabel="Dirección del POS" value={conexion.urlBase} onChangeText={conexion.setUrlBase} placeholder="http://192.168.1.78:3101" autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input}/>
   <Text style={styles.label}>Token LAN</Text><TextInput accessibilityLabel="Token LAN" value={conexion.token} onChangeText={conexion.setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} style={styles.input}/>
   <Pressable accessibilityRole="button" disabled={conexion.procesando} onPress={()=>void conexion.guardarYVerificar()} style={styles.save}>{conexion.procesando?<ActivityIndicator color="white"/>:<Text style={styles.saveText}>Verificar y guardar conexión</Text>}</Pressable>
   <Text style={styles.hint}>Usa la dirección de la computadora y el token del POS. Se conservan al cambiar de sesión.</Text>
  </View></ScrollView>:<>
   <View style={styles.tabs}>{(['pizzas','complementos'] as const).map(estacion=><Pressable key={estacion} accessibilityRole="tab" accessibilityState={{selected:vm.estacion===estacion}} onPress={()=>vm.setEstacion(estacion)} style={[styles.tab,vm.estacion===estacion&&styles.selected]}><Text style={[styles.tabText,vm.estacion===estacion&&styles.selectedText]}>{estacion==='pizzas'?'Pizzas':'Complementos'}</Text></Pressable>)}</View>
   {vm.estacion==='pizzas'?<CocinaPizzasScreen vm={vm}/>:<CocinaComplementosScreen vm={vm}/>}
   <View style={styles.footer}><Text style={styles.footerText}>{vm.actualizado?`Última consulta: ${vm.actualizado.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`:'Esperando pedidos del POS'}</Text></View>
  </>}
 </SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:C.background},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:8},logo:{width:88,height:70},user:{alignItems:'flex-end',gap:3},name:{fontSize:15,fontWeight:'800',color:C.text},role:{fontSize:12,color:C.muted},logout:{fontSize:12,fontWeight:'700',color:C.red,paddingVertical:5},connection:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:10,borderTopWidth:1,borderTopColor:C.border},status:{flexDirection:'row',alignItems:'center',gap:6},dot:{height:7,width:7,borderRadius:4},statusText:{fontSize:11,color:C.muted},configLink:{fontSize:12,fontWeight:'700',color:C.red,paddingVertical:6},tabs:{marginHorizontal:20,marginTop:8,flexDirection:'row',padding:4,backgroundColor:'#F0E3DA',borderRadius:15},tab:{flex:1,paddingVertical:12,alignItems:'center',borderRadius:12},selected:{backgroundColor:C.red},tabText:{fontSize:15,fontWeight:'700',color:C.muted},selectedText:{color:C.white},footer:{paddingHorizontal:20,paddingVertical:8,borderTopWidth:1,borderTopColor:C.border},footerText:{color:C.muted,fontSize:11,textAlign:'center'},configContent:{padding:20},configCard:{backgroundColor:C.white,padding:20,borderRadius:20,borderWidth:1,borderColor:C.border,gap:12},configTitle:{fontSize:22,fontWeight:'800',color:C.text},message:{fontSize:13,color:C.muted,lineHeight:20},label:{fontSize:14,fontWeight:'700',color:C.text,marginTop:8},input:{padding:14,fontSize:15,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:'#FAFAFA',color:C.text},save:{padding:15,backgroundColor:C.red,borderRadius:13,alignItems:'center',marginTop:8},saveText:{color:C.white,fontWeight:'700',fontSize:14},hint:{fontSize:12,color:C.muted,lineHeight:19}});
