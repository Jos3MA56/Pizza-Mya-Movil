
# Preparación del ambiente y datos de pruebas

## Información general

- Proyecto: Pizza Mya Móvil
- Actividad: 18. Preparar ambiente y datos de pruebas
- Responsable: José Antonio Martínez Alvarado
- Metodología: XP + Kanban
- Arquitectura: MVVM
- Estado: En preparación

## 1. Objetivo

Preparar un ambiente controlado para realizar pruebas
funcionales y de integración de Pizza Mya Móvil.

El ambiente permitirá verificar la autenticación,
la captura de comandas y, posteriormente, la
comunicación con el punto de venta (POS) y cocina.

Se utilizarán datos ficticios para evitar afectar
las operaciones reales de Pizza Mya.

## 2. Componentes del ambiente

| Componente | Tecnología | Uso |
|---|---|---|
| Desarrollo | Visual Studio Code | Edición y ejecución del proyecto |
| Aplicación móvil | React Native + Expo | Interfaz móvil |
| Dispositivo | Android + Expo Go | Ejecución y pruebas |
| Control de versiones | Git y GitHub | Trabajo colaborativo |
| Backend | Node.js + Express | API existente |
| Base de datos | PostgreSQL / Supabase | Persistencia del backend |
| Pruebas API | Postman | Verificación de endpoints |
| POS | Sistema en desarrollo | Integración futura |
| Almacenamiento local | SQLite, propuesto | Persistencia local futura |

## 3. Configuración del ambiente

### 3.1. Aplicación móvil

La aplicación se ejecutará en un dispositivo Android
mediante Expo Go.

Se utilizará el servidor de desarrollo de Expo
para cargar los cambios realizados en VS Code.

### 3.2. Backend

Se reutilizará el backend existente de Pizza Mya.

La aplicación consumirá sus endpoints mediante
la configuración EXPO_PUBLIC_API_URL.

No se almacenarán contraseñas ni claves privadas
en el código fuente.

### 3.3. Base de datos

El backend utiliza PostgreSQL mediante Supabase.

Antes de realizar pruebas que creen, modifiquen
o eliminen registros, se deberá disponer de
datos aislados de producción.

No se utilizarán comandas ficticias dentro de
las ventas reales del restaurante.

### 3.4. Punto de venta

El nuevo POS se integrará posteriormente.

Las pruebas de comunicación con mesas, comandas
y cocina se realizarán cuando exista un entorno
del POS disponible para desarrollo.


## 4. Estado de verificación

| Elemento | Estado | Evidencia u observación |
|---|---|---|
| VS Code y proyecto móvil | Verificado | Proyecto abierto y configurado |
| Expo Go en Android | Verificado | Aplicación ejecutada en dispositivo |
| Servidor de desarrollo Expo | Verificado | Ejecución previa satisfactoria |
| Configuración de API | Verificado | Variable EXPO_PUBLIC_API_URL configurada |
| Autenticación real | Verificado | Inicio de sesión probado con backend |
| Base de datos aislada | Pendiente | No se ha confirmado un entorno separado |
| POS Electron de desarrollo | Pendiente de verificar | Requiere comprobar el entorno de pruebas |
| Almacenamiento SQLite | No implementado | Existe documentación de diseño |
| Sincronización móvil-POS | No implementada | Actividad independiente |


Los estados se actualizarán con base en
las verificaciones realizadas.


## 5. Preparación de usuarios de prueba

Se definen usuarios de prueba para validar los
diferentes roles del sistema Pizza Mya.

| ID de prueba | Rol | Propósito |
|---|---|---|
| MESERO-01 | MESERO | Captura de comandas |
| MESERO-02 | MESERO | Pruebas con múltiples meseros |
| COCINA-01 | COCINA | Recepción de comandas |
| CAJERO-01 | CAJERO | Operaciones del POS |
| CLIENTE-01 | CLIENTE | Validación de restricciones |

