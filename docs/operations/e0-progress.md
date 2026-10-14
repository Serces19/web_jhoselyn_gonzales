# E0 — Estado de implementación y rollout

Fecha: 2026-10-14, America/La_Paz. Checklist única: [tasks.md](../specs/despacho-digital-coste-minimo/tasks.md). Backend y frontend desplegados. La puerta E0 sigue abierta por contenido aprobado, alertas/presupuesto y CI remoto.

| Tarea | Evidencia observada | Remanente |
|---|---|---|
| T01 | Inventario real, perfil Administrador y gasto de cuenta | Gasto específico sin atribución completa: desconocido |
| T02 | Seis backups AVAILABLE, dos states S3/versiones/lock, staging aislado; cuatro citas restauradas idénticas | Plan final sin drift y teardown staging en curso |
| T03 | JWT/scope/firma/grupo e IAM reales en staging; privados 401 en producción | Cerrada según tasks |
| T04 | Usuario confirmó login TOTP; recuperación con MFA ON en staging; autoregistro cerrado | Publicar mejora del mensaje TOTP; pool OPTIONAL por decisión explícita del usuario |
| T05 | Errores 400/413/422/404/409, decimal, versión y cursor contra Lambda/DynamoDB aislados | Cerrada según tasks |
| T06 | Tres locks migrados sin conflictos; concurrencia, replay, reschedule/cancelación reales | Cerrada según tasks |
| T07 | Draft oculto por lista/slug, publicación y slug único; paginación completa sin duplicación | Cerrada según tasks |
| T08 | QR decorativo y falsos acuses retirados del frontend publicado | Contenido/textos/fotos y política de datos aprobados |
| T09 | IA desactivada en AWS; controles y fallos probados offline; fallback real staging | Cuota/tarifas y pruebas de inferencia antes de activar; ningún modelo invocado |
| T10 | Ocho PITR/protecciones, logs 30 días, alarma Lambda; restore idéntico | Destinatario/recepción de avisos, presupuesto AWS y objetivos aprobados |
| T11 | 14 tests offline; build/lint pasan; Amplify BUILD/DEPLOY/VERIFY exitosos | GitHub Actions no ejecutó steps por bloqueo de facturación; puerta E0 pendiente |

## Despliegue y evidencias

Bootstrap: 5 altas; E0: 13 altas y 14 cambios; agenda: 1 cambio. Sin destrucciones en producción. Estados en bucket privado jhoselyn-tfstate-295894327291-us-east-1, claves production/terraform.tfstate y bootstrap/terraform.tfstate, con cifrado/versiones/lockfile. ZIP/configuración Lambda anteriores respaldados en .local-backups/pre-e0-release/. Configuración vigente: infrastructure/production.auto.tfvars.json.

Amplify main job 21 SUCCEED, commit 92f177ad759c51fddaa9441e912b3c0001e46fd5. Login verificado en navegador y usuario confirmó ingreso con autenticador. Mejora posterior del mensaje TOTP en publicación; no modifica factores del usuario.

- [Producción](deployment-verification.json): públicos 200, privados 401, agenda true, IA false, ocho tablas ACTIVE/PITR/protegidas.
- [20 comprobaciones de integración](staging-verification.json): JWT real, scope/firma/grupo, TOTP, IAM ConditionCheckItem, concurrencia, reintentos, cancelación y blog.
- [11 comprobaciones de contratos](contracts-verification.json): IAM Lambda invoke con contexto equivalente al Gateway; firma JWT se acredita en la suite anterior. Errores, decimal exacto y paginación contra DynamoDB real.
- [Recuperación TOTP](mfa-recovery-verification.json): retirar factor del usuario temporal, MFA_SETUP, asociar otro y reingresar, con pool ON. Ningún factor de producción eliminado.
- [Restore](restore-verification.json): cuatro citas, esquema/contenido idénticos al origen actual. Tiempo observado ~322 s incluye intervalos entre consultas, no es SLA/RTO garantizado ni mide RPO futuro. Tabla temporal eliminada y ausencia confirmada.
- [CI](ci-status.json): no iniciado por facturación; no equivale a tests fallidos. Suite/build/lint locales sí se ejecutaron.

Terraform AMD64 1.15.4 con SHA256 oficial; AWS 5.100.0/archive 2.8.0 fijados. Datos sintéticos sólo en staging/offline, nunca producción ni interfaces. No hubo inferencia ni avisos externos en las pruebas.

## Decisiones y tareas humanas

MFA OPTIONAL se conserva por decisión explícita del usuario. La revisión automática rechazó cambiar a ON sin autorización específica; el usuario eligió mantenerlo opcional y ON no se aplicó. Cuenta actual con TOTP e ingreso confirmado. OPTIONAL permite cuentas sin factor y no garantiza MFA global (LC-11/R02.3).

Correo de alertas y cuota/presupuesto siguen sin respuesta; conservar SNS sin destinatario e IA apagada. Facturación GitHub requiere intervención del propietario. Contenido/política jurídica requieren aprobación. Si la contraseña anteriormente fija sigue en uso, el titular debe rotarla: retirar el literal de create_admin.py no cambia AWS ni elimina su historial. No compartir credenciales/TOTP por el chat.

Recuperación administrativa sólo tras verificar identidad/autorización: revocar sesiones, AdminDeleteSoftwareToken de la cuenta concreta y nuevo MFA_SETUP, sin bajar política global; reingresar con código nuevo. [Runbook](deploy-rollback.md). Nunca resetear cuentas reales como prueba.
