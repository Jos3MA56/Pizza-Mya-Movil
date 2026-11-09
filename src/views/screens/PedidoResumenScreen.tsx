
import type { ProductoComanda } from '../../models/Pedido';
import React, { useState } from 'react';
import { CatalogoScreen } from './CatalogoScreen';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePedidoResumenViewModel } from '../../viewmodels/usePedidoResumenViewModel';

interface Props {
  pedidoId: string;
  onRegresar: () => void;
  onEditarComanda: () => void;
  onSeguimiento?: () => void;
}

const C = {
  fondo: '#FFF8F3',
  blanco: '#FFFFFF',
  naranja: '#FF7000',
  rojo: '#991F19',
  texto: '#35251F',
  secundario: '#85766E',
  borde: '#F0E3DA',
  suave: '#FFF0E3',
};

export function PedidoResumenScreen({
  pedidoId,
  onRegresar,
  onEditarComanda,
  onSeguimiento,
}: Props) {
  const {
    pedido,
    cargando,
    error,
    totalFormateado,
    guardarNota, guardandoNota,
    errorAccion, retirando, retirarProducto, limpiarErrorAccion,
  } = usePedidoResumenViewModel(pedidoId);

  const [seccion, setSeccion] = useState<'catalogo' | 'resumen'>('catalogo');

  const [seleccionRetiro,setSeleccionRetiro]=useState<{producto:ProductoComanda;revision?:number}|null>(null);
  const [motivo,setMotivo]=useState('');
  const [notas,setNotas]=useState<Record<string,{texto:string;revision?:number}>>({});
  const [erroresNota,setErroresNota]=useState<Record<string,string>>({});
  const hayNotas=Object.keys(notas).some(id=>pedido?.productos?.some(p=>p.id===id&&p.estado!=='cancelado'));
  async function confirmarNota(id:string){
    const borrador=notas[id];if(!borrador)return;
    setErroresNota(e=>({...e,[id]:''}));
    try{const actualizado=await guardarNota(id,borrador.texto,borrador.revision);setNotas(prev=>{const copia={...prev};delete copia[id];
      if(borrador.revision!==undefined&&actualizado.revision===borrador.revision+1){for(const clave of Object.keys(copia)){if(copia[clave].revision===borrador.revision)copia[clave]={...copia[clave],revision:actualizado.revision};}}
      return copia;});}
    catch(e){setErroresNota(prev=>({...prev,[id]:e instanceof Error?e.message:'No se pudo guardar la nota.'}));}
  }

  const esBebidaRetiro=/^bebidas?$/i.test(seleccionRetiro?.producto.categoria?.trim()??'');
  const requiereMotivo=Boolean(seleccionRetiro?.producto.publicada)&&!esBebidaRetiro;
  const confirmarRetiro=async()=>{
    if(!seleccionRetiro)return;
    const ok=await retirarProducto(seleccionRetiro.producto.id,requiereMotivo?motivo.trim():undefined,seleccionRetiro.revision);
    if(ok){setSeleccionRetiro(null);setMotivo('');}
  };
  const productos = pedido?.productos ?? [];

  const productosVisibles = productos.filter(
    (producto) => producto.estado !== 'cancelado'
  );

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Pressable
          onPress={onRegresar}
          accessibilityRole="button"
          style={styles.volver}
        >
          <Text style={styles.regresar}>
            ← Regresar
          </Text>
        </Pressable>

        <Text style={styles.titulo}>
          {pedido?.tipoPedido==='para_llevar'?'Para llevar · '+pedido.nombreCliente:pedido?.mesaId != null ? `Comanda · Mesa ${pedido.mesaId}` : 'Comanda'}
        </Text>
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator
            size="large"
            color={C.naranja}
          />
          <Text style={styles.ayuda}>
            Cargando comanda...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : pedido?.estado==='cerrado' ? (
        <View style={styles.centrado}><Text style={styles.titulo}>{pedido?.tipoPedido==='para_llevar'?'Pedido cerrado':'Mesa libre'}</Text><Text style={styles.ayuda}>La comanda se cerró desde el POS.</Text><Pressable accessibilityRole="button" onPress={onRegresar}><Text style={styles.regresar}>Volver al inicio</Text></Pressable></View>
      ) : !pedido ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>
            No se encontró la comanda.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.pestanas}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: seccion === 'catalogo' }}
              onPress={() => setSeccion('catalogo')} style={[styles.pestana, seccion === 'catalogo' && styles.pestanaActiva]}>
              <Text style={styles.agregarTexto}>Catálogo de productos</Text>
            </Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: seccion === 'resumen' }}
              onPress={() => setSeccion('resumen')} style={[styles.pestana, seccion === 'resumen' && styles.pestanaActiva]}>
              <Text style={styles.agregarTexto}>Mi pedido ({productosVisibles.reduce((n, p) => n + p.cantidad, 0)})</Text>
            </Pressable>
          </View>
          {seccion === 'catalogo' && !pedido.preparada ? <CatalogoScreen embebido pedidoId={pedidoId}
            onRegresar={() => setSeccion('resumen')} onAgregado={() => undefined}
            onCrearPedido={() => undefined} /> : <ScrollView
            style={styles.contenido}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.tarjetaMesa}>
              <View>
                <Text style={styles.etiqueta}>
                  {pedido.tipoPedido==='para_llevar'?'PARA LLEVAR':'MESA ASIGNADA'}
                </Text>

                <Text style={styles.numeroMesa}>
                  {pedido.tipoPedido==='para_llevar'?pedido.nombreCliente:pedido.mesaId !== undefined
                    ? `Mesa ${pedido.mesaId}`
                    : 'Sin mesa'}
                </Text>
              </View>

              <View style={styles.estado}>
                <Text style={styles.estadoTexto}>
                  {pedido.estado === 'borrador'
                    ? (pedido.compartida?'Compartida en POS':'Borrador local')
                    : pedido.estado === 'enviado'
                      ? 'Enviado (sin verificar)'
                      : 'Cancelado'}
                </Text>
              </View>
            </View>

            <View style={styles.folio}>
              <Text style={styles.etiqueta}>
                REFERENCIA DE COMANDA
              </Text>

              <Text style={styles.folioTexto}>
                {pedido.folio ?? pedido.id}
              </Text>
            </View>

            <View style={styles.seccionTitulo}>
              <Text style={styles.tituloProductos}>
                Productos de la comanda
              </Text>

              <Text style={styles.contador}>
                {productosVisibles.length} registros
              </Text>
            </View>

            {productosVisibles.length === 0 ? (
              <View style={styles.vacio}>
                <Text style={styles.vacioIcono}>
                  🍕
                </Text>

                <Text style={styles.vacioTitulo}>
                  Comanda sin productos
                </Text>

                <Text style={styles.vacioDescripcion}>
                  Esta mesa ya tiene una comanda abierta,
                  pero todavía no se han agregado productos.
                </Text>
              </View>
            ) : (
              productosVisibles.map((producto) => (
                <View
                  key={producto.id}
                  style={styles.producto}
                >
                  <View style={styles.productoFila}>
                  <View style={styles.cantidad}>
                    <Text style={styles.cantidadTexto}>
                      {producto.cantidad}x
                    </Text>
                  </View>

                  <View style={styles.productoDetalle}>
                    <Text style={styles.productoNombre}>
                      {producto.nombre}
                    </Text>

                    <Text style={styles.productoDescripcion}>
                      {producto.categoria}
                      {producto.tamanio ? ' · ' + producto.tamanio : ''}
                      {producto.orillaNombre ? ' · ' + producto.orillaNombre : ''}
                      {' · '}
                      {(producto.estadoCocina ?? producto.estado).replace(/_/g, ' ')}
                    </Text>

                    {pedido.estado==='borrador' && !pedido.preparada && producto.estado==='pendiente' && (!producto.publicada || producto.estadoCocina==='pendiente') && <Pressable accessibilityRole="button" accessibilityLabel={(producto.publicada?'Cancelar ':'Quitar ')+producto.nombre} disabled={!!retirando||!!guardandoNota||pedido.sinConexion} style={styles.retirar} onPress={()=>{limpiarErrorAccion();setMotivo('');setSeleccionRetiro({producto,revision:pedido.revision});}}><Text style={styles.retirarTexto}>{producto.publicada&&!/^bebidas?$/i.test(producto.categoria.trim())?'Cancelar con motivo':'Quitar producto'}</Text></Pressable>}
                    {producto.publicada && producto.estadoCocina && producto.estadoCocina!=='pendiente' && <Text style={styles.bloqueoRetiro}>Preparación iniciada: ya no se puede cancelar aquí.</Text>}
                  </View>

                  <Text style={styles.precio}>
                    ${producto.subtotal.toFixed(2)}
                  </Text>
                  </View>
                  <View style={styles.notaProducto}>
                    <Text style={styles.notaEtiqueta}>Nota para este producto</Text>
                    <TextInput accessibilityLabel={'Nota para '+producto.nombre} testID={'nota-producto-'+producto.id}
                      multiline maxLength={1000} textAlignVertical="top" placeholder={producto.publicada?'Sin nota registrada':'Ej. sin tocino, bien cocida…'}
                      editable={!producto.publicada&&producto.estado==='pendiente'&&pedido.estado==='borrador'&&!pedido.preparada&&!pedido.sinConexion&&!guardandoNota&&!retirando}
                      value={producto.publicada?(producto.observaciones??''):(notas[producto.id]?.texto??producto.observaciones??'')}
                      onChangeText={texto=>{setErroresNota(e=>({...e,[producto.id]:''}));setNotas(prev=>({...prev,[producto.id]:{texto,revision:prev[producto.id]?.revision??pedido.revision}}));}}
                      style={[styles.notaCampo,producto.publicada&&styles.notaBloqueada]}/>
                    {producto.publicada&&<Text style={styles.notaAyuda}>Nota enviada a cocina.</Text>}
                    {!!erroresNota[producto.id]&&<Text accessibilityRole="alert" style={styles.errorNota}>{erroresNota[producto.id]}</Text>}
                    {!!notas[producto.id]&&producto.publicada&&<Text style={styles.errorNota}>El producto se envió antes de guardar esta nota. Descarta el cambio pendiente.</Text>}
                    {!!notas[producto.id]&&<View style={styles.notaAcciones}>
                      {!producto.publicada&&<Pressable accessibilityRole="button" accessibilityLabel={'Guardar nota de '+producto.nombre} disabled={!!guardandoNota||!!retirando||pedido.sinConexion} onPress={()=>void confirmarNota(producto.id)} style={styles.guardarNota}>
                        {guardandoNota===producto.id?<ActivityIndicator color={C.blanco}/>:<Text style={styles.guardarNotaTexto}>Guardar nota</Text>}
                      </Pressable>}
                      <Pressable accessibilityRole="button" accessibilityLabel={'Descartar nota de '+producto.nombre} disabled={!!guardandoNota} onPress={()=>{setNotas(prev=>{const copia={...prev};delete copia[producto.id];return copia;});setErroresNota(prev=>({...prev,[producto.id]:''}));}} style={styles.descartarNota}><Text style={styles.retirarTexto}>Descartar</Text></Pressable>
                    </View>}
                  </View>
                </View>
              ))
            )}

          </ScrollView>}

          <View style={[styles.pie, seccion === 'catalogo' && !pedido.preparada && styles.pieCatalogo]}>
            <View style={[styles.totalFila, seccion === 'catalogo' && !pedido.preparada && styles.totalFilaCatalogo]}>
              <Text style={styles.totalEtiqueta}>
                Total de la comanda
              </Text>

              <Text style={styles.total}>
                {totalFormateado}
              </Text>
            </View>

            {hayNotas&&seccion==='resumen'&&<Text style={styles.avisoNotas}>Guarda o descarta las notas pendientes antes de enviar.</Text>}
            {(seccion === 'resumen' || pedido.preparada) && <Pressable
              disabled={hayNotas||!!guardandoNota}
              style={[styles.boton,(hayNotas||!!guardandoNota)&&styles.retiroDeshabilitado]}
              onPress={() => onSeguimiento?.()}
              accessibilityRole="button"
            >
              <Text style={styles.botonTexto}>
                Preparar / seguimiento
              </Text>
            </Pressable>}
          </View>
        </>
      )}
      <Modal transparent animationType="fade" visible={seleccionRetiro!==null&&pedido?.estado!=='cerrado'} onRequestClose={()=>{if(!retirando)setSeleccionRetiro(null);}}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.fondoModal}>
          <View style={styles.panelRetiro} accessibilityViewIsModal>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text accessibilityRole="header" style={styles.tituloRetiro}>{requiereMotivo?'Cancelar producto':'Quitar producto'}</Text>
              <Text style={styles.nombreRetiro}>{seleccionRetiro?.producto.cantidad} × {seleccionRetiro?.producto.nombre}</Text>
              <Text style={styles.detalleRetiro}>Se descontarán ${seleccionRetiro?.producto.subtotal.toFixed(2)} de esta comanda.</Text>
              {requiereMotivo ? <>
                <Text style={styles.detalleRetiro}>Solo se permite si cocina aún no inicia la preparación. El motivo y los datos de la comanda quedarán registrados.</Text>
                <TextInput accessibilityLabel="Motivo de cancelación" placeholder="¿Por qué se cancela?" multiline maxLength={500} editable={!retirando} value={motivo} onChangeText={setMotivo} style={styles.motivoRetiro}/>
                <Text style={styles.contadorMotivo}>{motivo.trim().length}/500 · mínimo 3 caracteres</Text>
              </> : <Text style={styles.detalleRetiro}>{esBebidaRetiro?'La bebida se quitará de la comanda sin solicitar un motivo.':'El producto todavía no se ha enviado a cocina.'}</Text>}
              {!!errorAccion && <Text accessibilityRole="alert" style={styles.errorRetiro}>{errorAccion}</Text>}
              <Pressable accessibilityRole="button" disabled={!!retirando||(requiereMotivo&&motivo.trim().length<3)} onPress={()=>void confirmarRetiro()} style={[styles.confirmarRetiro,(!!retirando||(requiereMotivo&&motivo.trim().length<3))&&styles.retiroDeshabilitado]}>{retirando?<ActivityIndicator color="#FFF"/>:<Text style={styles.confirmarRetiroTexto}>{requiereMotivo?'Confirmar cancelación':'Confirmar retiro'}</Text>}</Pressable>
              <Pressable accessibilityRole="button" disabled={!!retirando} onPress={()=>setSeleccionRetiro(null)} style={styles.conservar}><Text style={styles.retirarTexto}>Conservar producto</Text></Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  retirar:{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingRight:12,marginTop:4},retirarTexto:{color:C.rojo,fontWeight:'700'},bloqueoRetiro:{fontSize:12,lineHeight:18,color:C.secundario,marginTop:8},
  fondoModal:{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:20},panelRetiro:{maxHeight:'85%',backgroundColor:C.blanco,borderRadius:20,padding:20},tituloRetiro:{fontSize:23,fontWeight:'800',color:C.texto,marginBottom:12},nombreRetiro:{fontSize:17,fontWeight:'700',color:C.texto,lineHeight:24},detalleRetiro:{color:C.secundario,lineHeight:21,marginTop:10},motivoRetiro:{marginTop:16,borderWidth:1,borderColor:C.borde,borderRadius:12,padding:12,minHeight:90,textAlignVertical:'top',color:C.texto},contadorMotivo:{color:C.secundario,fontSize:12,marginTop:5},errorRetiro:{color:C.rojo,lineHeight:21,marginTop:12},confirmarRetiro:{minHeight:48,justifyContent:'center',alignItems:'center',backgroundColor:C.rojo,borderRadius:12,marginTop:18},confirmarRetiroTexto:{color:C.blanco,fontWeight:'700'},retiroDeshabilitado:{opacity:0.45},conservar:{minHeight:48,justifyContent:'center',alignItems:'center',marginTop:6},

  pestanas: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 6 },
  pestana: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center' },
  pestanaActiva: { backgroundColor: '#FFE7D2' },
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  encabezado: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 10,
  },
  volver: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  regresar: {
    fontSize: 15,
    color: C.rojo,
    fontWeight: '700',
  },
  titulo: {
    fontSize: 24,
    fontWeight: '900',
    color: C.texto,
  },
  contenido: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    gap: 12,
  },
  ayuda: {
    color: C.secundario,
  },
  error: {
    color: C.rojo,
    textAlign: 'center',
  },
  tarjetaMesa: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etiqueta: {
    fontSize: 10,
    fontWeight: '800',
    color: C.secundario,
    letterSpacing: 0.6,
  },
  numeroMesa: {
    fontSize: 22,
    fontWeight: '900',
    color: C.rojo,
    marginTop: 6,
  },
  estado: {
    backgroundColor: C.suave,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: '48%',
  },
  estadoTexto: {
    color: C.rojo,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  folio: {
    marginTop: 18,
    marginBottom: 22,
    paddingHorizontal: 3,
  },
  folioTexto: {
    fontSize: 12,
    color: C.texto,
    marginTop: 7,
  },
  seccionTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tituloProductos: {
    fontSize: 17,
    fontWeight: '900',
    color: C.rojo,
  },
  contador: {
    fontSize: 11,
    color: C.secundario,
  },
  vacio: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderColor: C.borde,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
  },
  vacioIcono: {
    fontSize: 35,
    marginBottom: 12,
  },
  vacioTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
    textAlign: 'center',
  },
  vacioDescripcion: {
    fontSize: 13,
    color: C.secundario,
    textAlign: 'center',
    marginTop: 9,
    lineHeight: 19,
  },
  productoFila:{flexDirection:'row',alignItems:'center',gap:11},notaProducto:{marginTop:12,borderTopWidth:1,borderTopColor:C.borde,paddingTop:12},notaEtiqueta:{fontSize:12,fontWeight:'700',color:C.texto,marginBottom:7},notaCampo:{minHeight:64,borderWidth:1,borderColor:C.borde,borderRadius:10,padding:10,color:C.texto,fontSize:14,backgroundColor:C.fondo},notaBloqueada:{backgroundColor:'#F5F2EF',color:C.secundario},notaAyuda:{fontSize:11,color:C.secundario,marginTop:5},notaAcciones:{flexDirection:'row',gap:12,alignItems:'center',marginTop:8},guardarNota:{minHeight:44,justifyContent:'center',paddingHorizontal:16,backgroundColor:C.rojo,borderRadius:10},guardarNotaTexto:{color:C.blanco,fontWeight:'700'},descartarNota:{minHeight:44,justifyContent:'center',paddingHorizontal:8},errorNota:{color:C.rojo,marginTop:6,fontSize:12},avisoNotas:{color:C.rojo,fontSize:12,marginBottom:10},
  producto: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 13,
    marginBottom: 10,
    gap: 11,
  },
  cantidad: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: C.suave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadTexto: {
    fontWeight: '900',
    color: C.rojo,
  },
  productoDetalle: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },
  productoDescripcion: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  nota: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 5,
  },
  precio: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
  },
  agregar: {
    borderWidth: 1.5,
    borderColor: C.naranja,
    borderStyle: 'dashed',
    backgroundColor: C.blanco,
    borderRadius: 13,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 14,
  },
  agregarTexto: {
    color: C.naranja,
    fontSize: 15,
    fontWeight: '800',
  },
  observaciones: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    padding: 16,
    marginTop: 22,
  },
  observacionesTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },
  observacionesTexto: {
    fontSize: 13,
    color: C.secundario,
    marginTop: 9,
  },
  aviso: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 17,
  },
  pieCatalogo: { paddingHorizontal: 16, paddingVertical: 12 },
  totalFilaCatalogo: { marginBottom: 0 },
  pie: {
    backgroundColor: C.blanco,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },
  totalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalEtiqueta: {
    fontSize: 15,
    fontWeight: '700',
    color: C.texto,
  },
  total: {
    fontSize: 24,
    fontWeight: '900',
    color: C.rojo,
  },
  boton: {
    backgroundColor: C.naranja,
    borderRadius: 13,
    paddingVertical: 17,
    alignItems: 'center',
  },
  botonTexto: {
    fontSize: 16,
    fontWeight: '800',
    color: C.blanco,
  },
});
