
# Pruebas unitarias de autenticación y catálogo

## Información general

- Proyecto: Pizza Mya Móvil
- Actividad: 23
- Responsable de implementación: José Antonio Martínez Alvarado
- Metodología: XP + Kanban
- Herramienta: Jest con jest-expo

## 1. Pruebas de autenticación

Se implementaron pruebas automatizadas para:

- ApiClient: 6 casos.
- AuthRepository: 4 casos.
- validarLogin: 7 casos.
- normalizarRol: 10 casos.
- AuthContext: 3 casos.

**Total: 30 pruebas unitarias.**

Las pruebas utilizan respuestas simuladas y no
realizan solicitudes al backend de producción.

## 2. Pruebas pendientes del catálogo

El módulo de catálogo se encuentra actualmente
en desarrollo por otro integrante.

Por esta razón, los siguientes casos son
propuestas de prueba y todavía no están implementados.

| ID | Caso de prueba | Resultado esperado |
|---|---|---|
| CAT-01 | Consultar productos | Obtener los productos disponibles |
| CAT-02 | Catálogo vacío | Manejar correctamente una lista vacía |
| CAT-03 | Error de consulta | Informar o propagar el error correctamente |
| CAT-04 | Variantes de producto | Conservar tamaños y precios |
| CAT-05 | Producto inactivo | Aplicar las reglas de disponibilidad |
| CAT-06 | Datos incompletos | Manejar respuestas inválidas según el contrato |

## 3. Dependencias

Para implementar las pruebas del catálogo se requiere:

1. Disponibilidad del módulo de catálogo en develop.
2. Definición de modelos y repositorios correspondientes.
3. Contratos de respuesta establecidos.
4. Identificación de las funciones que deben probarse.

## 4. Estado de la actividad

- Pruebas de autenticación: implementadas.
- Pruebas de catálogo: pendientes de implementación.
- Actividad general: en progreso.

No se considera completada la actividad hasta
implementar y ejecutar las pruebas del catálogo.
