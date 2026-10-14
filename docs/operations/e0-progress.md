# E0 — Estado de implementación y rollout

Fecha: 2026-10-14, America/La_Paz. Checklist única: [tasks.md](../specs/despacho-digital-coste-minimo/tasks.md). Backend/frontend desplegados; alertas recibidas y aviso mensual USD 20 configurado. GitHub Actions sustituido por comprobaciones locales. E1 puede avanzar en desarrollo aislado; retención/revisión jurídica de expedientes siguen pendientes antes del piloto.

| Tarea | Evidencia observada | Remanente |
|---|---|---|
| T01 | Inventario real, perfil Administrador y gasto de cuenta | Gasto específico sin atribución completa: desconocido |
| T02 | Seis backups AVAILABLE, dos states S3/versiones/lock, staging aislado; cuatro citas restauradas idénticas | Cerrada: plan final sin cambios y 32 recursos temporales retirados |
| T03 | JWT/scope/firma/grupo e IAM reales en staging; privados 401 en producción | Cerrada según tasks |
| T04 | Usuario confirmó login TOTP; recuperación con MFA ON en staging; autoregistro cerrado; mensaje mejorado publicado | Cerrada con pool OPTIONAL por decisión explícita del usuario |
| T05 | Errores 400/413/422/404/409, decimal, versión y cursor contra Lambda/DynamoDB aislados | Cerrada según tasks |
| T06 | Tres locks migrados sin conflictos; concurrencia, replay, reschedule/cancelación reales | Cerrada según tasks |
| T07 | Draft oculto por lista/slug, publicación y slug único; paginación completa sin duplicación | Cerrada según tasks |
| T08 | Contenido existente aprobado operativamente por el usuario; aviso factual `/privacidad` y enlaces implementados; solicitudes pendientes de aprobación descritas correctamente | Publicar/verificar aviso; revisión jurídica y retención de expedientes antes del piloto |
| T09 | IA desactivada en AWS; controles y fallos probados offline; fallback real staging | Cuota/tarifas y pruebas de inferencia antes de activar; ningún modelo invocado |
| T10 | Ocho PITR/protecciones, logs 30 días, restore idéntico; USD 20 por Project, avisos 16/20 y pronóstico20, SNS confirmado y prueba recibida por usuario | Cerrada para configuración E0; cobertura fiscal/servicios no atribuibles y objetivos del piloto no se presumen |
| T11 | `check_local.py`: documentos, 14 tests, lint y build pasan; workflow Actions eliminado por decisión del usuario | Gate final de publicación/aviso; facturación GitHub deja de ser requisito. Remanentes IA apagada/revisión jurídica explícitos |

## Despliegue y evidencias

Bootstrap: 5 altas; E0: 13 altas y 14 cambios; agenda: 1 cambio. Sin destrucciones en producción. Estados en bucket privado jhoselyn-tfstate-295894327291-us-east-1, claves production/terraform.tfstate y bootstrap/terraform.tfstate, con cifrado/versiones/lockfile. ZIP/configuración Lambda anteriores respaldados en .local-backups/pre-e0-release/. Configuración vigente: infrastructure/production.auto.tfvars.json.

Amplify main job 22 SUCCEED, commit dbda76bc8becdb4f968407561cc92a3e167353d4 (job 21 publicó la primera revisión E0). Login verificado en navegador y usuario confirmó ingreso con autenticador. Mejora del mensaje TOTP publicada; no modifica factores del usuario.

- [Producción](deployment-verification.json): públicos 200, privados 401, agenda true, IA false, ocho tablas ACTIVE/PITR/protegidas.
- [20 comprobaciones de integración](staging-verification.json): JWT real, scope/firma/grupo, TOTP, IAM ConditionCheckItem, concurrencia, reintentos, cancelación y blog.
- [11 comprobaciones de contratos](contracts-verification.json): IAM Lambda invoke con contexto equivalente al Gateway; firma JWT se acredita en la suite anterior. Errores, decimal exacto y paginación contra DynamoDB real.
- [Recuperación TOTP](mfa-recovery-verification.json): retirar factor del usuario temporal, MFA_SETUP, asociar otro y reingresar, con pool ON. Ningún factor de producción eliminado.
- [Restore](restore-verification.json): cuatro citas, esquema/contenido idénticos al origen actual. Tiempo observado ~322 s incluye intervalos entre consultas, no es SLA/RTO garantizado ni mide RPO futuro. Tabla temporal eliminada y ausencia confirmada.
- [CI](ci-status.json): no iniciado por facturación; no equivale a tests fallidos. Suite/build/lint locales sí se ejecutaron.
- [Controles locales](local-checks.json): sustituyen Actions, sin runners ni pagos GitHub; [procedimiento](checks-and-alerts.md). El bloqueo CI anterior se conserva como histórico, no condición actual de release.
- [Alertas y presupuesto](alerts-budget-verification.json): destinatario confirmado, prueba recibida por usuario, Project Active y USD 20 mensuales. Avisos 80%/100% reales y 100% pronóstico; no es cap. Correos privados fuera de Git, lista ampliable.
- [Limpieza staging](staging-cleanup.json): 32 recursos retirados, state vacío, tablas/pool ausentes. [Plan final de producción](terraform-stability.json): sin cambios, MFA OPTIONAL, agenda habilitada e IA apagada. Ningún recurso productivo destruido.

Terraform AMD64 1.15.4 con SHA256 oficial; AWS 5.100.0/archive 2.8.0 fijados. Datos sintéticos sólo en staging/offline, nunca producción ni interfaces. No hubo inferencia ni avisos externos en las pruebas.

## Decisiones y tareas humanas

MFA OPTIONAL se conserva por decisión explícita del usuario. La revisión automática rechazó cambiar a ON sin autorización específica; el usuario eligió mantenerlo opcional y ON no se aplicó. Cuenta actual con TOTP e ingreso confirmado. OPTIONAL permite cuentas sin factor y no garantiza MFA global (LC-11/R02.3).

Usuario confirmó un destinatario y presupuesto mensual de aviso USD 20; confirmó suscripción y recepción de prueba. Actions eliminado: no contratar ni desbloquear CI para continuar. IA sigue apagada sin cuota específica. Aprobación del contenido es operativa; aviso de datos basado en sistema real, sin certificación jurídica ni plazo inventado de conservación. Si la contraseña anteriormente fija sigue en uso, el titular debe rotarla: retirar el literal de create_admin.py no cambia AWS ni elimina su historial. No compartir credenciales/TOTP por el chat.

Recuperación administrativa sólo tras verificar identidad/autorización: revocar sesiones, AdminDeleteSoftwareToken de la cuenta concreta y nuevo MFA_SETUP, sin bajar política global; reingresar con código nuevo. [Runbook](deploy-rollback.md). Nunca resetear cuentas reales como prueba.
