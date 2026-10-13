
# Diseño de almacenamiento local — Pizza Mya Móvil

## Información general

- Proyecto: Pizza Mya Móvil
- Responsable: José Antonio Martínez Alvarado
- Metodología: XP + Kanban
- Arquitectura: MVVM
- Plataforma: React Native con Expo
- Estado: En diseño

## 1. Objetivo

Diseñar la estructura de almacenamiento local de la
aplicación móvil Pizza Mya para conservar información
necesaria durante la captura de comandas.

El almacenamiento permitirá recuperar información
después de cerrar la aplicación y mantener operaciones
pendientes cuando exista una interrupción de conexión
con el punto de venta (POS).

## 2. Alcance

El diseño contempla:

- Almacenamiento del catálogo necesario para tomar pedidos.
- Conservación de comandas en proceso de captura.
- Almacenamiento de productos y personalizaciones.
- Identificación de comandas pendientes de enviar al POS.
- Recuperación de información al reiniciar la aplicación.
- Protección de los datos sensibles de autenticación.

No contempla en esta actividad:

- Implementación de la base de datos local.
- Programación de la sincronización con el POS.
- Desarrollo de las interfaces de captura de comandas.
- Implementación de los módulos de cocina y reparto.

## 3. Requisitos del almacenamiento local

### AL-01. Conservación de comandas

La aplicación deberá conservar las comandas que el
mesero esté capturando, evitando la pérdida de
información cuando se cierre o reinicie la aplicación.

### AL-02. Almacenamiento del catálogo

La aplicación deberá disponer de información local
de productos, tamaños, precios y opciones necesarias
para la captura de comandas.

### AL-03. Operaciones pendientes

La aplicación deberá identificar las comandas y
modificaciones que todavía no hayan sido confirmadas
por el POS.

### AL-04. Recuperación de información

Al volver a abrir la aplicación, el mesero deberá
poder recuperar las comandas locales que correspondan
a su sesión y continuar trabajando con ellas.

### AL-05. Identificación del mesero

Cada comanda local deberá conservar un identificador
del mesero responsable de su captura.

### AL-06. Protección de credenciales

Las contraseñas no deberán almacenarse localmente.

Los tokens de autenticación deberán manejarse mediante
un mecanismo de almacenamiento protegido.

### AL-07. Diferenciación de estados

La aplicación deberá distinguir entre una comanda
guardada localmente y una comanda cuya recepción haya
sido confirmada por el POS.

### AL-08. Prevención de duplicados

Cada operación pendiente deberá contar con un
identificador único que permita reconocerla durante
futuros intentos de envío.


## 4. Diseño de entidades locales

Se propone utilizar cinco tablas SQLite para
almacenar la información operativa de Pizza Mya Móvil.

### 4.1. productos_locales

Almacena información básica del catálogo.

| Campo | Tipo propuesto | Descripción |
|---|---|---|
| id | TEXT | Identificador del producto |
| nombre | TEXT | Nombre de la especialidad o producto |
| categoria_id | TEXT | Categoría del producto |
| activo | INTEGER | Indica si está disponible |
| actualizado_en | TEXT | Fecha de actualización |

### 4.2. variantes_locales

Almacena tamaños y precios del catálogo.

| Campo | Tipo propuesto | Descripción |
|---|---|---|
| id | TEXT | Identificador de la variante |
| producto_id | TEXT | Producto relacionado |
| tamanio | TEXT | Individual, mediana, grande o jumbo |
| precio_centavos | INTEGER | Precio expresado en centavos |
| activo | INTEGER | Disponibilidad de la variante |

### 4.3. comandas_locales

Almacena la información general de una comanda.

| Campo | Tipo propuesto | Descripción |
|---|---|---|
| id_local | TEXT | Identificador UUID local |
| id_pos | TEXT | Identificador asignado por el POS, si existe |
| mesa_referencia | TEXT | Identificación de la mesa |
| mesero_id | TEXT | Identificador del mesero |
| estado | TEXT | Estado local de la comanda |
| creada_en | TEXT | Fecha de creación |
| actualizada_en | TEXT | Última modificación |

### 4.4. comanda_items_locales

Almacena los productos capturados en una comanda.

