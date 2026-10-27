# Automatización de pruebas móviles — tarea 22

El workflow «Pruebas móviles» ejecuta las comprobaciones existentes con cada push y con los pull requests dirigidos a develop o main. También permite ejecución manual cuando el workflow esté disponible en la rama predeterminada. Usa Ubuntu, la versión de Node indicada en .nvmrc y npm ci para respetar package-lock.json. Las acciones están fijadas a revisiones concretas; el token solo tiene permiso de lectura.

## Comprobaciones

1. TypeScript sin generar archivos.
2. Jest: pantallas, ViewModels, autenticación, catálogo y repositorios; genera JSON y cobertura.
3. Patrones Repository, Observer y Singleton.
4. Cliente API con respuestas controladas.
5. Persistencia SQLite, funcionamiento offline, reintentos y prevención de duplicados.
6. Cliente de envío POS contra receptor HTTP aislado.
7. Cocina contra receptor HTTP aislado y cambios independientes por estación.

No requiere Supabase, un teléfono, credenciales ni el servidor POS real. Los receptores locales se cierran al terminar. Un fallo en cualquier paso deja la ejecución en rojo; los pasos posteriores se omiten para corregir primero el fallo. La cobertura y el resultado Jest se conservan como artefacto durante 14 días incluso si falla un paso posterior. Los resultados de las demás suites aparecen en los registros de sus pasos. La cobertura se publica como diagnóstico, sin declarar un porcentaje mínimo de aceptación.

## Uso local

Instalar la versión de Node indicada en .nvmrc, ejecutar npm ci y después npm run test:ci. Este comando ejecuta las mismas suites y se detiene ante el primer error. Para obtener también el informe local de cobertura: npm run test:unit -- --ci --coverage --json --outputFile=test-results/jest.json.

## Revisión e integración

Abrir el PR de feature/ci-cd hacia develop y comprobar la ejecución verde en la pestaña Checks. Revisar el artefacto resultados-pruebas-moviles en Actions como evidencia de la tarea 22. El workflow se incorpora a develop al integrar ese PR; incorporar después develop a main conforme al proceso de liberación.

Para impedir que se integre un PR con pruebas fallidas, un administrador debe configurar la protección de develop y main y exigir el check «TypeScript y pruebas móviles». El workflow informa del resultado, pero no cambia por sí mismo las reglas del repositorio.

## Pendientes fuera de esta automatización

La tarea 24 de seguridad (Semgrep/MobSF) necesita su integración y validación propias. Este workflow no genera un APK/AAB, no publica en Play Store y no sustituye las pruebas de aceptación en dispositivos ni la verificación con el POS real.
