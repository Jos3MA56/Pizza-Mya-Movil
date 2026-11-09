# Integrar envío de pedidos con POS

Responsable: Pablo Ruiz Santos (20230031@uthh.edu.mx).
Tarea: https://app.notion.com/4004426ff5e381f9b498f6c70179701c
Rama: `feature/envio-pedidos-pos`.
Base: `a6059979e12acd42aca965376aefbaa74cf94260`, avance offline ya publicado.

## Entrega

La aplicación prepara una instantánea inmutable del pedido y la envía al
POS con contrato LAN v2. Conserva los identificadores de producto,
presentación, tamaño y renglón, cantidades, notas y total local. Muestra el
folio y el total confirmados; advierte diferencias con el precio local.
Los reintentos reutilizan el contenido y requestId. Una respuesta incierta
se concilia antes de volver a enviar. Los rechazos muestran el motivo y
permiten reintentar el mismo contenido tras corregir la causa en el POS.

La configuración LAN comprueba que exista el contrato v2 y el catálogo
del receptor. Se consultan las mesas reales y se conserva una copia local.
La cola real se habilita cuando hay configuración LAN. Las simulaciones
anteriores continúan identificadas como demostraciones separadas.

## Alcance y aceptación verificable

- Preparar un borrador con productos guarda en SQLite el pedido y su cola
  en una sola transacción; la instantánea no se puede editar después.
- Enviar conserva tamaños, cantidades y observaciones por renglón y generales.
- Solo una confirmación compatible permite guardar folio y total del POS.
- Un error de red o respuesta perdida conserva la operación para conciliar.
- Repetir el envío conserva el mismo requestId y contenido.
- Una preparación sin intentos puede cancelarse y archivarse para editar;
  si ya hubo un intento, requiere conciliación.
- La migración incremental conserva las operaciones previas.

## Verificación

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm run test:offline
npm run test:pos-client
npm run test:unit
```

`test:offline` usa el código TypeScript de producción y SQLite real.
`test:pos-client` usa HTTP local y un receptor controlado para comprobar
el contrato del cliente; no requiere copiar el proyecto POS ni contactar
servidores de negocio. No sustituye una prueba de aceptación contra el POS
real con varios dispositivos.

Para demostración manual se necesita un POS externo compatible con LAN v2,
su URL y token configurados, un mesero autorizado y un catálogo preparado.
Crear una comanda, agregar productos y notas y abrir Seguimiento →
Preparar / enviar al POS. Comprobar folio y total confirmado. Si el POS
rechaza al mesero, autorizarlo y reintentar el mismo contenido.

## Trazabilidad

Esta entrega incorpora trabajo previamente desarrollado en
`POS/mobile-integration`, tomando únicamente los archivos del cliente
necesarios para esta tarea. Se registra con la fecha real de integración.
No incorpora el servidor ni la interfaz de escritorio POS, las nuevas hojas
de cocina, vinculación QR, cuentas compartidas, orillas ni otros avances.
La cocina de demostración preexistente permanece como estaba en la base.

La rama depende del avance offline ya publicado. Al compararla con esa
base se ve únicamente esta entrega; comparar con develop incluye también
los commits previos del avance offline mientras estén pendientes de integrar.
Estado propuesto en Notion: En revisión, sujeto a aceptación de la entrega.

Resultado de la entrega: revisión TypeScript correcta; 65 pruebas unitarias, 12 casos SQLite y 4 pruebas HTTP aprobados. Aceptación manual con varios dispositivos pendiente de revisión.
