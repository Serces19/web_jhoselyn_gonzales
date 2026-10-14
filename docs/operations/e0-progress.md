# E0 — Progreso de implementación

Fecha de implementación: 2026-10-14, America/La_Paz. Fuente de estado: [tasks.md](../specs/despacho-digital-coste-minimo/tasks.md). Este informe registra evidencia local y pendientes; no es una segunda checklist.

| Tarea | Avance real | Pendiente para cierre |
|---|---|---|
| T01 | CLI/perfil resueltos, AWS real contrastado y gasto de cuenta consultado; baseline | Atribución económica específica sin tags disponible todavía; se informa desconocida |
| T02 | State respaldado local, seis backups AVAILABLE, bootstrap/state/staging preparados; logs existentes importados | Aplicar/migrar state, staging y prueba restore |
| T03 | Rutas JWT/scope + permiso Admins en servidor; alias privado protegido; IAM acotado | Rollout y pruebas Gateway/IAM en staging/producción |
| T04 | Access token/refresh/401/403, TOTP/enrollment/nueva contraseña y recuperación documentada | Prueba de administradora y pasar OPTIONAL→ON |
| T05 | JSON/tamaños/validación, Decimal, expected_version, errores sin detalles | Validación de contratos con UI desplegada |
| T06 | Slots/transacciones/idempotencia, cancelación/reprogramación y zona Bolivia | Migración de slots reales y prueba concurrente DynamoDB real |
| T07 | Published por lista/slug, mapa único, cursor backend y consumo público/admin de páginas | Verificación del rollout |
| T08 | QR decorativo retirado, contacto/pagos sin falso acuse, adjunto manual explicado | Contenido y política de privacidad de abogada |
| T09 | Inferencia apagada sin cuota, reservas atómicas microUSD, tools deduplicadas, lock/historial/fallback, replay inicial y límite por origen | Cuota/tarifas y pruebas conversacionales en staging |
| T10 | PITR/retención/TTL/logs/alarma configurados en IaC, avisos minimizados | Aplicación, email/suscripción confirmados, presupuesto AWS y restore |
| T11 | pyproject/uv.lock, suite offline Moto, CI backend/frontend; scripts live separados | CI remoto, staging y evidencia final de puerta E0 |

## Evidencia

Rollout autorizado y aplicado el 2026-10-14: bootstrap **5 altas**, E0 **13 altas y 14 cambios**, sin destrucciones. Estados de producción y bootstrap migrados a S3 privado con versiones/cifrado y lockfile. Artefacto/configuración Lambda anteriores respaldados bajo `.local-backups/pre-e0-release/`. La migración real detectó **3 slots activos y 0 conflictos**, creó sus locks y no modificó las citas. Ocho tablas con PITR/protección, JWT, CORS acotado, retención y alarma ya aplicados. IA desactivada y MFA OPTIONAL hasta prueba humana. Habilitación de agenda y frontend en curso. Restauración aislada iniciada en tabla temporal; resultado pendiente. No hay staging integral validado ni aprobación de contenido jurídico: E0 sigue abierto.

14 pruebas offline pasan: matriz de acceso y aliases, JSON inválido, slots excluyentes y reintentos, cancelación/reprogramación atómicas, campos inválidos, publicación/slug, decimal/versión/cursor, IA apagada, cuota atómica, tool idempotente, replay inicial, bearer de sesión, historial tras fallo y límite por origen. Moto no acredita IAM real ni firma JWT de Gateway; esas pruebas siguen pendientes.

Frontend build pasa; lint termina con advertencias de código legado, sin errores. Plan E0 aplicado: **13 altas, 14 cambios, 0 destrucciones**, resumido en [terraform-plan-summary.json](terraform-plan-summary.json). Bootstrap aplicado: **5 altas, 0 cambios, 0 destrucciones**. Los timeouts del Terraform Windows 386 se resolvieron usando copia local oficial AMD64 1.15.4, con SHA256 verificado y las mismas versiones AWS 5.100.0/archive 2.8.0. Confirmado: rol sólo usado por jhoselyn_web_api y seis backups AVAILABLE en [release-prerequisites.json](release-prerequisites.json). No se invocaron modelos ni se escribieron expedientes nuevos en producción.

State y ZIP generados dejaron de estar en el índice Git, conservando archivos locales y respaldos; lockfiles se versionarán. Se retiró una contraseña literal de create_admin.py y se sustituyó por entrada local oculta con getpass. No se imprimió su valor ni se cambió la contraseña actual en AWS; si la contraseña anterior sigue en uso, la administradora debe rotarla antes de cerrar E0. El historial Git previo sigue existiendo, por lo que quitar el literal no sustituye la rotación.

## Información o tareas del usuario

- Perfil resuelto: `Administrador`. No hacen falta claves por el chat.
- Falta respuesta sobre cuota de IA y correo de alertas; se mantiene configuración apagada/null.
- Al habilitar staging/rollout, la administradora deberá configurar TOTP, probar reingreso y recuperación. Es requisito de salida, no aprobación inferida por tiempo transcurrido.
- Correcciones de contenido/política jurídica requieren material aprobado; no se inventan.
