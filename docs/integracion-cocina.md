# Integración móvil de cocina — tarea 40

Responsable: José Antonio Martínez Alvarado. Integración realizada el 27 de octubre de 2026 a partir del trabajo desarrollado en mobile-integration. Depende del envío LAN v2 de la tarea 39 (commit 75a491d).

La pantalla de cocina consulta el receptor POS cada tres segundos. Presenta hojas independientes de pizzas y complementos, conserva cantidades, tamaños, mesa, folio y observaciones, y permite pasar cada estación de pendiente a preparación y listo. Los cambios incluyen la versión recibida para que el receptor detecte conflictos. Al perder conexión conserva la última consulta y bloquea cambios de estado hasta reconectar. La conexión LAN se configura desde la misma pantalla; se exige una sesión de cocina.

El receptor externo debe ofrecer /api/local/cocina, /api/local/catalogo/v2 y PATCH /api/local/cocina/:id, con autenticación Bearer, estacionesIndependientes y versiones por estación. Este commit contiene únicamente la aplicación móvil; el receptor POS se mantiene en su propio proyecto.

Validación automatizada: npm run test:unit, npm run test:cocina-pos, npm run test:pos-client, npm run test:offline y npx tsc --noEmit. Las pruebas HTTP levantan un receptor aislado y lo cierran al terminar; no usan datos ni credenciales reales.

Aceptación pendiente en dispositivos: configurar una sesión de cocina contra el POS compatible, enviar una comanda mixta desde mesero, confirmar cantidades y notas en ambas hojas, avanzar una estación sin alterar la otra, desconectar y reconectar Wi-Fi, y verificar el estado desde el POS. Mantener la tarea en revisión hasta completar esta comprobación.
