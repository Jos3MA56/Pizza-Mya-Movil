import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,FlatList,StyleSheet,ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {cuentasCompartidas} from '../../repositories/CompartidoPedidoRepository';
import type {Pedido} from '../../models/Pedido';
const dinero=(n:number)=>'$ '+n.toFixed(2);
const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function PedidosScreen({onVolver,onAbrir}:{onVolver:()=>void;onAbrir:(id:string)=>void}){
 const [estado,setEstado]=useState<'activos'|'cerrados'>('activos');
 const [tipo,setTipo]=useState<'todos'|'mesa'|'para_llevar'>('todos');
 const [busqueda,setBusqueda]=useState(''),[pedidos,setPedidos]=useState<Pedido[]>([]);
 const [error,setError]=useState(''),[cargando,setCargando]=useState(true),[revision,setRevision]=useState(0),[detalle,setDetalle]=useState<string|null>(null);
 useEffect(()=>{let vivo=true,ocupado=false;setPedidos([]);setCargando(true);setError('');setDetalle(null);
  async function cargar(){if(ocupado)return;ocupado=true;try{
   const datos=estado==='activos'?await cuentasCompartidas.listarComandasActivas():await cuentasCompartidas.listarComandasCerradas();
   if(vivo){setPedidos(datos);setError(datos.some(p=>p.sinConexion)?'Sin conexión: mostrando pedidos guardados.':'');}
  }catch(e){if(vivo)setError(e instanceof Error?e.message:'No se pudieron cargar los pedidos.');}finally{ocupado=false;if(vivo)setCargando(false);}}
  void cargar();const timer=setInterval(()=>void cargar(),3000);return()=>{vivo=false;clearInterval(timer);};
 },[estado,revision]);
 const titulo=(p:Pedido)=>p.tipoPedido==='para_llevar'?'Para llevar · '+p.nombreCliente:'Mesa '+p.mesaId;
 const filtrados=pedidos.filter(p=>(tipo==='todos'||(tipo==='para_llevar'?p.tipoPedido==='para_llevar':p.tipoPedido!=='para_llevar'))&&normalizar(titulo(p)+' '+(p.folio??'')).includes(normalizar(busqueda.trim())));
 return <SafeAreaView style={s.root}>
  <View style={s.header}>
   <Pressable accessibilityRole="button" onPress={onVolver} style={s.back}><Text style={s.link}>← Inicio</Text></Pressable>
   <Text style={s.title}>Pedidos</Text><Text style={s.muted}>Consulta tus comandas y continúa atendiendo.</Text>
   <View style={s.row}>{(['activos','cerrados'] as const).map(v=><Pressable key={v} accessibilityRole="tab" accessibilityState={{selected:estado===v}} onPress={()=>setEstado(v)} style={[s.tab,estado===v&&s.selected]}><Text style={[s.tabText,estado===v&&s.selectedText]}>{v==='activos'?'Activos':'Cerrados'}</Text></Pressable>)}</View>
   <TextInput accessibilityLabel="Buscar por mesa, cliente o folio" placeholder="Buscar mesa, cliente o folio" value={busqueda} onChangeText={setBusqueda} style={s.search}/>
   <View style={s.row}>{(['todos','mesa','para_llevar'] as const).map(v=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:tipo===v}} onPress={()=>setTipo(v)} style={[s.chip,tipo===v&&s.chipSelected]}><Text style={s.link}>{v==='todos'?'Todos':v==='mesa'?'Mesa':'Para llevar'}</Text></Pressable>)}</View>
   {!!error&&<View><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>setRevision(v=>v+1)} style={s.back}><Text style={s.link}>Volver a intentar</Text></Pressable></View>}
  </View>
  {cargando?<ActivityIndicator style={{marginTop:30}} color="#991F19"/>:<FlatList data={filtrados} keyExtractor={p=>p.id} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled" ListEmptyComponent={<Text style={s.empty}>{busqueda||tipo!=='todos'?'No hay pedidos que coincidan con tu búsqueda.':estado==='activos'?'No hay pedidos activos.':'No hay pedidos cerrados.'}</Text>} renderItem={({item:p})=>{
   const cerrado=p.estado==='cerrado';const productos=(cerrado?p.productosArchivados:p.productos)?.filter(x=>x.estado!=='cancelado')??[];
   const cantidad=productos.reduce((n,x)=>n+x.cantidad,0),pendientes=productos.filter(x=>!x.publicada).reduce((n,x)=>n+x.cantidad,0);
   const total=cerrado?(p.totalCierreCentavos??0)/100:p.total;
   return <View style={s.card}>
    <Text style={s.heading}>{titulo(p)}</Text>
    {!!p.folio&&<Text style={s.muted}>Último folio: {p.folio}</Text>}
    <View style={s.between}><Text style={s.muted}>{cantidad} {cantidad===1?'producto':'productos'}</Text><Text style={s.amount}>{dinero(total)}</Text></View>
    <Text style={s.muted}>{cerrado?'Cerrado desde el POS'+(p.cerradoEn?' · '+new Date(p.cerradoEn).toLocaleString('es-MX'):''):pendientes+' pendientes de enviar · '+(cantidad-pendientes)+' enviados'}</Text>
    <Pressable accessibilityRole="button" onPress={()=>cerrado?setDetalle(detalle===p.id?null:p.id):onAbrir(p.id)} style={s.button}><Text style={s.buttonText}>{cerrado?(detalle===p.id?'Ocultar detalle':'Ver detalle'):'Abrir comanda'}</Text></Pressable>
    {cerrado&&detalle===p.id&&<View style={{gap:10}}>{productos.map(x=><View key={x.id}><Text style={s.product}>{x.cantidad} × {x.nombre}</Text>{!!x.tamanio&&<Text style={s.muted}>{x.tamanio}</Text>}{!!x.orillaNombre&&<Text style={s.muted}>Orilla: {x.orillaNombre}</Text>}{!!x.observaciones&&<Text style={s.muted}>Nota: {x.observaciones}</Text>}</View>)}{!productos.length&&<Text style={s.muted}>Comanda cerrada sin productos.</Text>}</View>}
   </View>;
  }}/>}
 </SafeAreaView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFF8F3'},header:{padding:20,gap:12},back:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},link:{color:'#991F19',fontWeight:'700'},title:{fontSize:30,fontWeight:'800',color:'#35251F'},muted:{color:'#78675E',fontSize:13,lineHeight:19},row:{flexDirection:'row',gap:8},tab:{flex:1,padding:14,borderRadius:12,backgroundColor:'#F0E5DB',alignItems:'center'},selected:{backgroundColor:'#991F19'},tabText:{fontWeight:'700',color:'#35251F'},selectedText:{color:'white'},search:{borderWidth:1,borderColor:'#E6D6CB',borderRadius:12,padding:14,backgroundColor:'white',color:'#35251F'},chip:{padding:12,borderRadius:20,borderWidth:1,borderColor:'#E6D6CB'},chipSelected:{backgroundColor:'#FBE5D3'},error:{color:'#991F19',lineHeight:20},list:{padding:20,paddingTop:0,gap:12,paddingBottom:30},empty:{padding:24,color:'#78675E',textAlign:'center'},card:{backgroundColor:'white',borderWidth:1,borderColor:'#EEDFD3',borderRadius:18,padding:18,gap:12},heading:{fontSize:19,fontWeight:'800',color:'#35251F'},between:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:8},amount:{fontSize:22,fontWeight:'800',color:'#991F19'},button:{padding:14,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#991F19'},buttonText:{color:'white',fontWeight:'700'},product:{fontSize:14,fontWeight:'700',color:'#35251F'}});