Los identificadores son referencias para las pruebas,
no credenciales de autenticación.

### 5.1. Reglas para usuarios de prueba

- Utilizar cuentas destinadas exclusivamente a pruebas.
- No registrar contraseñas en el repositorio.
- No utilizar credenciales administrativas reales.
- Verificar que los roles correspondan al sistema.
- No modificar usuarios reales de producción.
- Crear cuentas únicamente en un entorno autorizado.

### 5.2. Estado de preparación

Los usuarios anteriores constituyen datos propuestos.

Su creación y validación quedan pendientes hasta
disponer de un entorno aislado de pruebas.

## 6. Preparación de mesas de prueba

El nuevo POS de Pizza Mya permitirá administrar
mesas dinámicamente.

Se contempla una configuración habitual de 20 mesas
y un límite previsto de 50.

| Caso | Mesa | Escenario |
|---|---|---|
| MESA-01 | 1 | Crear una comanda |
| MESA-02 | 5 | Agregar productos a una comanda |
| MESA-03 | 10 | Operaciones de dos meseros |
| MESA-04 | 21 | Agregar una mesa adicional |
| MESA-05 | 50 | Validar límite previsto |

### 6.1. Reglas de prueba

- Las mesas deberán identificarse de forma única.
- Se probará la creación de mesas adicionales.
- Una mesa podrá recibir productos desde el móvil
  y desde el POS, según las reglas de integración.
- Las operaciones deberán conservar su origen.
- No se utilizarán mesas de producción para pruebas.

### 6.2. Estado de preparación

Los escenarios están definidos, pero todavía no
se han creado registros de prueba en el POS.

## 7. Aislamiento de los datos de prueba

Las pruebas que modifiquen información deberán
realizarse en un entorno separado de producción.

El ambiente deberá contar con:

- Base de datos de pruebas independiente.
- Usuarios ficticios con roles controlados.
- Productos y precios identificados como pruebas.
- Mesas y comandas que no afecten las ventas reales.
- Configuración de conexión específica para pruebas.

Las operaciones de prueba no deberán enviarse
a los servicios reales de cocina, caja o reparto.


## 8. Preparación de productos de prueba

Se define un conjunto inicial de productos ficticios
para utilizar durante las pruebas funcionales de
Pizza Mya Móvil.

Los productos se basan en las categorías que maneja
la pizzería: pizzas, bebidas y complementos.

### 8.1. Catálogo de prueba

| ID | Producto | Categoría | Tamaño o presentación |
|---|---|---|---|
| PIZ-001 | Hawaiana | Pizza | Individual |
| PIZ-002 | Pepperoni | Pizza | Mediana |
| PIZ-003 | Mexicana | Pizza | Grande |
| PIZ-004 | Hawaiana | Pizza | Jumbo |
| BEB-001 | Refresco | Bebida | Por definir |
| BEB-002 | Agua natural | Bebida | Por definir |
| COM-001 | Papas | Complemento | Por definir |

Los IDs son identificadores exclusivos de las
pruebas y no corresponden necesariamente a los
identificadores reales de PostgreSQL.

Los precios se obtendrán del catálogo configurado
en el ambiente de pruebas.

### 8.2. Personalizaciones de prueba

| ID | Personalización | Descripción |
|---|---|---|
| PER-001 | Sin ingrediente | Pizza sin un ingrediente |
| PER-002 | Ingrediente adicional | Agregar un ingrediente extra |
| PER-003 | Orilla personalizada | Seleccionar una opción de orilla |
| PER-004 | Indicaciones | Registrar observaciones de cocina |

Estas personalizaciones deberán validarse contra
las opciones disponibles en el catálogo y el POS.

## 9. Preparación de comandas de prueba

Se definen escenarios para comprobar posteriormente
la captura, modificación y comunicación de comandas.

### 9.1. Escenarios

