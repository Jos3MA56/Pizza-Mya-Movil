# Trazabilidad de actividades Kanban → Git/GitHub

**Proyecto:** Pizza Mya Móvil  
**Fecha de verificación:** 12 de octubre de 2026  
**Tablero:** captura de las cinco actividades asignadas a Pablo (las URL individuales de las tarjetas aún no se proporcionaron)  
**Rama de integración:** `develop`

> **Cómo leer esta tabla:** los identificadores `KAN-01` a `KAN-05` son internos y propuestos para esta documentación. Una rama con estado **propuesta** todavía no está creada. Un PR indicado como **pendiente** todavía no existe. Los enlaces de GitHub citados como evidencias históricas no significan que la tarea completa haya sido terminada.

| ID | Actividad del tablero (Pablo) | Rama de trabajo | PR / evidencia existente | Situación verificada y próximo entregable |
| --- | --- | --- | --- | --- |
| KAN-01 | Configurar flujo Git/GitHub vinculado a XP + Kanban | `docs/procedimiento-y-trazabilidad-xp-kanban` (**propuesta, por publicar**) | [PR #1](https://github.com/Jos3MA56/Pizza-Mya-Movil/pull/1) y [PR #2](https://github.com/Jos3MA56/Pizza-Mya-Movil/pull/2): evidencia parcial de ramas y PR. PR para este procedimiento: **pendiente**. | Preparar documentación del flujo, enlazar tarjeta y PR, solicitar revisión e integrar a `develop`. |
| KAN-02 | Aplicar patrones Repository, Observer y Singleton | `feature/patrones-diseno` (**propuesta**) | [PR #1](https://github.com/Jos3MA56/Pizza-Mya-Movil/pull/1) contiene la interfaz `src/repositories/PedidoRepository.ts`; PR funcional: **pendiente**. | Falta implementación concreta de Repository y justificar/implementar Observer y Singleton según casos de uso reales. |
| KAN-03 | Preparar conexión con backend y servicios de prueba | `feature/conexion-backend` (**propuesta**) | `src/services/README.md` indica trabajo futuro; PR: **pendiente**. | Configurar endpoint por entorno, cliente HTTP, manejo de errores y prueba de conectividad sin exponer secretos. |
| KAN-04 | Diseñar mecanismo de sincronización | `docs/diseno-sincronizacion` (**propuesta**); futura implementación en rama separada `feature/sincronizacion-offline` | PR: **pendiente**. | Diseñar almacenamiento local, cola de operaciones, reintentos, conflictos, idempotencia y estados sincronizados antes de implementar. |
| KAN-05 | Iteración 1 – Catálogo, categorías, productos y tamaños | `feature/catalogo-base` (**propuesta**); desglosar si el PR resulta grande | PR: **pendiente**. | Acordar contratos del backend, modelos, consultas, ViewModels, pantallas y pruebas del flujo de catálogo. |

## Relación con el tablero

Para convertir la tabla anterior en enlaces reales entre Notion/Kanban y GitHub, realizar en cada tarjeta:

1. Conservar el título tal cual y colocar su ID local (`KAN-0X`) en la descripción.
2. Pegar la URL de la rama cuando exista: `https://github.com/Jos3MA56/Pizza-Mya-Movil/tree/<rama>`.
3. Pegar la URL del PR cuando se abra; nunca indicar un número de PR inventado.
4. Agregar criterios de aceptación y breve resultado de validación.
5. En el cuerpo del PR, poner el título, ID y enlace de vuelta a la tarjeta Kanban.
6. Mover la tarjeta a **En revisión** cuando el PR esté abierto y a **Hecho** solo tras integración y validación.

**Nota:** las tarjetas aún no se han modificado directamente en el tablero. Para completar el enlace bidireccional se necesitan sus URL individuales o acceso al tablero.

## Criterios de cierre propuestos

### KAN-01 — Flujo Git/GitHub
- Documento de estrategia de ramas y procedimiento XP + Kanban revisado.
- PR de documentación creado con destino `develop`, revisado e integrado.
- Enlace del PR guardado en la tarjeta Kanban y enlace de la tarjeta incluido en el PR.

### KAN-02 — Patrones
- Repository obtiene datos mediante una implementación verificable, con contrato coherente con MVVM.
- Se documenta la razón y el caso de uso de Observer y Singleton; se implementan donde sean necesarios.
- Se incluye una prueba o demostración concreta por patrón y PR revisado.

### KAN-03 — Conexión backend
- URL configurable para red local o ambiente de pruebas; sin credenciales en el repositorio.
- Cliente de solicitudes con manejo de errores y prueba con un endpoint real del backend web.
- Evidencia de respuesta y de manejo de fallo de conexión desde el entorno de la aplicación.

### KAN-04 — Diseño offline / sincronización
- Flujo definido para guardar cambios sin conexión, encolar, reintentar y reconciliar.
- Identificados conflictos, duplicados, cancelaciones y responsables de acciones sensibles.
- Diagrama o especificación revisada antes de construir persistencia real.

### KAN-05 — Catálogo (Iteración 1)
- Datos de categorías, productos y tamaños obtenidos con contratos alineados al backend.
- Pantallas y ViewModels funcionales en Expo Go, con estados de carga, vacío y error.
- Evidencia de prueba y PR revisado, o sub-PR por partes si la actividad se desglosa.

## Registro de vínculos (mantener actualizado)

| ID | Enlace a tarjeta Kanban | PR de la actividad | Estado reportado en el tablero |
| --- | --- | --- | --- |
| KAN-01 | Pendiente de proporcionar | Pendiente de abrir | Por confirmar |
| KAN-02 | Pendiente de proporcionar | Pendiente | Por confirmar |
| KAN-03 | Pendiente de proporcionar | Pendiente | Por confirmar |
| KAN-04 | Pendiente de proporcionar | Pendiente | Por confirmar |
| KAN-05 | Pendiente de proporcionar | Pendiente | Por confirmar |

**Referencia complementaria:** [procedimiento operativo de Git/XP/Kanban](./flujo-git-xp-kanban.md).
