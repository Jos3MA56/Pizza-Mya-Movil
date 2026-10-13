# Procedimiento de Git y GitHub vinculado a XP + Kanban

**Proyecto:** Pizza Mya Móvil  
**Equipo:** Pablo Ruiz Santos y José Antonio Martínez Alvarado  
**Repositorio:** https://github.com/Jos3MA56/Pizza-Mya-Movil  
**Metodología:** Extreme Programming (XP) como enfoque de desarrollo y Kanban como gestión visual del trabajo  
**Fecha de elaboración:** 12 de octubre de 2026  
**Estado del documento:** propuesta operativa para revisión e integración en `develop`

## 1. Objetivo y alcance

Establecer un proceso repetible para planificar, implementar, revisar y entregar cambios de Pizza Mya Móvil, manteniendo trazabilidad entre cada actividad de Kanban, su rama de Git, los commits, el Pull Request (PR) y la evidencia de validación. Aplica al desarrollo con React Native, Expo, TypeScript y arquitectura MVVM, incluida la futura conexión con el backend y el POS.

**Regla general:** una actividad concreta del tablero debe contar con una rama de trabajo y al menos un PR de integración cuando implique cambios al repositorio. Las actividades amplias pueden desglosarse en tarjetas pequeñas y varios PR; todos deben conservar una referencia a la actividad principal.

## 2. Estructura y función de las ramas

| Rama o prefijo | Uso | Origen | Destino de PR |
| --- | --- | --- | --- |
| `main` | Versión estable o entregable validado | Integración aprobada desde `develop` | Solo liberaciones aprobadas |
| `develop` | Integración cotidiana de cambios revisados | Base de trabajo compartida | `main` al liberar |
| `feature/<descripcion>` | Funcionalidad nueva, por ejemplo catálogo o conexión a API | `develop` | `develop` |
| `fix/<descripcion>` | Correcciones de errores | `develop` (o rama de liberación cuando corresponda) | `develop` |
| `docs/<descripcion>` | Documentación y decisiones técnicas | `develop` | `develop` |
| `test/<descripcion>` | Pruebas y configuraciones de automatización | `develop` | `develop` |

Usar nombres en minúsculas, sin espacios ni acentos, separados con guiones. Evitar trabajar directamente sobre `main` o `develop`; **no hacer `push --force`** a esas ramas. El repositorio puede no tener aún reglas de protección automatizadas: por ahora estas pautas son acuerdos del equipo, no controles que GitHub ya esté aplicando.

## 3. Flujo de trabajo de una tarjeta Kanban

1. **Seleccionar y delimitar.** Elegir una actividad prioritaria, definir alcance, responsable, criterios de aceptación y dependencias. Si es muy grande, dividirla.
2. **Mover a En progreso.** Registrar la tarjeta en la columna equivalente del tablero y agregar el nombre de la rama prevista.
3. **Crear una rama desde `develop` actualizado.** Una rama por tarea pequeña y un nombre coherente con su tarjeta.
4. **Desarrollar en incrementos.** Mantener separación MVVM; agregar pruebas cuando sea viable; ejecutar comprobaciones locales antes de subir cambios.
5. **Crear commits descriptivos.** Preferir prefijos `feat:`, `fix:`, `docs:`, `test:`, `refactor:` o `chore:`. No incluir claves, tokens ni archivos `.env`.
6. **Subir la rama y abrir PR hacia `develop`.** Incluir en el PR el título exacto de la tarjeta, su enlace de Kanban, cambios, criterios de aceptación y evidencia de validación.
7. **Mover a En revisión.** Pedir revisión al otro integrante; resolver comentarios y confirmar que no hay conflictos. Quien desarrolla no debe considerar su tarea terminada solo por haber abierto el PR.
8. **Fusionar una vez aprobada.** Integrar a `develop`, comprobar el resultado y, entonces, mover la tarjeta a Hecho, guardando el enlace definitivo al PR.
9. **Liberación estable.** Tras integrar y validar un conjunto coherente de funciones, abrir un PR separado desde `develop` hacia `main` (con título de liberación). No usar `main` para recibir funcionalidades directamente.

### Ejemplo de comandos para una actividad

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feature/conexion-backend

