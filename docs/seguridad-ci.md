# Seguridad automatizada — tarea 24

## Alcance implementado

El workflow Seguridad móvil ejecuta dos comprobaciones independientes en pushes y PR hacia develop/main. Semgrep 1.182.1 valida las reglas propias con ejemplos positivos/negativos, revisa src/ y conserva informes JSON. El check falla ante cualquier hallazgo propio y ante hallazgos ERROR de p/security-audit. Un fallo del analizador o de descarga de reglas también falla; no se ocultan errores del escáner. La regla de registros sensibles procede de la rama feature/analisis-seguridad-sast-dast (6396400) y se conserva su propósito; se añade una regla contra ejecución de cadenas con eval/new Function en la app. Los scripts de prueba, que transpilan TypeScript controlado, quedan fuera del alcance src/.

El segundo check ejecuta npm audit sobre el lockfile completo, conserva el informe original y un resumen. Bloquea advisories nuevos altos, todos los críticos y errores del servicio. No necesita instalar la app ni recibir secretos.

## Dependencias

Se ejecutó npm audit fix --package-lock-only --ignore-scripts sin --force. Mantiene las versiones declaradas del SDK, React y React Native. Actualiza dependencias transitivas dentro de lo permitido por las dependencias declaradas; requiere validar instalación limpia, TypeScript, pruebas y configuración Expo. No equivale a aceptación física del APK.

El informe inicial tenía 7 paquetes afectados (4 altos y 3 moderados). Tras la actualización compatible quedan 3 paquetes altos por un único advisory de zod transitivo de Expo CLI: GHSA-mrhx-c7xc-m3w5. npm propone degradar Expo 57 a 54 mediante --force para eliminarlo; no se aplica esa migración en este cambio. La excepción exacta está registrada en .security/audit-exceptions.json, con revisión antes del 27 de noviembre de 2026. No oculta otros advisories ni permite riesgos críticos. Un check verde con esta excepción no significa ausencia de vulnerabilidades. Verificar siempre el informe adjunto.

## MobSF: preparado para el APK real

El workflow manual MobSF APK recibe el ID de una ejecución de este mismo repositorio y el nombre de un artefacto con exactamente un APK. Descarga ese artefacto, inicia MobSF v4.5.3 en el ejecutor temporal con puerto local y clave efímera, sube el APK por API, solicita el análisis estático y conserva el JSON. El contenedor se detiene al finalizar. No envía la aplicación a un servicio externo. Para ejecutarlo desde Actions, integrar primero el workflow hasta la rama predeterminada y disponer del artefacto APK.

No existe todavía un APK del proyecto en el repositorio. El cliente API de MobSF se verifica con respuestas simuladas; el análisis sobre el APK real sigue pendiente. El informe debe revisarse manualmente, incluidos hallazgos de permisos, firma y configuración de red. Que el cliente recupere un informe no certifica que el APK esté libre de riesgos.

MobSF estático no acredita DAST. La tarea 24 permanece en desarrollo hasta generar el APK, verificar el análisis real y realizar análisis dinámico con un dispositivo/emulador compatible. No se modifica la configuración de red LAN ni se cambia el funcionamiento móvil/POS para forzar un análisis verde.

## Verificación y evidencia

- npm ci, npm run test:ci y npx expo config --type public comprueban la instalación y la aplicación existente.
- npm run test:security-tools verifica excepciones, caducidad, bloqueos críticos y el protocolo de MobSF con respuestas controladas.
- npm run security:audit genera el informe local en security-results/.
- En GitHub Actions se conservan seguridad-semgrep y seguridad-dependencias durante 14 días.
- Exigir los checks Semgrep SAST y Auditoría de dependencias en la protección de ramas requiere configurar las reglas del repositorio; estos workflows no cambian esa política.

Fuentes: [Semgrep en CI](https://semgrep.dev/docs/semgrep-ci/sample-ci-configs), [API oficial MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF/blob/master/mobsf/MobSF/views/api/api_static_analysis.py), [análisis estático y dinámico MobSF](https://github.com/MobSF/docs/blob/master/running_mobsf_docker.md).
