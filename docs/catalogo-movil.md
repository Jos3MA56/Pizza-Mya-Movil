# KAN-05 — Catálogo móvil

## Integración

Contrato leído del ZIP Pizza_Mya-Back proporcionado por el usuario:
- GET /api/categories: `{ ok: true, data: [{ id, nombre, descripcion, orden }] }`.
- GET /api/products: `{ ok: true, data: [...] }`. Cada producto tiene `categoria_id`,
  `nombre`, `descripcion`, `disponible`, `activo` y `tamanios`.
- Cada presentación contiene `id` (producto_tamanio_id), `tamanio_id`, `tamanio`,
  `precio_base` y `activo`. No confundir los tres identificadores.
- Estas rutas son públicas; no usan el token LAN. El prefijo por defecto del backend es /api.
- No consultar /admin/tamanios: requiere permisos de administración. Los tamaños
  vendibles ya vienen en los productos y contienen el precio correspondiente.

El esquema adjunto es una referencia, no una migración: no se ejecutó SQL.
No contiene registros ni precios; todos los datos visibles se consultan a la API.
El backend y la base de datos no se modificaron.

## Configurar y ver

En el .env del móvil, establecer la URL del backend web alcanzable desde el teléfono:

```dotenv
EXPO_PUBLIC_API_URL=http://IP_DE_TU_PC:3000
EXPO_PUBLIC_API_PREFIX=/api
```

Reemplazar la IP y el puerto por los reales. No usar aquí la URL del POS de puerto 3101.
La URL base no debe terminar en /api; el prefijo se configura por separado.
Reiniciar Expo: `npx expo start --clear`.

1. Iniciar sesión como mesero → Menú. Consultar categorías y buscar por nombre o descripción.
2. Elegir producto → tamaño/presentación. Los importes vienen del backend.
3. Para agregar, abrir Nuevo pedido → mesa → Agregar productos.
4. Seleccionar presentación, cantidad 1–99 y Agregar a comanda.
5. Comprobar presentación, cantidad y total en resumen y edición. Agregar otra
   presentación y confirmar que se conservan ambas y los productos anteriores.
6. Volver a Inicio: el listado de comandas se refresca al recuperar el foco.
7. Apagar el backend: se debe mostrar error y permitir Reintentar. Probar también
   búsqueda sin coincidencias y un producto sin presentaciones activas.

## Alcance de almacenamiento y sincronización

El flujo existente de resumen/edición usa InMemoryPedidoRepository: los productos
se guardan en la comanda de esta sesión, no sobreviven a reiniciar la app.
Se conservan el ID de producto, producto_tamanio_id, tamaño, categoría y precio
como snapshot. Esta acción no encola ni envía operaciones al POS.
No se alteran SecureStore, SQLite ni el interruptor de sincronización automática.
Los UUID del backend web no se convierten en los SKU del POS simplificado.

## Validación

```bash
npx tsc --noEmit
npm run test:unit -- --watch=false
npm run test:patterns
npm run test:api
git diff --check
```

Pruebas automatizadas con respuestas simuladas según los contratos del ZIP.
Comprobación real de solo lectura contra el backend configurado en el móvil
(https://pizza-mya-back.vercel.app), realizada el 15 de octubre de 2026:
4 categorías, 52 productos disponibles y 56 presentaciones válidas mediante
HttpCatalogoRepository. Ningún producto disponible carecía de presentaciones.
La validación visual en Expo Go sigue pendiente. No se realizaron escrituras en la API.

Resultado automatizado: TypeScript sin errores; Jest 55/55 (8 suites), patrones 5/5
y cliente API 7/7. La primera ejecución de Jest tuvo un timeout de 5 segundos en
la prueba preexistente de estado inicial de AuthContext; la repetición completa pasó.

## Ajustes de comanda y especialidades

- La comanda abre el catálogo integrado y ofrece la pestaña Mi pedido con el resumen
  y su total actualizado. Se pueden agregar varios productos sin abandonar la comanda.
- Se separaron los botones Agregar productos y Editar comanda: antes compartían la
  misma acción y ambos enviaban a edición.
- Para Pizzas, los registros legados con sufijo de tamaño (por ejemplo Hawaiana
  (Mediana 16")) se muestran como una especialidad con sus presentaciones. Solo se
  retira un sufijo que corresponda a un tamaño existente; no se agrupan otras categorías.
- Cada presentación conserva su productoId original además del ID de variante, tamaño
  y precio. La tarjeta agrupada no sustituye el productoId de la presentación elegida.
- Se renderiza la imagen del producto o de la presentación seleccionada; si la URL
  no existe o falla la carga, se muestra Imagen no disponible.

Validación del 15 de octubre de 2026: TypeScript y Jest 61/61 (11 suites).
Contra la API real: 52 registros se muestran como 28 tarjetas, incluidas 12
especialidades de pizza; se conservan las 56 presentaciones. Los 29 enlaces únicos
de imágenes respondieron HTTP 200 con tipo image/* (verificación HEAD, sin descarga).
La revisión visual en el teléfono continúa siendo necesaria.
