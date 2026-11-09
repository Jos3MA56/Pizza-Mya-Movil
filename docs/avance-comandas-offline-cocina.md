# Avance: comandas offline, sincronización y cocina

Fecha: 19 de octubre de 2026. Base: `0453a4818627ebfe355634ca6c8e8e83a2b6789f` (`origin/develop`). Rama: `feature/avance-comandas-offline-cocina`.

## Diagnóstico comprobado

Antes: catálogo HTTP real con agrupamiento de especialidades; SQLite v1 y cola LAN, reintentos, SecureStore para configuración, conciliación y procesador automático existentes. `PedidoRepositorySingleton` almacenaba las comandas visibles en memoria y cocina era una pantalla inicial. No se recrearon esos módulos de sincronización.

Se consultaron los PR actuales mediante GitHub: #12 y #13 integrados; #14 abierto y no fusionable. Se inspeccionó su diff: personalización con datos/precios demostrativos, todavía sin persistencia operativa. No se fusionó ni modificó esa rama. `main` no se incorporó. No había cambios locales ni AGENTS.md en el árbol al iniciar.

Después: repositorio SQLite de producción, caché persistente de catálogo validado, preparación transaccional bloqueada por incompatibilidad comprobada en el cliente, seguimiento por usuario y tablero persistido de demostración con transporte simulado. No se enviaron pedidos a producción.

## MVVM y archivos

- Vistas: resumen, catálogo, seguimiento y cocina. No ejecutan SQL ni HTTP.
- ViewModels: selección/búsqueda, edición, resumen, `useSeguimientoViewModel` y `useCocinaViewModel`; administran carga, acciones y errores.
- `SQLitePedidoRepository`: contrato PedidoRepository, operaciones transaccionales, revisiones para evitar sobrescrituras obsoletas, observadores tras commit. InMemory permanece para pruebas.
- `CachedCatalogoRepository`: reutiliza HttpCatalogoRepository y su normalización; persiste solo el catálogo completo devuelto por ese repositorio; fallo de red/validación conserva la versión anterior.
- `FlujoComandaService`: autoriza al mesero y prepara instantánea/cola en una transacción. Reutiliza configuración SecureStore y el singleton SyncService para reintentar/conciliar operaciones elegibles existentes.
- `DemoCocinaService`: transporte y reloj inyectables; copias aisladas, recibos simulados idempotentes y transiciones de cocina.
- `SesionAutenticada`: restaura sesión previamente autenticada desde SecureStore durante 24 horas tras login; no guarda contraseña. El primer login y el cambio de cuenta requieren red. La caducidad se verifica al restaurar, no constituye validación online de revocaciones/actividad de cuenta.
- `SesionLocal`: contexto de actor procedente de AuthContext a través del navegador. Los repositorios y servicios validan propietario/rol además de la navegación.

Recorrido: Vista → ViewModel → servicio/repositorio → conexión SQLite compartida → commit → observadores. Seguimiento/cocina vuelven a consultar cada 3 segundos; el mesero ve el estado del ticket de demostración en Seguimiento al regresar a su cuenta en el mismo dispositivo.

## Migración y dinero

Versión 1 → 2, transacción incremental. Se preservan `comandas_locales`, `comanda_items_locales` y `operaciones_pendientes`. Se agregan folio/total confirmado a comandas locales y tablas:

- `pedidos_mvvm`: documento completo del borrador, mesa/usuario/estado indexados; índice único parcial de mesa abierta.
- `catalogo_cache`: última respuesta válida y fecha ISO.
- `preparaciones_mvvm`: instantánea completa y requestId únicos por comanda.
- `demo_envios`, `demo_recibos`, `cocina_demo`: datos exclusivos del simulador, nunca seleccionados por el procesador LAN.

El documento conserva identificadores originales, notas, fechas, historial y campos adicionales serializables. Producto, producto-presentación y tamaño son campos distintos. Cada línea tiene ID propio: dos presentaciones no se agrupan. Al persistir se adapta explícitamente precio en pesos a `Math.round(precioUnitario * 100)`; subtotal y total se calculan con enteros seguros; al leer se divide entre 100 para los modelos existentes. No se persisten los importes en pesos en los documentos nuevos.

Las transacciones de escritura de los repositorios se serializan antes de abrir la transacción exclusiva de Expo para evitar competencia local. La restricción única SQLite sigue protegiendo la mesa. Una escritura fallida revierte el conjunto y no publica eventos. Las revisiones rechazan guardados obsoletos.

## Estados y contrato LAN