| Campo | Tipo propuesto | Descripción |
|---|---|---|
| id_local | TEXT | Identificador del detalle |
| comanda_id | TEXT | Comanda relacionada |
| producto_id | TEXT | Producto seleccionado |
| variante_id | TEXT | Tamaño o presentación |
| nombre_producto | TEXT | Nombre al momento de capturar |
| cantidad | INTEGER | Cantidad solicitada |
| precio_centavos | INTEGER | Precio al momento de capturar |
| personalizacion_json | TEXT | Ingredientes y modificaciones |
| notas | TEXT | Indicaciones adicionales |

### 4.5. operaciones_pendientes

Almacena las operaciones que requieren confirmación
del nuevo POS.

| Campo | Tipo propuesto | Descripción |
|---|---|---|
| id_operacion | TEXT | UUID único de la operación |
| comanda_id | TEXT | Comanda relacionada |
| tipo | TEXT | Creación, modificación o cancelación |
| payload_json | TEXT | Datos de la operación |
| estado | TEXT | Pendiente, enviando o error |
| intentos | INTEGER | Número de intentos realizados |
| creada_en | TEXT | Fecha en que se registró |

## 5. Relaciones entre entidades

- Un producto puede tener varias variantes.
- Una comanda puede contener varios productos.
- Cada detalle pertenece a una comanda.
- Cada detalle puede referenciar un producto y variante.
- Una comanda puede generar varias operaciones pendientes.
- Las comandas se relacionan con el identificador
  del mesero que las capturó.

## 6. Consideraciones de diseño

- Los identificadores locales serán UUID.
- Las fechas se almacenarán en formato ISO 8601.
- Los precios se almacenarán como enteros en centavos.
- Las personalizaciones se conservarán como JSON.
- Se utilizarán claves foráneas cuando corresponda.
- Se conservará el precio capturado para evitar que
  cambios futuros del catálogo alteren comandas previas.
- Una comanda local no se considerará recibida por el
  POS hasta obtener una confirmación.

Este diseño es preliminar y deberá validarse antes
de implementar las tablas físicas en SQLite.


## 7. Estados de almacenamiento de las comandas

El almacenamiento local permitirá identificar el estado
de cada comanda respecto a su registro en el POS.

### 7.1. Estados definidos

| Estado | Descripción |
|---|---|
| BORRADOR | Comanda en proceso de captura |
| PENDIENTE_ENVIO | Guardada localmente, sin confirmación del POS |
| ENVIANDO | Operación de envío en curso |
| CONFIRMADA | Recepción confirmada por el POS |
| ERROR_ENVIO | Falló el envío y requiere reintento |
| CONFLICTO | Operación rechazada que requiere revisión |

Estos estados no representan el avance de preparación
de los alimentos.

### 7.2. Reglas generales

1. Una comanda debe guardarse localmente antes de
   intentar enviarla al POS.

2. Una comanda en BORRADOR podrá modificarse sin
   generar un envío inmediato.

3. Cuando el mesero termine de capturarla, la comanda
   pasará a PENDIENTE_ENVIO.

4. La comanda solamente cambiará a CONFIRMADA cuando
   exista una respuesta válida del POS.

5. Si falla la comunicación, se conservarán los datos
   y el identificador original de la operación.

6. Una comanda pendiente no deberá mostrarse como
   recibida por cocina.

7. Las modificaciones y cancelaciones de comandas
   confirmadas deberán registrarse como nuevas
   operaciones, sin borrar silenciosamente el historial.

### 7.3. Diferencia entre comanda y operación

El estado de una comanda representa su situación
general respecto al POS.

El estado de una operación representa la situación
de una acción específica, como crear, modificar
o cancelar un producto de una comanda.

Una comanda confirmada puede tener nuevas operaciones
pendientes de envío.

Por lo tanto, los estados de sincronización de las
operaciones se administrarán de forma independiente.

No se modificará una comanda confirmada de manera
silenciosa sin registrar la operación correspondiente.

## 8. Recuperación de información local

La aplicación deberá recuperar información después de
un cierre inesperado o reinicio del dispositivo.

### 8.1. Recuperación de borradores

Cuando el mesero vuelva a iniciar sesión:

- Se identificarán las comandas locales correspondientes.
- Se recuperarán los productos y personalizaciones.
- Se permitirá continuar la captura.
- No se generarán envíos sin una acción prevista.

### 8.2. Recuperación de operaciones pendientes

El sistema deberá identificar las operaciones que no
cuentan con una confirmación registrada.

Se conservarán:

- Identificador único de la operación.
- Identificador de la comanda.
- Tipo de operación.
- Datos necesarios para realizarla.
- Estado actual.
- Cantidad de intentos.
- Fecha de creación.

