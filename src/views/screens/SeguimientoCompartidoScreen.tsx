import React,{useCallback,useEffect,useState,useRef} from 'react';
import {ScrollView,Text,Pressable,View,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {cuentasCompartidas,type CambioCompartido} from '../../repositories/CompartidoPedidoRepository';
import type {Pedido} from '../../models/Pedido';
export function SeguimientoCompartidoScreen({pedidoId,onRegresar,onMenu}:{pedidoId:string;onRegresar:()=>void;onMenu:()=>void}){
 const montado=useRef(true);
 const [cuenta,setCuenta]=useState<Pedido|null>(null),[ops,setOps]=useState<CambioCompartido[]>([]),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false);
 const cargar=useCallback(async()=>{const [p,o]=await Promise.all([cuentasCompartidas.obtenerPorId(pedidoId),cuentasCompartidas.operaciones(pedidoId)]);if(montado.current){setCuenta(p);setOps(o);}},[pedidoId]);
 useEffect(()=>{montado.current=true;let vivo=true;const leer=()=>{if(vivo)void cargar().catch(e=>{if(vivo)setError(e.message);});};leer();const timer=setInterval(leer,2000);return()=>{montado.current=false;vivo=false;clearInterval(timer);};},[cargar]);
 async function ejecutar(resolver=false){if(ocupado)return;setOcupado(true);setError('');try{if(resolver)await cuentasCompartidas.resolverPendiente(pedidoId);else await cuentasCompartidas.publicar(pedidoId);await cargar();}catch(e){setError(e instanceof Error?e.message:'No se pudo completar');await cargar().catch(()=>undefined);}finally{setOcupado(false);}}
 const productosPendientes=cuenta?.productos?.filter(p=>!p.publicada&&p.estado!=='cancelado')??[];
 const nuevos=productosPendientes.length;
 const pendiente=ops.some(o=>['ENVIANDO','RESULTADO_DESCONOCIDO'].includes(o.estado));
 const deshabilitado=ocupado||!cuenta||!nuevos||!!cuenta.sinConexion||pendiente;
 const acciones:Record<string,string>={publicar:'Envío a cocina',agregar:'Producto agregado',guardar:'Comanda actualizada',quitar:'Producto retirado',cancelar:'Producto cancelado'};
 const envios=ops.filter(o=>JSON.parse(o.payload).accion==='publicar');
 const cambiosPendientes=ops.filter(o=>JSON.parse(o.payload).accion!=='publicar'&&o.estado!=='CONFIRMADA');
 const estados:Record<string,string>={CONFIRMADA:'Confirmado',ENVIANDO:'Enviando…',RESULTADO_DESCONOCIDO:'Por confirmar',RECHAZADA:'No completado'};
 if(cuenta?.estado==='cerrado')return <SafeAreaView style={s.root}><View style={s.content}><Text style={s.title}>{cuenta.tipoPedido==='para_llevar'?'Pedido cerrado':'Mesa libre'}</Text><Text style={s.info}>La comanda se cerró desde el POS.</Text><Pressable accessibilityRole="button" onPress={onMenu} style={s.button}><Text style={s.buttonText}>Ir al menú principal</Text></Pressable></View></SafeAreaView>;
 return <SafeAreaView style={s.root}>
  <ScrollView contentContainerStyle={s.content}>
   <Text style={s.eyebrow}>SEGUIMIENTO DE COMANDA</Text>
   <Text style={s.title}>{cuenta?(cuenta.tipoPedido==='para_llevar'?'Para llevar · '+cuenta.nombreCliente:'Mesa '+cuenta.mesaId):'Cargando comanda…'}</Text>
   {cuenta&&<View style={s.totalCard}>
    <Text style={s.caption}>TOTAL DE LA COMANDA</Text>
    <Text style={s.totalAmount}>$ {cuenta.total.toFixed(2)}</Text>
    <Text style={s.info}>Incluye los productos enviados y los pendientes.</Text>
   </View>}
   <View style={[s.summary,cuenta?.sinConexion&&s.offline]}>
    <Text style={s.heading}>{!cuenta?'Consultando el POS…':cuenta.sinConexion?'Sin conexión al POS':pendiente?'Hay un cambio por confirmar':nuevos?'Listo para enviar':'Sin productos pendientes de envío'}</Text>
    <Text style={s.info}>{cuenta?.sinConexion?'Mostramos los últimos datos guardados. Reconecta para enviar a cocina.':pendiente?'Consulta el resultado del cambio pendiente antes de enviar más productos.':nuevos?nuevos+(nuevos===1?' producto pendiente de envío.':' productos pendientes de envío.'):'Puedes volver a la comanda para agregar más productos.'}</Text>
    {nuevos>0&&<View style={s.pendingList}>
     {productosPendientes.map(producto=><View key={producto.id} style={s.pendingRow}>
      <Text style={s.quantity}>{producto.cantidad} ×</Text>
      <View style={s.productDetail}>
       <Text style={s.productName}>{producto.nombre}</Text>
       {!!producto.tamanio&&<Text style={s.productMeta}>{producto.tamanio}</Text>}
       {!!producto.orillaNombre&&<Text style={s.productMeta}>Orilla: {producto.orillaNombre}</Text>}
       {!!producto.observaciones?.trim()&&<Text style={s.productMeta}>Nota: {producto.observaciones}</Text>}
      </View>
     </View>)}
    </View>}
    <Pressable accessibilityRole="button" accessibilityState={{disabled:deshabilitado,busy:ocupado}} disabled={deshabilitado} onPress={()=>void ejecutar()} style={[s.button,deshabilitado&&s.disabled]}>
     <Text style={[s.buttonText,deshabilitado&&s.disabledText]}>{ocupado?'Procesando…':nuevos?'Enviar a cocina ('+nuevos+')':'Todo enviado'}</Text>
    </Pressable>
   </View>
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
   {pendiente&&<Pressable accessibilityRole="button" disabled={ocupado} onPress={()=>void ejecutar(true)} style={s.secondary}><Text style={s.link}>Consultar envío pendiente</Text></Pressable>}
   {!!cambiosPendientes.length&&<>
    <Text style={s.section}>Cambios que requieren atención</Text>
    {cambiosPendientes.map(o=><View key={o.operacionId} style={s.card}>
     <Text style={[s.badge,s.waiting]}>{estados[o.estado]??o.estado}</Text>
     <Text style={s.heading}>{acciones[JSON.parse(o.payload).accion]??'Cambio en la comanda'}</Text>
     {!!o.error&&<Text style={s.error}>{o.error}</Text>}
    </View>)}
   </>}
   <Text style={s.section}>Envíos a cocina</Text>
   <Text style={s.note}>Cada folio corresponde a un envío. El más reciente aparece primero.</Text>
   {!envios.length&&<Text style={s.info}>Todavía no has enviado productos a cocina desde este dispositivo.</Text>}
   {envios.map(o=>{
    const recibo=o.resultado?JSON.parse(o.resultado).recibo:null;
    const confirmada=o.estado==='CONFIRMADA';
    const productos: {lineaId?:string;nombre:string;cantidad:number;tamanio?:string;orillaNombre?:string;observaciones?:string}[]=recibo?.productos??[];
    return <View key={o.operacionId} style={s.card}>
     <Text style={[s.badge,confirmada?s.confirmed:s.waiting]}>{confirmada?'Enviado a cocina':estados[o.estado]??o.estado}</Text>
     {recibo&&<>
      <Text selectable style={s.heading}>Folio {recibo.folio}</Text>
      {productos.map((p,i)=><View key={p.lineaId??String(i)} style={s.pendingRow}>
       <Text style={s.quantity}>{p.cantidad} ×</Text>
       <View style={s.productDetail}>
        <Text style={s.productName}>{p.nombre}</Text>
        {!!p.tamanio&&<Text style={s.productMeta}>{p.tamanio}</Text>}
        {!!p.orillaNombre&&<Text style={s.productMeta}>Orilla: {p.orillaNombre}</Text>}
        {!!p.observaciones&&<Text style={s.productMeta}>Nota: {p.observaciones}</Text>}
       </View>
      </View>)}
      <View style={s.receipt}><Text style={s.info}>Importe de este envío</Text><Text style={s.heading}>$ {(recibo.totalCentavos/100).toFixed(2)}</Text></View>
     </>}
     {!!o.error&&<Text style={s.error}>{o.error}</Text>}
    </View>;
   })}
   <Text style={s.note}>Tu comanda permanece abierta. Los productos ya enviados conservan su ticket.</Text>
  </ScrollView>
  <View style={s.footer}>
   <Pressable accessibilityRole="button" onPress={onRegresar} style={s.button}><Text style={s.buttonText}>← Volver a la misma comanda</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={onMenu} style={s.secondary}><Text style={s.link}>Ir al menú principal</Text></Pressable>
  </View>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 totalCard:{padding:20,gap:6,borderRadius:18,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#EEDFD3'},
 totalAmount:{fontSize:32,fontWeight:'800',color:'#991F19'},
 pendingList:{borderTopWidth:1,borderTopColor:'#DDC9BB',paddingTop:10,gap:12},
 pendingRow:{flexDirection:'row',alignItems:'flex-start',gap:10},
 quantity:{minWidth:34,fontSize:14,lineHeight:20,fontWeight:'800',color:'#991F19'},
 productDetail:{flex:1,gap:2},productName:{fontSize:14,lineHeight:20,fontWeight:'700',color:'#35251F'},
 productMeta:{fontSize:12,lineHeight:18,color:'#706158'},
 root:{flex:1,backgroundColor:'#FFF8F3'},content:{padding:20,gap:14,paddingBottom:24},
 eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.6,color:'#991F19'},title:{fontSize:32,fontWeight:'800',color:'#35251F'},
 info:{fontSize:14,lineHeight:21,color:'#706158'},heading:{fontSize:16,fontWeight:'700',color:'#35251F'},
 summary:{padding:18,gap:12,backgroundColor:'#F4EDE5',borderRadius:20},offline:{backgroundColor:'#FFF0D6'},
 section:{fontSize:18,fontWeight:'800',color:'#35251F',marginTop:8},
 button:{minHeight:50,padding:15,borderRadius:14,backgroundColor:'#991F19',alignItems:'center',justifyContent:'center'},
 buttonText:{fontSize:15,fontWeight:'700',color:'#FFFFFF',textAlign:'center'},disabled:{backgroundColor:'#E3DBD2'},disabledText:{color:'#706158'},
 secondary:{minHeight:48,padding:13,borderRadius:14,borderWidth:1,borderColor:'#DDC9BB',alignItems:'center',justifyContent:'center'},
 link:{color:'#991F19',fontSize:15,fontWeight:'700',textAlign:'center'},error:{color:'#991F19',fontSize:14,lineHeight:21},
 card:{padding:18,borderWidth:1,borderColor:'#EEDFD3',borderRadius:18,backgroundColor:'#FFFFFF',gap:12},
 badge:{alignSelf:'flex-start',overflow:'hidden',paddingHorizontal:10,paddingVertical:5,borderRadius:8,fontSize:12,fontWeight:'700'},
 confirmed:{backgroundColor:'#E5F1E8',color:'#28613A'},waiting:{backgroundColor:'#FFF0D6',color:'#875512'},
 receipt:{flexDirection:'row',flexWrap:'wrap',gap:18,borderTopWidth:1,borderTopColor:'#F0E3DA',paddingTop:12},folio:{flexGrow:1,gap:4},
 caption:{fontSize:10,fontWeight:'700',letterSpacing:1,color:'#85766E',marginBottom:4},amount:{fontSize:23,fontWeight:'800',color:'#35251F'},
 note:{fontSize:12,lineHeight:18,color:'#85766E'},footer:{paddingHorizontal:20,paddingTop:12,paddingBottom:10,gap:9,borderTopWidth:1,borderTopColor:'#EEDFD3',backgroundColor:'#FFF8F3'}
});
