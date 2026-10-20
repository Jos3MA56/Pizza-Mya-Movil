# Recorrido mesero -> POS -> cocina por LAN

Implementado para el alcance de la prueba con un telefono: iniciar sesion de mesero, tomar una comanda, recibir folio POS, cambiar a cocina y consultar el mismo pedido desde la computadora. La nube se usa para el login existente y para importar el catalogo; no se envian pedidos a la nube. La sincronizacion de pedidos POS/nube queda pendiente.

## Carpetas y ramas

POS: esta carpeta, rama `feature/integracion-real-pos-lan`, base local `fcaa844` (snapshot inicial: no existia Git ni remoto).
Movil: `mobile-integration`, copia de trabajo independiente; el movil original no fue modificado. Rama `feature/integracion-real-pos-lan`, base `a6059979e12acd42aca965376aefbaa74cf94260` de `feature/avance-comandas-offline-cocina`.
El 19/10/2026 se verifico que esa base NO esta integrada en `origin/develop` (`0453a4818627ebfe355634ca6c8e8e83a2b6789f`). Un PR movil debe dirigirse primero a `feature/avance-comandas-offline-cocina`. No se deben duplicar sus cambios contra develop. POS no tiene remoto: no se puede abrir su PR hasta asignarle un repositorio. No se hizo push ni merge.

## Preparacion de la prueba fisica

1. Conectar PC y telefono al mismo Wi-Fi. La IPv4 Wi-Fi observada en esta PC es `192.168.1.78`; comprobarla de nuevo con `ipconfig`. No usar la IP del adaptador virtual `192.168.56.1`. No usar localhost desde el telefono. La red debe permitir comunicacion entre clientes.
2. En una terminal dentro de `mobile-integration`, ejecutar `npm.cmd start -- --lan`. Usar el QR de ESTA copia, no el de la carpeta movil original. En otro equipo instalar dependencias con `npm.cmd ci`; en esta copia se reutiliza node_modules del original mediante una junction local.
3. Iniciar sesion con una cuenta real de mesero. Perfil muestra el ID que se debe autorizar en el POS. El correo por si solo no equivale a un ID: no se adivinan identidades. Las contrasenas nunca se pasan por chat ni por comandos del POS.
4. En la carpeta POS, ejecutar:

```powershell
.\scripts\Iniciar-POS-Pruebas.ps1 -MeseroId 'ID_REAL_MOSTRADO_EN_PERFIL'
```

El script usa exclusivamente `data/lan-test.sqlite`, puerto 3101, escucha LAN explicita `0.0.0.0` y un token aleatorio persistido en `data/lan-token.txt`. El catalogo real ya fue importado localmente (56 presentaciones). Para actualizarlo con internet, agregar `-ActualizarCatalogo`. Los precios quedan autorizados por esa copia del catalogo del POS y se calculan en centavos; no se consulta internet por pedido. Se conserva la procedencia y fecha de importacion. Las mesas locales de esta prueba son 1-10; no se afirma equivalencia con mesas del backend.

5. En otra terminal de la carpeta POS:

```powershell
npm.cmd run build
.\scripts\Abrir-POS-Pruebas.ps1
```

El servidor es un proceso independiente de Electron, como en el proyecto original. Mantener su terminal abierta y detenerlo con Ctrl+C. No iniciar dos servidores para la misma base/puerto. El script de Electron selecciona la vista local; `POS_API_URL` corresponde a otro modulo central y no se usa en este recorrido.