| ID | Mesa | Descripción | Resultado esperado |
|---|---|---|---|
| CMD-001 | 1 | Una pizza hawaiana individual | Comanda registrada |
| CMD-002 | 5 | Pizza pepperoni mediana y dos refrescos | Productos agrupados en una comanda |
| CMD-003 | 10 | Pizza mexicana grande sin ingrediente | Personalización conservada |
| CMD-004 | 21 | Pizza hawaiana jumbo | Mesa adicional admitida |
| CMD-005 | 1 | Agregar un refresco a una comanda existente | Modificación registrada |
| CMD-006 | 5 | Cancelar un producto antes de enviarlo | Producto retirado del borrador |
| CMD-007 | 10 | Modificar una comanda ya confirmada | Nueva operación registrada |
| CMD-008 | 21 | Guardar una comanda sin conexión | Operación pendiente conservada |

### 9.2. Reglas de preparación

- Cada comanda tendrá un identificador de prueba.
- Los productos deberán asociarse a su comanda.
- Las cantidades deberán ser mayores que cero.
- Los precios se consultarán en el ambiente de prueba.
- Las personalizaciones deberán conservarse.
- Las cancelaciones deberán respetar el estado
  de la comanda.
- Las modificaciones posteriores a la confirmación
  deberán generar una operación independiente.
- No se enviarán comandas ficticias a producción.

### 9.3. Estados esperados

Se utilizarán los estados definidos en el documento
de diseño de almacenamiento local:

- BORRADOR
- PENDIENTE_ENVIO
- ENVIANDO
- CONFIRMADA
- ERROR_ENVIO
- CONFLICTO

Estos estados permitirán verificar posteriormente
el comportamiento del almacenamiento y la
comunicación con el POS.

## 10. Resultados de las pruebas

Los escenarios anteriores todavía no representan
pruebas ejecutadas.

Los resultados se documentarán cuando los módulos
correspondientes estén implementados y exista un
ambiente seguro para ejecutarlos.

Cada ejecución deberá registrar:

- Identificador del escenario.
- Fecha de ejecución.
- Responsable.
- Resultado esperado.
- Resultado obtenido.
- Estado: aprobado, fallido o bloqueado.
- Evidencia, cuando corresponda.


## 11. Escenarios de conectividad y recuperación

Se definen escenarios para comprobar el comportamiento
de Pizza Mya Móvil ante interrupciones de conectividad.

Las pruebas se ejecutarán cuando estén disponibles
los módulos de almacenamiento y sincronización.

### 11.1. Matriz de escenarios

| ID | Escenario | Procedimiento previsto | Resultado esperado |
|---|---|---|---|
| RED-001 | Conexión estable | Conectar móvil al servicio de pruebas y realizar una solicitud | Comunicación correcta |
| RED-002 | Pérdida de Internet | Desactivar Wi-Fi y datos móviles | La aplicación informa de la falta de conexión |
| RED-003 | POS no disponible | Desconectar el servicio de pruebas del POS | La comanda queda pendiente sin perderse |
| RED-004 | Reconexión | Restablecer la comunicación después de registrar una operación pendiente | Operación procesada sin duplicados |
| RED-005 | Cierre inesperado | Guardar borrador y cerrar la aplicación | Recuperación del borrador |
| RED-006 | Reinicio de dispositivo | Guardar información y reiniciar Android | Conservación de datos persistidos |
| RED-007 | Respuesta tardía | Simular una confirmación tardía del POS | La comanda no se registra dos veces |

### 11.2. Consideraciones de red

La pérdida de Internet y la pérdida de conexión con
el POS se evaluarán como situaciones distintas.

Si el POS utiliza la red local, puede ser accesible
aunque no exista conexión a Internet.

Por lo tanto, las pruebas deberán comprobar
separadamente:

- Conectividad del móvil con el backend.
- Conectividad del móvil con el servicio del POS.
- Disponibilidad de datos locales.
- Estado de las operaciones pendientes.

