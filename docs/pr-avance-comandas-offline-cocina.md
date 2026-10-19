## Problema resuelto
Las comandas visibles se perdían al cerrar la app aunque ya existía infraestructura SQLite y LAN. El catálogo requería red y cocina era una pantalla inicial.

## Funcionalidad
- Repositorio SQLite de producción, migración incremental v2 que conserva la cola anterior, importes enteros en centavos, presentaciones e historial completos, restricción de mesa abierta, revisión optimista y eventos tras commit.
- Caché del último catálogo validado, fecha, búsqueda/filtros offline y reintento. Restauración de sesión previamente autenticada en SecureStore por 24 horas.
- Preparación idempotente de instantánea y operación en una transacción, edición congelada y seguimiento autorizado por mesero. Bloqueo visible sin consumir intentos cuando falta correspondencia con POS.
- Reintento/conciliación reutilizan SyncService y configuración LAN existentes; conserva requestId, ID remoto, folio y total confirmado. Errores ambiguos requieren conciliación; 404 no habilita reenvío.
- Tablero de cocina **Demostración local**, datos aislados y persistidos, transporte/reloj inyectables, fallo y confirmación perdida simulados, transiciones validadas pendiente → en_preparacion → listo. No comunica dispositivos ni confirma al POS.

## Validación
Base sin fallos: TypeScript, 61 unitarias, patrones 5 y API 7.

Resultado final: TypeScript correcto; 65 unitarias en 12 suites; patrones 5/5; API 7/7; SQLite real 11 casos integrados (Node reporta 12 tests), migración/persistencia/reapertura/rollback y sincronización con transporte inyectado; git diff --check correcto; exportación Android Expo correcta (982 módulos).

No se ejecutó Expo Go ni validación física. La exportación no es APK. No se enviaron pedidos a producción.

## Límites del contrato y dependencias
El cliente POS actual solo admite productoId/cantidad. No hay correspondencia verificada con UUID/presentaciones del catálogo ni endpoints de cocina comprobados en servidor. **Las nuevas preparaciones de catálogo quedan BLOQUEADAS** sin descartar datos. Falta contrato POS para variantes/notas y endpoints de cocina autorizados. Preparaciones congeladas no se desbloquean en esta iteración; cada demostración es una copia por comanda. Primer login/cambio de cuenta requieren red y cuentas autorizadas.

PR #14 revisado, abierto y con conflictos; no se fusionó ni reescribió. No se incorporaron precios demostrativos al catálogo operativo. No se tocó main/develop.

Guion reproducible de 7 minutos, arquitectura, migración, comandos y pendientes físicos: `docs/avance-comandas-offline-cocina.md`.

Base: 0453a4818627ebfe355634ca6c8e8e83a2b6789f. Rama nueva: feature/avance-comandas-offline-cocina.