6. En la configuracion LAN del perfil de mesero, guardar `http://192.168.1.78:3101` y el contenido de `data/lan-token.txt`, abriendolo localmente. El token se guarda en SecureStore; no ponerlo en EXPO_PUBLIC, capturas, logs ni commits. Comprobar conexion. Si Windows solicita permitir Node, limitarlo a la red privada de confianza; no se modifico automaticamente el firewall. Desde el navegador del telefono se puede comprobar `http://192.168.1.78:3101/api/local/health` sin token.
7. Abrir mesa 3, agregar una pizza desde el catalogo del POS, seleccionar su tamano y agregar observaciones. Para probar dos tamanos, agregar dos lineas con sus presentaciones. Desde Seguimiento pulsar Preparar/enviar. Esperar CONFIRMADA y folio `MYA-...`; comprobar ambos totales si hay discrepancia.
8. Verificar ese mismo folio en Electron: mesa, origen movil, cantidades, tamanos, notas y total.
9. Cerrar sesion del mesero e iniciar sesion con una cuenta real de rol COCINA. Seleccionar la categoria Pizzas y el filtro pendiente. El tablero consulta el POS cada 3 segundos; no usa la tabla cocina_demo. Debe aparecer el mismo folio. Se puede iniciar preparacion y marcar el ticket completo listo. El estado es del ticket completo, no independiente por categoria; la interfaz lo indica.
10. Cortar y recuperar la conexion. Seguimiento distingue resultado desconocido y conciliacion; un 404 conserva el estado, no autoriza otro envio. Repetir el mismo requestId debe conservar folio y un solo ticket. No cambiar requestId ni borrar filas para resolver un error.

La configuracion LAN y los pedidos se conservan al cerrar sesion. Cambiar de cuenta requiere el login existente del backend con internet; el cache de sesion offline actual solo conserva la ultima sesion. No se promete cambiar a una cuenta nueva sin conexion.

## Contrato compartido v2

`POST /api/local/pedidos` mantiene la ruta existente; `versionContrato: 2` selecciona el contrato completo. El cuerpo contiene exclusivamente:

- versionContrato, requestId estable (8-100 caracteres alfanumericos, guion o guion bajo).
- comandaLocalId, mesa entera, meseroId autorizado explicitamente en `lan_meseros`.
- observaciones generales y totalLocalCentavos informativo.
- productos: lineaId unico, productoId, productoTamanioId, tamanioId, cantidad entera 1-99 y observaciones.

Los tres identificadores de cada presentacion se copian del backend al catalogo SQLite POS mediante `importar-catalogo.js`. Se comprueba su pertenencia exacta. No existe emparejamiento por nombre o posicion. No se usan los slugs ficticios del catalogo v1 para traducir productos reales. Campos desconocidos y personalizaciones no modeladas se rechazan, nunca se descartan.

201: `{pedido,duplicado:false}`. Reintento identico: 200, mismo pedido/folio/total. Contenido diferente con el mismo requestId: 409. La comparacion incluye mesa, actor, identificadores, notas, cantidades, ID local y total local. El orden de lineas no altera la equivalencia. Pedido y recibo tienen contenido normalizado para conciliacion.

`GET /api/local/pedidos/por-request/:requestId` devuelve el pedido completo con recibo, notas, presentaciones y totales. 404 significa no encontrado; el cliente conserva el resultado desconocido. El listado operativo `/pedidos` y la consulta `/pedidos/:id` incluyen los pedidos v2.

`GET /api/local/catalogo/v2`: catalogo compartido, origen y fecha. Sin catalogo configurado: 503.
`GET /api/local/cocina`: tickets persistidos con folio, lineas y cocinaVersion.
`PATCH /api/local/cocina/:id`: `{estado,version}`; pendiente -> en_preparacion -> listo. Version desactualizada o transicion repetida: 409.

Se insertan pedido (misma numeracion AUTOINCREMENT existente), recibo, lineas y un ticket unico de cocina en una transaccion BEGIN IMMEDIATE. Una falla revierte todo. Reintentos no publican un segundo ticket. Recibido por POS y publicado en cola de cocina se confirman juntos; preparar/listo son estados posteriores y diferentes. Recepcion no libera la mesa ni salda una cuenta.

Errores: 401 token LAN invalido; 403 mesa/mesero no autorizado; 409 conflicto; 422 version, cantidades, vinculacion, presentacion, campos o personalizacion invalida; 500 fallo interno; 503 LAN/catalogo no configurado. El cuerpo incluye error y codigo cuando corresponde. HTTP remoto exige Bearer token. Loopback permite la interfaz Electron; WebSocket solo acepta loopback. Los telefonos consultan cocina por HTTP autenticado.