Estado de negocio: borrador/enviado/cancelado. El nuevo flujo se mantiene como borrador mientras está bloqueado: preparar no prueba envío. Estado de sincronización: pendiente, enviando, confirmada, error reintentable, rechazada, conflicto, resultado desconocido y bloqueada. Estado de cocina demo: pendiente → en_preparacion → listo; sin retrocesos. La confirmación POS no crea tickets de cocina.

Endpoints presentes y comprobados en **el cliente móvil**, no mediante un servidor POS real:

- POST `/api/local/pedidos`: `{ requestId, mesa, meseroId, productos: [{ productoId, cantidad }] }`.
- GET `/api/local/pedidos/por-request/:requestId`: conciliación de contenido e identidad.

No se dispuso de una fuente del servidor POS que demuestre que los UUID de catálogo son sus IDs de producto ni cómo representa presentaciones. El catálogo existente tiene productoId, productoTamanioId y tamanioId; el payload LAN simple solo productoId/cantidad. No existe adaptación verificada sin pérdida. Por ello, **todas las nuevas preparaciones del catálogo quedan BLOQUEADAS**, con el texto “No compatible con el contrato POS actual” y motivos específicos. No se convierten UUID a SKU ni se envían variantes/notas como productos simples. La instantánea rica permanece íntegra en SQLite; el procesador no consume intentos de esas operaciones.

Preparar es idempotente y congela la comanda. Después solo se permite consultar seguimiento o crear su copia aislada de demostración. En esta iteración no hay desbloqueo/cancelación de una preparación ni liberación de mesa tras finalización; usar otra mesa para otro caso académico. La lista operativa no publica borradores en cocina.

Los reintentos manuales usan el mismo singleton SyncService que el procesador. La actualización condicional a ENVIANDO protege también frente a otra instancia. Conservan requestId y respetan espera y máximo de seis intentos. Se mantiene el interruptor preexistente `__DEV__ && EXPO_PUBLIC_POS_SYNC_DEMO === 'true'`; no se activa por esta implementación. Un timeout, interrupción de conexión o HTTP ambiguo tras iniciar la petición pasa a resultado desconocido. Un 429 conserva espera exponencial. La conciliación 404 no habilita reenvío. Los recibos válidos conservan ID, folio y total confirmado; Seguimiento advierte discrepancias sin sustituir el total local.

## Cocina: alcance explícito

No se comprobaron endpoints de consulta/actualización de cocina POS. Se implementó el escenario B, “Demostración local”, etiquetado permanentemente. Un mesero crea una copia inmutable del pedido, el transporte simulado registra su propio recibo y solo después aparece el ticket demo. Confirmación perdida guarda recibo pero no ticket hasta conciliar. El rol cocina puede consultar y avanzar estados; el mesero consulta el estado de su copia. Las tablas y tipos están aislados de las operaciones LAN. No comunica dispositivos ni confirma recepción del POS.

## Guion reproducible (7 minutos)

Preparación: dispositivo con Expo compatible y cuentas reales de mesero y cocina autorizadas para pruebas. No usar producción. Una instalación sin sesión necesita autenticarse con red. Las cuentas/credenciales no se inventan. Para repetir rechazo/conflicto/timeout usar otra mesa, pues cada copia es inmutable e idempotente.

1. **0:00–1:00:** iniciar sesión como mesero con red; abrir catálogo y Actualizar. Comprobar categorías, presentaciones y fecha. Abrir mesa libre.
2. **1:00–2:00:** desconectar red. Actualizar: debe mostrar “Catálogo guardado”, fecha y aviso. Buscar/filtrar; agregar dos presentaciones del mismo producto con sus precios reales guardados. Las imágenes remotas pueden faltar.
3. **2:00–3:00:** Mi pedido → Editar comanda. Cambiar cantidades y observaciones; guardar y verificar importes. Los cambios se guardan antes de preparar.
4. **3:00–4:00:** cerrar completamente y reabrir la app dentro de la ventana de sesión offline. Seleccionar la misma mesa: recuperar pedido, cantidades y notas. El historial queda persistido y se verifica por la prueba SQLite; no se agregó una pantalla de historial.
5. **4:00–5:00:** Mi pedido → Preparar / seguimiento → Preparar / enviar al POS. Comprobar bloqueo exacto, requestId estable, cero intentos y edición bloqueada. Volver a preparar no duplica la operación.
6. **5:00–6:00:** en la sección “Demostración local”, Crear copia. Simular error de red, esperar al menos 5 s, luego Simular confirmación perdida. Debe quedar resultado desconocido sin ticket. Conciliar con transporte simulado: queda confirmada con el mismo requestId y un ticket único.
7. **6:00–7:00:** reconectar red para cambiar de cuenta, cerrar sesión e iniciar con cocina en **el mismo dispositivo**. Filtrar pendiente, iniciar preparación, filtrar en preparación, marcar lista y filtrar lista. Reiniciar y comprobar estado persistido. Volver a la cuenta del mesero y su Seguimiento para ver “listo”. No se afirma sincronización entre teléfonos.

