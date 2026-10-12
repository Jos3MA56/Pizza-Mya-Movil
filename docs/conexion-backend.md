# KAN-03 — Preparar conexión con backend y servicios de prueba

**Proyecto:** Pizza Mya Móvil  
**Responsable:** Pablo Ruiz Santos  
**Rama propuesta:** `feature/conexion-backend`  
**PR objetivo:** `develop`  
**Estado:** cliente HTTP y diagnóstico preparados; integración real pendiente de validar contra backend encendido.

## 1. Alcance

Esta actividad prepara la comunicación móvil → backend Node/Express compartido con Pizza Mya Web. No se crea un backend nuevo y **no se conecta el móvil directamente con el POS**. La integración operativa con pedidos/cocina, la autenticación y la sincronización offline se abordarán en actividades posteriores.

## 2. Contratos reales conocidos y límites

- API de Pizza Mya Web: backend Node/Express existente. En pruebas anteriores se utilizó `http://localhost:3000` desde la computadora.
- La ruta `/api/health` se había citado en pruebas previas del backend web, pero **no fue posible comprobar su disponibilidad actual**. Por eso es configurable con `EXPO_PUBLIC_API_HEALTH_PATH`.
- No se han verificado todavía los contratos actuales de categorías, productos, tamaños, autenticación ni pedidos. **No se deben inventar ni implementar hasta revisar el backend vigente**.
- El repositorio `PabloRuiz-20230031/Backend_PizzaMya` aparece vacío en GitHub; se requiere el código del backend web real o una URL de API vigente para integrar más endpoints.

## 3. Archivos entregados

| Archivo | Responsabilidad |
| --- | --- |
| `src/services/api/ApiClient.ts` | Peticiones HTTP GET/POST, JSON/texto, HTTP 2xx, errores 4xx/5xx, red y timeout con AbortController. |
| `src/services/api/apiConfig.ts` | URL base y ruta del endpoint de diagnóstico leídas de variables Expo públicas. |
| `src/viewmodels/useConexionBackendViewModel.ts` | Estado de la prueba (`sin-probar`, `probando`, `conectado`, `error`) y respuesta de la API. |
| `src/views/screens/ConexionBackendScreen.tsx` | Pantalla para realizar una consulta GET manual y mostrar el resultado. |
| `App.tsx` | Botón temporal para alternar las demostraciones de KAN-02 y KAN-03. |
| `scripts/test-api.cjs` | Pruebas locales de cliente HTTP con respuestas simuladas y sin acceso a Internet. |
| `.env.example` | Plantilla de configuración; **NO** colocar tokens o contraseñas aquí. |

## 4. Configurar la URL

1. En el directorio raíz del proyecto, copiar `.env.example` como `.env`.
2. Cambiar `EXPO_PUBLIC_API_URL` por una URL **alcanzable desde donde corre Expo Go**.
3. Verificar o sustituir la ruta configurada en `EXPO_PUBLIC_API_HEALTH_PATH` por un endpoint GET del backend real.
4. Reiniciar `npx expo start --clear` tras cambiar el archivo `.env`.

Ejemplos de URL en desarrollo:

- Teléfono Android físico y computadora en la misma red: `http://192.168.X.Y:3000` (IP de la computadora, usar `ipconfig` en Windows).
- Emulador Android: `http://10.0.2.2:3000` (con backend escuchando en el equipo anfitrión).
- Android por USB con `adb reverse tcp:3000 tcp:3000`: `http://localhost:3000` en el dispositivo, si el reenvío funciona.
- Servidor publicado: `https://TU_DOMINIO_REAL` (URL efectivamente desplegada, no un ejemplo copiado).

**Importante:** `localhost` en el teléfono apunta al propio teléfono y no a la computadora, salvo túneles o reenvío configurados. En red local, el firewall de Windows, el puerto abierto y la interfaz donde escucha Express pueden impedir la conexión. Preferir HTTPS para entornos publicados. La URL `EXPO_PUBLIC_*` no es privada: nunca colocar secretos allí.

## 5. Pruebas

```bash
npm run test:api
npm run test:patterns
npx tsc --noEmit
npx expo start --clear
```

`npm run test:api` hace **7 pruebas automáticas sin backend**: GET JSON, respuestas de texto/204, POST JSON, errores HTTP y red, timeout, configuración/rutas y JSON inválido. Estas pruebas comprueban el cliente pero **no confirman conexión con Pizza Mya Web**.

**Prueba manual en Expo Go:** pulsar «Probar conexión con API» → «Probar conexión». Registrar la URL (sin tokens), ruta, hora, estado HTTP y respuesta. Repetir con backend apagado para comprobar error de red. Si aparece HTTP 404, validar la ruta; si aparece HTTP 401, se requiere revisar autenticación de ese endpoint, no omitirla.

## 6. Criterios de aceptación (DoD)

- [ ] Cliente HTTP centralizado sin rutas de negocio inventadas.
- [ ] Configuración de URL base por entorno sin secretos en Git.
- [ ] Manejo de errores de configuración, HTTP, red y timeout.
- [ ] Pruebas de cliente HTTP ejecutadas y registradas en el PR.
- [ ] Comprobación `npx tsc --noEmit` registrada.
- [ ] Petición real GET contra un endpoint existente del backend y resultado documentado.
- [ ] Prueba de fallo de conexión registrada.
- [ ] PR revisado hacia `develop` y enlazado en la tarjeta KAN-03.

## 7. Texto sugerido para el PR

**Título:** `feat: preparar cliente HTTP y diagnóstico de backend (KAN-03)`

> Se incorpora un ApiClient reutilizable con configuración de URL por entorno, timeout y gestión de errores; se añade pantalla temporal de diagnóstico con ViewModel y pruebas automatizadas sin red. No se añaden endpoints operativos no verificados ni conexión directa con POS. Verificación real pendiente/documentada en los resultados del PR. Referencia Kanban: KAN-03 (agregar URL de tarjeta).