El token LAN actual autoriza el dispositivo: no es una credencial individual firmada por el backend. La lista explicita de meseros evita atribucion a un mesero de relleno, pero no aporta autenticacion individual criptografica. Para produccion se requiere reforzar autorizacion por usuario y rol. No exponer este receptor a internet.

## SQLite movil e historial

La preparacion y el payload inmutable quedan en una transaccion. El validador compara el payload con el documento preparado antes de enviar. Se conserva el requestId en los reintentos. Envio manual y procesador automatico usan el mismo SyncService; una respuesta perdida queda pendiente de conciliacion. Solo un recibo verificado confirma la operacion.

Una preparacion BLOQUEADA de la iteracion anterior, o PENDIENTE con cero intentos, se puede cancelar desde Seguimiento. Se archiva el documento, se conserva la operacion CANCELADA con su requestId y se retira el bloqueo de edicion en la misma transaccion. Si hubo un intento, no se permite este desbloqueo. No se modifica contenido que pudo llegar al POS.

Pendiente fuera del recorrido de hoy: edicion compartida de comandas entre varios meseros/dispositivos, cuentas abiertas centralizadas con control de versiones, pagos/cierre de cuenta y liberacion de mesa. La restriccion local por creador sigue existiendo y no debe presentarse como colaboracion entre meseros ya implementada. Tampoco hay sincronizacion de pedidos con nube ni estados independientes por estacion de cocina. La demostracion anterior queda separada en Seguimiento; no alimenta el tablero de cocina operativo.

## Verificacion

- POS `npm.cmd test`: 3 pruebas de integracion, HTTP y SQLite reales. Validacion/autenticacion, dos tamanos, notas, importes/discrepancia, duplicados, conflicto, concurrencia, rollback de segunda linea, recuperacion por requestId, reinicio, listado y un ticket de cocina por pedido.
- Movil `npm.cmd run test:offline`: 13 pruebas contando el contenedor; migraciones, instantanea, SQLite real, concurrencia, estados y cancelacion auditable.
- Movil `npm.cmd run test:patterns`: 5 aprobadas; `test:api`: 7 aprobadas.
- Movil `npm.cmd run test:unit -- --watch=false --testTimeout=15000`: 65 aprobadas en 12 suites. La primera ejecucion con timeout 5s tuvo un timeout de arranque en AuthContext; la repeticion con 15s paso completa.
- TypeScript movil: `node mobile-integration/node_modules/typescript/bin/tsc --noEmit -p mobile-integration/tsconfig.json`.
- Modulo central existente `node --test desktop/tests/mesas-api.test.mjs`: 1 aprobada.
- POS `npm.cmd run build`: TypeScript y Vite aprobados.
- `node scripts/smoke-electron.mjs`: Electron real arranco conectado al servicio temporal y verifico folio, producto, tamano y ambas notas renderizadas, resultado `Electron smoke: PASS`.
- Movil `node node_modules/expo/bin/cli export --platform android --output-dir .expo-export-check`: bundle Android generado.
- Desde POS `npm.cmd run test:lan`: ejecuta preparacion SQLite movil, SyncService real, fetch real, servidor HTTP y SQLite POS separados, cambio de actor a cocina y recuperacion del mismo ticket. En otro checkout establecer POS_REPO con la ruta POS y ejecutarlo desde movil con `npm.cmd run test:lan`.
- Variante con catalogo publico real (solo lecturas de nube): `$env:LAN_TEST_LIVE_CATALOG='1'; npm.cmd run test:lan`. Verificados 56 IDs de presentacion, sin pedidos en la nube. Despues quitar esa variable.

El harness sustituye exclusivamente las APIs nativas Expo SQLite/SecureStore/Crypto por puentes de prueba (SQLite real de Node y almacenamiento de secretos en memoria). La autenticacion de cuentas en telefono, el enlace Wi-Fi fisico y el uso tactil de pantallas requieren la prueba manual anterior. No se realizaron ni se afirman esas pruebas fisicas.