Instalación sin caché: autenticar primero si no hay sesión, abrir catálogo sin red y comprobar el mensaje “Sin catálogo guardado. Conecta la red y pulsa Reintentar”. Para un primer arranque totalmente offline tampoco se puede crear una identidad autenticada; esto es intencional.

## Pruebas y límites de validación

Antes de cambios: TypeScript correcto; 61 pruebas unitarias (11 suites), patrones 5/5, API 7/7. Los lanzadores `.ps1` fueron bloqueados por la política de PowerShell; se usaron `npx.cmd` y `npm.cmd`, sin cambiar esa política.

Validación automatizada final:

- `npx.cmd tsc --noEmit`: correcto.
- `npm.cmd run test:unit -- --watch=false`: 65 pruebas, 12 suites, correctas; incluye navegación representativa catálogo/resumen/edición/seguimiento y sesión segura.
- `npm.cmd run test:patterns`: 5 correctas. El test Singleton comprueba identidad y tipo SQLite; la persistencia ya no se prueba escribiendo un pedido incompleto en el repositorio de producción sin sesión.
- `npm.cmd run test:api`: 7 correctas, transporte HTTP simulado.
- `npm.cmd run test:offline`: 11 casos dentro de un test integrado (Node cuenta 12), correctos. Requiere Node con `node:sqlite` (ejecutado con 22.17). Transpila el código de producción; adapta la interfaz Expo a DatabaseSync, con archivo SQLite real. Ejecuta DDL v1 real y migración v2, conserva una operación previa, cierra/reabre conexión, instancia nueva, dispara triggers para fallar escrituras y comprobar rollback/no notificación, comprueba variantes/centavos/historial, caché inválida/offline, doble apertura/preparación, bloqueo, autorización y cocina. También ejecuta SyncService con transporte inyectado para HTTP 422/409/429, timeout, conexión interrumpida, confirmación, conciliación/404, requestId estable y envío concurrente. No llama a una API real.
- `git diff --check`: correcto.
- `npx.cmd expo export --platform android --output-dir .expo-export-check`: correcto; artefacto local ignorado por Git. Es bundle Android, no APK ni ejecución en dispositivo.

Durante implementación se corrigieron un fallo de importación nativa en Jest mediante carga diferida de SQLite y la antigua prueba Singleton que suponía almacenamiento en memoria. No son fallos previos a este trabajo.

Pendiente en dispositivo: cierre forzado de Expo/Android, persistencia real SecureStore, comportamiento de Expo SQLite nativo bajo competencia, restauración offline, teclado/scroll, verificación visual de pantallas y flujo de cambio de cuentas. No se tomaron capturas ni se ejecutó Expo Go. El adaptador Node valida SQLite real pero no reemplaza el runtime nativo.

## Prueba futura con POS real y contrato propuesto

1. Obtener contrato/fuente y entorno POS de pruebas, token LAN autorizado y catálogo con correspondencia verificable.
2. Comprobar autenticación, IDs de usuario, requestId idempotente, catálogo producto/presentación, recibos y consulta por requestId. Nunca inferir correspondencia por nombre.
3. Ampliar API en un trabajo separado para admitir `productoId`, `productoTamanioId`, `tamanioId`, cantidad, notas por línea/comanda y personalización versionada. Proponer precios/total en centavos calculados por POS, recibo con requestId, ID, folio y total, y errores explícitos de incompatibilidad. Esto es una **propuesta**, no un endpoint disponible.
4. Añadir endpoints autorizados de cocina para listado, versión y transiciones validadas con autoridad POS. No cambiar a cocina operativa solo por recibir un recibo de pedido.
5. Solo tras verificar esos contratos, implementar adaptador explícito y quitar bloqueo para los casos realmente compatibles; probar rechazo, duplicado y conciliación en ese entorno. La nueva UI no ofrece un bypass.

No se agregaron pagos, inventario, impresoras ni precios de ejemplo al flujo operativo. Extras/masa/orilla/mitades dependen del catálogo y contrato reales, y el PR #14 permanece separado.