### 8.3. Interrupción durante el envío

Si la aplicación se cierra mientras una operación está
en estado ENVIANDO, su resultado se considerará
desconocido hasta consultar o reintentar de forma segura.

No deberá generarse un identificador nuevo para la
misma operación.

El POS deberá reconocer los identificadores repetidos
para impedir duplicados.

### 8.4. Pérdida de conexión

Cuando no exista conexión con el servicio local del POS:

- Se conservarán las comandas en el dispositivo.
- Los borradores podrán seguir editándose.
- Los pedidos pendientes deberán identificarse claramente.
- No se asumirá que cocina recibió la comanda.
- Los reintentos se gestionarán posteriormente mediante
  el módulo de sincronización.

### 8.5. Separación de responsabilidades

El almacenamiento local es responsable de conservar
los datos y registrar su estado.

El mecanismo de sincronización, que se desarrollará
posteriormente, será responsable de establecer la
comunicación, ejecutar reintentos y procesar respuestas
del POS.


## 9. Seguridad del almacenamiento local

El almacenamiento local de Pizza Mya Móvil deberá
proteger la información operativa y los datos de
autenticación de los empleados.

### 9.1. Tecnologías seleccionadas

Se propone utilizar:

- expo-sqlite: almacenamiento de productos, comandas
  y operaciones pendientes.
- expo-secure-store: almacenamiento protegido del
  token JWT de autenticación.

La aplicación no almacenará contraseñas localmente.

### 9.2. Control de acceso

Cada comanda local estará asociada al identificador
del mesero responsable.

La aplicación deberá filtrar la información mostrada
según el usuario autenticado.

El rol del empleado se validará mediante el sistema
de autenticación existente.

El almacenamiento local no sustituye las validaciones
de permisos que corresponden al backend o al POS.

### 9.3. Cierre de sesión

Al cerrar sesión:

- Se eliminará el token de autenticación almacenado.
- Se limpiará el estado del usuario en memoria.
- No se eliminarán automáticamente las operaciones
  pendientes de confirmación.
- Se impedirá mostrar las comandas del empleado
  anterior al siguiente usuario.

Las políticas de conservación y eliminación de
datos operativos se definirán antes de implementar
el almacenamiento.

### 9.4. Protección de información

- No almacenar contraseñas.
- No registrar tokens en la consola.
- Evitar guardar datos personales innecesarios.
- No incluir credenciales en archivos versionados.
- Asociar las operaciones locales al empleado
  correspondiente.
- No considerar SQLite un almacenamiento cifrado
  por defecto.

## 10. Integración con arquitectura MVVM

La persistencia local se integrará respetando
las responsabilidades de la arquitectura MVVM.

### 10.1. Models

Representarán las estructuras de datos utilizadas
por la aplicación.

Modelos previstos:

- ProductoLocal
- VarianteLocal
- ComandaLocal
- ComandaItemLocal
- OperacionPendiente

### 10.2. Views

Mostrarán los datos al usuario y permitirán
interactuar con las comandas.

Las vistas no ejecutarán directamente consultas SQL.

### 10.3. ViewModels

Gestionarán la lógica de presentación y los estados
de las pantallas.

Por ejemplo:

- Recuperar comandas guardadas.
- Solicitar el almacenamiento de una comanda.
- Mostrar errores al guardar información.
- Informar si una comanda está pendiente de envío.

### 10.4. Repositories

Serán responsables de acceder a los datos locales.

Métodos previstos:

- guardarComanda()
- obtenerComandasPorMesero()
- obtenerComandaPorId()
- actualizarComanda()
- guardarOperacionPendiente()
- obtenerOperacionesPendientes()

### 10.5. Services

Se utilizarán para encapsular la inicialización
de SQLite y el acceso a mecanismos de almacenamiento
seguro.

La implementación concreta se realizará en una
actividad posterior.

## 11. Consideraciones para la implementación

Antes de implementar el almacenamiento local será
necesario:

1. Confirmar los contratos de datos con el POS.
2. Definir migraciones de la base de datos SQLite.
3. Establecer reglas de conservación y limpieza.
4. Determinar cómo manejar múltiples empleados
   utilizando el mismo dispositivo.
5. Definir pruebas de recuperación después de un
   cierre inesperado.
6. Confirmar cómo se protegerán los datos sensibles
   almacenados localmente.
