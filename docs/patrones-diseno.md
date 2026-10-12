# KAN-02 — Implementación de Repository, Observer y Singleton

**Proyecto:** Pizza Mya Móvil  
**Actividad del tablero:** Aplicar patrones Repository, Observer y Singleton  
**Responsable:** Pablo Ruiz Santos (confirmar en el tablero)  
**Rama prevista:** `feature/patrones-diseno` (crear desde `develop`)  
**Destino del Pull Request:** `develop`  
**Estado:** paquete preparado para validar; no representa un PR creado o integrado.

## 1. Propósito

Establecer mecanismos sencillos y verificables para separar el acceso a datos de la interfaz, comunicar cambios de pedidos a componentes interesados y compartir una única instancia del repositorio temporal. **No se conecta todavía con el backend, cocina ni POS, ni almacena datos sin conexión de manera persistente.**

## 2. Aplicación de los patrones

| Patrón | Archivo principal | Aplicación y justificación |
| --- | --- | --- |
| **Repository** | `src/repositories/PedidoRepository.ts` y `InMemoryPedidoRepository.ts` | El ViewModel depende de un contrato de acceso a pedidos, no del origen concreto de datos. La implementación en memoria permite demostrar el flujo antes de tener la API. |
| **Observer** | `src/observers/PedidoSubject.ts` | Emite cambios a observadores suscritos a un `id` de pedido. `usePedidoResumenViewModel` se suscribe y libera la suscripción al desmontarse. |
| **Singleton** | `src/services/PedidoRepositorySingleton.ts` | Garantiza una única instancia del repositorio de demostración para que diferentes vistas compartan el mismo estado mientras la aplicación esté abierta. |

El repositorio puede **inyectarse como dependencia** del ViewModel, para permitir un reemplazo futuro por un repositorio HTTP/local sin forzar el uso del Singleton en pruebas.

## 3. Flujo demostrativo

```text
PedidoResumenScreen (Vista mesero simulada)
              |
              v
   usePedidoResumenViewModel
              |
              v
      PedidoRepository (contrato)
              |
              v
    InMemoryPedidoRepository
        |            |
   Map de pedidos   PedidoSubject ---> Observadores suscritos
        ^                                   |
        |                                   v
   Singleton compartido               ViewModels actualizan la UI
```

Al pulsar **Marcar como enviado (demo)**, el repositorio guarda el cambio temporal y notifica a los dos observadores independientes. En la pantalla, tanto el estado principal como el **Monitor independiente (simulación)** deben mostrar `enviado` sin recargar. El botón **Reiniciar demostración** devuelve el pedido de prueba al estado `borrador`.

> La pantalla no implementa permisos, cancelaciones operativas, transmisión a cocina ni sincronización. Es una demostración local aislada de los patrones.

## 4. Archivos modificados o nuevos

- **Modificados:** `src/repositories/PedidoRepository.ts`, `src/viewmodels/usePedidoResumenViewModel.ts`, `src/views/screens/PedidoResumenScreen.tsx` y `package.json` (nuevo comando de pruebas).
- **Nuevos:** `src/repositories/InMemoryPedidoRepository.ts`, `src/observers/PedidoSubject.ts`, `src/services/PedidoRepositorySingleton.ts`, `scripts/test-patrones.cjs` y este documento.
- **Sin cambios:** `src/models/Pedido.ts`, `App.tsx` y configuración de Expo.

## 5. Validación y evidencia solicitada

Desde la raíz del proyecto, después de `npm install`:

```bash
npm run test:patterns
npx tsc --noEmit
npx expo start
```

Pruebas automatizadas incluidas (usando `node:test` y TypeScript, sin nuevas librerías):

1. Repository guarda, consulta y devuelve `null` ante un pedido inexistente.
2. Repository protege sus datos frente a mutaciones de sus consumidores.
3. Observer notifica solo a los suscritos correctos y permite darse de baja.
4. Observer envía copias independientes del pedido a sus observadores.
5. Singleton comparte la misma instancia y el pedido de prueba.

**Prueba manual en Expo Go:** al marcar el pedido como `enviado`, tanto la vista principal como el monitor deben actualizar su estado. Al reiniciar, ambos deben regresar a `borrador`. Guardar capturas o un video de ambas acciones.

Los comandos y las pruebas **deben ejecutarse en el equipo de desarrollo** y registrar su resultado real; no marcar validaciones como aprobadas solo por contar con el código.

## 6. Criterios de aceptación y Definition of Done

- [ ] Contrato e implementación temporal de Repository listos.
- [ ] Observer funcional, con suscripción/desuscripción y propagación de cambios.
- [ ] Singleton devuelve la misma instancia entre varios consumidores.
- [ ] Ejemplo visible en Expo Go usando dos observadores independientes.
- [ ] Pruebas automatizadas ejecutadas; resultado registrado en el PR.
- [ ] TypeScript comprobado con `npx tsc --noEmit`.
- [ ] PR hacia `develop` revisado por el compañero y fusionado.
- [ ] Enlace del PR actualizado en `docs/trazabilidad-kanban.md` y en la tarjeta de Kanban.

## 7. Dependencias y trabajo posterior

La próxima tarea de conexión con el backend aportará una implementación remota de `PedidoRepository`, adaptada al contrato real de la API. La tarea de sincronización diseñará después el almacenamiento offline, colas, resolución de conflictos y reconciliación. **No confundir este repositorio en memoria con una implementación offline-first.**

## 8. Propuesta para el Pull Request

**Título:** `feat: aplicar Repository Observer y Singleton (KAN-02)`  
**Base:** `develop`  
**Compare:** `feature/patrones-diseno`

**Resumen sugerido:**

> Se agrega un repositorio de pedidos en memoria tras un contrato de acceso a datos, un publicador Observer que notifica cambios del pedido y un Singleton que comparte la instancia de demostración. La pantalla muestra dos observadores actualizados sin recargar. No incluye backend, persistencia, POS ni cocina. Referencia Kanban: KAN-02; agregar enlace de la tarjeta.

Adjuntar los resultados reales de `npm run test:patterns`, `npx tsc --noEmit` y la validación manual en Expo Go.
