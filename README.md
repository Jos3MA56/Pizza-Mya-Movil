# Pizza Mya Móvil

## Descripción del proyecto

Pizza Mya Móvil es una aplicación desarrollada con React Native, Expo y TypeScript, orientada a facilitar el registro y la gestión de pedidos realizados por el personal de atención de Pizza Mya.

El sistema contempla su futura integración con el backend existente, el punto de venta (POS) y el área de cocina, para mejorar la comunicación y el seguimiento de los pedidos.

## Tecnologías utilizadas

- **React Native:** Desarrollo de interfaces móviles.
- **Expo:** Entorno de desarrollo y ejecución de la aplicación.
- **Expo Go:** Pruebas de la aplicación en dispositivos móviles.
- **TypeScript:** Tipado estático y organización del código.
- **Git y GitHub:** Control de versiones y colaboración.

## Arquitectura del proyecto

La aplicación utiliza el patrón arquitectónico **Model-View-ViewModel (MVVM)**, que permite separar la representación de datos, la lógica de presentación y la interfaz de usuario.

Además, contempla las capas auxiliares Repositories y Services para organizar el acceso a datos y la comunicación con servicios externos.

### 1. Models (Modelos)

**Ubicación:** `src/models/`

**Responsabilidades:**
- Definir las estructuras de datos del negocio.
- Representar entidades como pedidos y sus estados.
- Mantener los tipos de datos independientes de la interfaz.
- Facilitar el intercambio de datos entre las demás capas.

**Implementación actual:** `Pedido.ts`

Define la interfaz `Pedido`, que contiene el identificador, folio opcional, estado y total de un pedido.

### 2. Views (Vistas)

**Ubicación:** `src/views/`

**Responsabilidades:**
- Mostrar información al usuario.
- Construir pantallas mediante componentes de React Native.
- Capturar las interacciones del usuario.
- Presentar los datos preparados por los ViewModels.
- Evitar implementar directamente la comunicación con la API o el almacenamiento de datos.

**Implementación actual:** `PedidoResumenScreen.tsx`

Presenta una pantalla demostrativa con el identificador, estado y total de un pedido.

### 3. ViewModels (Modelos de vista)

**Ubicación:** `src/viewmodels/`

**Responsabilidades:**
- Preparar los datos que necesitan las vistas.
- Gestionar el estado y la lógica de presentación.
- Transformar datos del modelo a formatos comprensibles para el usuario.
- Coordinar, cuando corresponda, operaciones mediante repositorios.
- Mantener separada la lógica de presentación de los componentes visuales.

**Implementación actual:** `usePedidoResumenViewModel.ts`

Utiliza `useMemo` para generar el título del pedido, recuperar su estado y formatear su importe total.

### 4. Repositories (Repositorios)

**Ubicación:** `src/repositories/`

**Responsabilidades:**
- Definir contratos para las operaciones de acceso a datos.
- Abstraer el origen de la información.
- Permitir la implementación futura de repositorios locales y remotos.
- Facilitar las pruebas y el mantenimiento del sistema.

**Implementación actual:** `PedidoRepository.ts`

Define la interfaz `PedidoRepository` con la operación `obtenerPorId()`.

Actualmente es un contrato y todavía no cuenta con una implementación funcional.

### 5. Services (Servicios)

**Ubicación:** `src/services/`

**Responsabilidades previstas:**
- Gestionar las solicitudes HTTP al backend.
- Centralizar la configuración de acceso a la API.
- Administrar la comunicación con servicios externos.
- Apoyar las operaciones de sincronización y persistencia cuando se implementen.

**Estado actual:** La carpeta está preparada mediante un archivo README. La conexión HTTP todavía no está desarrollada.

## Flujo de funcionamiento

En la demostración actual, una vista utiliza un modelo de pedido de prueba y lo proporciona al ViewModel para obtener la información que debe presentar.

El flujo futuro contempla la siguiente interacción:

1. El usuario interactúa con una View.
2. El ViewModel procesa la acción y coordina la lógica de presentación.
3. El Repository proporciona acceso a los datos.
4. Las implementaciones de los repositorios podrán utilizar servicios remotos o almacenamiento local.
5. Los resultados regresan al ViewModel para actualizar la información presentada por la View.

**Nota:** La integración entre repositorios, servicios y backend todavía es una actividad pendiente.

## Ejecución del proyecto

### Requisitos

- Node.js y npm.
- Visual Studio Code o editor compatible.
- Expo Go instalado en un dispositivo compatible.

### Instalación y ejecución

1. Clonar el repositorio.
2. Abrir la carpeta del proyecto.
3. Ejecutar `npm install`.
4. Iniciar el servidor con `npx expo start`.
5. Escanear el código QR utilizando Expo Go, siguiendo las indicaciones de conexión de Expo.

## Metodología de desarrollo

El proyecto utiliza:

- **Extreme Programming (XP):** Desarrollo iterativo, pruebas, integración frecuente y mejora continua.
- **Kanban:** Organización y seguimiento visual de las actividades pendientes, en proceso y finalizadas.

Las nuevas funcionalidades se desarrollan mediante ramas independientes y se integran utilizando Pull Requests.

## Estado actual

**Implementado:**
- Proyecto inicial con Expo y TypeScript.
- Estructura base de arquitectura MVVM.
- Modelo de pedido.
- ViewModel demostrativo.
- Pantalla visual de resumen de pedido.
- Contrato inicial de repositorio.

**Pendiente:**
- Conexión con el backend.
- Persistencia local y sincronización offline.
- Implementación de los flujos operativos del mesero.
- Integración con POS y cocina.
- Pruebas automatizadas.

## Equipo de desarrollo

- Pablo Ruiz Santos.
- José Antonio Martínez Alvarado.

**Proyecto:** Pizza Mya Móvil.

**Arquitectura:** MVVM con capas auxiliares Repository y Service.

**Plataforma de desarrollo:** React Native con Expo.