# Desarrollar y validar cambios.
git status
git add .
git commit -m "feat: preparar cliente HTTP y conexion de prueba"
git push -u origin feature/conexion-backend
```

Después, abrir un PR con **base `develop`** y **compare `feature/conexion-backend`**. Antes de usar `git add .`, revisar `git status` y confirmar que no se incluyen archivos sensibles o cambios ajenos a la actividad.

## 4. Aplicación realista de XP

- **Trabajo incremental:** cada PR debe cubrir una parte comprobable del problema, no mezclar funcionalidades independientes.
- **Revisión entre compañeros / programación en pareja cuando convenga:** Pablo y José contrastan cambios y decisiones; si no programaron juntos, al menos documentan la revisión.
- **Pruebas frecuentes:** ejecutar `npx tsc --noEmit` si el proyecto lo permite y realizar la prueba de la función en Expo Go. Añadir pruebas automatizadas conforme se prepare la infraestructura; **no declarar pruebas como aprobadas si no se ejecutaron**.
- **Integración continua como práctica:** incorporar frecuentemente a `develop`; se recomienda configurar posteriormente GitHub Actions para comprobaciones automáticas. Hoy no debe asumirse que existe CI funcional.
- **Diseño simple y refactorización:** respetar MVVM, aplicar Repository, Observer o Singleton únicamente cuando resuelvan necesidades concretas y registrar decisiones relevantes.
- **Retroalimentación del entorno real:** usar los flujos de meseros, cajero y cocina para validar historias de usuario y criterios de aceptación antes de ampliar funcionalidades.

## 5. Campos recomendados por actividad en Kanban

No es obligatorio crear nuevas propiedades en el tablero: estos datos pueden ir en la descripción de cada tarjeta.

| Campo | Contenido |
| --- | --- |
| Identificador local | `KAN-01`, `KAN-02`, etc. (identificadores propuestos en la documentación; **no** son IDs de Notion) |
| Actividad | Título exacto de la tarjeta |
| Responsable | Integrante a cargo |
| Criterios de aceptación | Condiciones verificables para considerar la actividad completa |
| Rama Git | Nombre de la rama real o `Por crear` |
| PR | URL real del PR o `Pendiente` |
| Evidencia | Capturas, pruebas, documentación y/o enlace al cambio |
| Estado | Columna actual del tablero |

Estados sugeridos, adaptables a las columnas reales: **Pendiente → En progreso → En revisión → Hecho**. Utilizar **Bloqueado** si existen dependencias externas. Solo mover a **Hecho** cuando los criterios de aceptación estén cumplidos y el PR requerido esté integrado.

Para tener vínculos **en ambos sentidos**:

- En la tarjeta Kanban, pegar la URL de la rama y del PR, más una breve descripción de la evidencia.
- En la descripción del PR, pegar la URL de la tarjeta Kanban y su identificador local (`KAN-0X`).
- Si todavía no se dispone de la URL de la tarjeta, dejarlo indicado y completarlo al abrir el PR; no inventar enlaces.
- Consultar [`docs/trazabilidad-kanban.md`](./trazabilidad-kanban.md) como índice de actividades, ramas y PR.

## 6. Condiciones mínimas de revisión (Definition of Done)

Marcar una actividad terminada solamente si se cumple lo que aplica:

- [ ] Alcance y criterios de aceptación definidos.
- [ ] Cambios en una rama derivada de `develop`, sin secretos ni archivos generados innecesarios.
- [ ] El proyecto compila o se justifica la limitación; evidencia de prueba manual o automatizada indicada con precisión.
- [ ] La solución mantiene la separación de responsabilidades de MVVM.
- [ ] PR hacia `develop` enlazado con la actividad de Kanban.
- [ ] Revisión por el otro integrante y observaciones atendidas.
- [ ] PR integrado a `develop` y tarjeta actualizada a Hecho.
- [ ] README o documentación técnica actualizados si cambia el modo de ejecutar o usar una función.

En tareas puramente documentales, la revisión de contenido y enlaces sustituye a las pruebas funcionales que no apliquen.

## 7. Evidencia real disponible e incidencia detectada

**Revisión del repositorio del 12 de octubre de 2026:**

- [PR #1 — Configurar Expo y arquitectura base MVVM](https://github.com/Jos3MA56/Pizza-Mya-Movil/pull/1): integrado a `develop`; demuestra uso de rama de funcionalidad y revisión mediante PR.
- [PR #2 — Documentación de arquitectura MVVM](https://github.com/Jos3MA56/Pizza-Mya-Movil/pull/2): creado por Pablo e integrado a `develop`; demuestra uso de una rama `docs/`.
- [PR #3 — «Flujo git xp kanban»](https://github.com/Jos3MA56/Pizza-Mya-Movil/pull/3): integrado a `main`, no a `develop`. Según los archivos de ese PR, integró la base existente de Expo/MVVM, **pero no añadió este procedimiento formal**. No debe considerarse evidencia de que esta documentación ya estuviera terminada.

**Medida preventiva:** revisar siempre la rama **base** al crear un PR. No reescribir la historia del PR #3; documentar la incidencia y continuar integrando futuros cambios ordinarios a `develop`. La integración final a `main` requiere validación de versión estable.

## 8. Mantenimiento del procedimiento

Pablo puede mantener las referencias entre el tablero y los PR; ambos integrantes deben actualizar las tarjetas que tengan asignadas. Revisar la trazabilidad al cerrar cada PR y revisar el procedimiento cuando cambie la estrategia de ramas o se configure CI.

**Referencias de trabajo:**
- [Repositorio](https://github.com/Jos3MA56/Pizza-Mya-Movil)
- [Pull Requests](https://github.com/Jos3MA56/Pizza-Mya-Movil/pulls)
- [Rama `develop`](https://github.com/Jos3MA56/Pizza-Mya-Movil/tree/develop)