### 11.3. Condiciones previas

Antes de ejecutar los escenarios será necesario:

1. Tener disponible el entorno de pruebas.
2. Contar con datos ficticios.
3. Implementar la persistencia local requerida.
4. Disponer de un servicio del POS para las pruebas
   que involucren recepción de comandas.
5. Registrar el estado inicial de los dispositivos.
6. Evitar comunicaciones con servicios de producción.

### 11.4. Registro de resultados

Cada prueba deberá registrar:

- Identificador del escenario.
- Fecha de ejecución.
- Dispositivo utilizado.
- Condiciones de conectividad.
- Resultado esperado.
- Resultado obtenido.
- Estado final: aprobado, fallido o bloqueado.
- Evidencia de la prueba.

Los escenarios se consideran preparados, pero no
ejecutados hasta contar con evidencia verificable.

## 12. Criterios de aceptación del ambiente

La preparación se considerará completa cuando:

- Se documenten las herramientas utilizadas.
- Se compruebe la ejecución básica de Expo Go.
- Se identifique la configuración de conexión a la API.
- Se definan los usuarios y roles de prueba.
- Se documenten mesas y productos ficticios.
- Se preparen escenarios de comandas.
- Se definan pruebas de conectividad y recuperación.
- Se identifiquen los recursos todavía pendientes.
- Se mantenga la separación respecto a producción.

La preparación documental no equivale a la ejecución
exitosa de todos los escenarios funcionales.


## 13. Matriz de preparación del ambiente

Esta matriz identifica los recursos disponibles
y los elementos pendientes para futuras pruebas.

| Recurso | Situación | Acción pendiente |
|---|---|---|
| Aplicación React Native | Disponible | Continuar las pruebas |
| Expo Go | Disponible | Mantener entorno configurado |
| Backend web | Disponible | Verificar uso de entorno de pruebas |
| Autenticación real | Probada anteriormente | Validar otros roles |
| Usuarios ficticios | Documentados | Crear cuentas en entorno aislado |
| Mesas ficticias | Documentadas | Registrar cuando exista POS de pruebas |
| Productos ficticios | Documentados | Preparar catálogo de prueba |
| Comandas ficticias | Documentadas | Ejecutar escenarios posteriormente |
| SQLite | Diseño disponible | Implementar en actividad posterior |
| Sincronización | Pendiente | Coordinar con responsable |

## 14. Riesgos y dependencias

### 14.1. Uso accidental de producción

Existe el riesgo de utilizar la base de datos
real del restaurante durante las pruebas.

Medida preventiva:
No ejecutar operaciones de escritura con datos
ficticios sobre servicios de producción.

### 14.2. Diferencias entre móvil y POS

Las estructuras de datos utilizadas por la
aplicación móvil y el POS podrían ser diferentes.

Medida preventiva:
Validar los contratos de datos antes de
implementar la integración.

### 14.3. Dependencia de almacenamiento local

Las pruebas de persistencia y recuperación requieren
que SQLite esté implementado.

Medida preventiva:
Mantener los escenarios documentados y ejecutarlos
cuando la funcionalidad esté disponible.

### 14.4. Dependencia de sincronización

Los escenarios de reconexión y prevención de
duplicados requieren comunicación con el POS.

Medida preventiva:
Coordinar las pruebas con el responsable de la
integración y sincronización.

## 15. Conclusión

Se documentó la preparación del ambiente y los
datos necesarios para realizar pruebas de
Pizza Mya Móvil.

Se identificaron las herramientas disponibles,
los usuarios, las mesas, los productos, las
comandas ficticias y los escenarios de conectividad.

La preparación documental permite organizar las
pruebas posteriores e identificar las dependencias
que todavía deben resolverse.

Los escenarios pendientes no se consideran
ejecutados ni aprobados hasta contar con
resultados y evidencias verificables.
