# E0 — Despliegue y reversión coordinados

Estado: backend E0 aplicado el 2026-10-14; frontend en publicación coordinada. Perfil `Administrador`, us-east-1. [baseline](baseline.md) conserva producción anterior; [e0-progress](e0-progress.md) registra el rollout y los pendientes.

## Preparación y requisitos

En este Windows usar `.tools/terraform/terraform.exe` o `uv run python scripts/ops/terraform_check.py --profile Administrador`; la copia oficial AMD64 1.15.4 resuelve los timeouts observados con el binario global 386. El instalador verifica SHA256 desde HashiCorp. No cambiar versiones AWS/archive durante el rollout.

1. Respaldo local de state en `.local-backups/` (ignorado); seis backups DynamoDB creados por `scripts/ops/backup_aws.py --profile Administrador --apply` y confirmados AVAILABLE en [release-prerequisites.json](release-prerequisites.json). El rol existente sólo se usa por la Lambda de este proyecto en us-east-1.
2. Grupo CloudWatch existente importado al state local para gestionar retención; import no alteró logs AWS.
3. Plan `infrastructure/e0.tfplan` local/ignorado, sin recreación de tablas ni Cognito; resumir acciones y rechazar destroy/replacement. Regenerar si cambia código o configuración después de crearlo.
4. UI preparada para access token, grupo Admins y TOTP. Amplify main auto-build está activo: no hacer push sin coordinar frontend/backend y conocer el commit a desplegar.
5. Email y cuota de IA pendientes del usuario. Por defecto `chat_ai_enabled=false`, cuotas/tarifas cero; no confirmar una opción preseleccionada como si hubiera sido enviada.
6. create_admin.py solicita contraseña por getpass; ejecutar con perfil explícito y revisar usuario/pool antes de usarlo. Si se sigue usando la contraseña anteriormente fija en ese script, cambiarla y revocar sesiones antes del cierre. No copiar contraseñas al chat, docs, shell arguments o logs.

## Orden de rollout

- Aplicar primero bootstrap del bucket de state tras revisar su plan. Copiar `backend.tf.example` como `backend.tf`, ejecutar init con bucket real y key del entorno, region us-east-1, `use_lockfile=true`, cifrado y perfil. Usar `-migrate-state`; no `-force-copy` sin revisar origen/destino. Los planes deben regenerarse después de migrar state.
- Staging: state/directorio independiente y `resource_prefix=staging-e0-`; jamás seleccionar prefix sobre el state de producción. Excluir `production.auto.tfvars.json` del directorio staging. Usar origen local conocido mientras se prueba; no inventar dominio staging. Crear admin mediante procedimiento Cognito autorizado, sin password versionado. El staging integral sigue pendiente: las pruebas offline y las comprobaciones de producción no lo sustituyen.
- Validar API v2/JWT/scope, usuario no admin 403, expiración, TOTP/enrollment y recuperación, IAM ConditionCheckItem, transacciones reales y cambios de citas. Fixtures sólo en staging/offline, claramente identificadas; producción no recibe datos de prueba.
- Preparar frontend y publicar versión coordinada con backend. El API antiguo protegido no seguirá dando datos privados a UI vieja. Una ventana breve de mantenimiento explícita es preferible a dejar el API privado abierto.
- Primera aplicación de backend deja `booking_ready=false`; ejecutar migración de slots/slugs con dry-run y después `--apply` sólo si no hay duplicados. Citas existentes nunca se borran para solucionar conflictos. Habilitar `booking_ready=true` y regenerar/aplicar plan; verificar agenda pública.
- Configuración de producción persistida en `infrastructure/production.auto.tfvars.json`: agenda habilitada sólo tras migración, IA desactivada y MFA OPTIONAL pendiente de prueba humana. `backend.tf` de ambos módulos ya está activo; para equipos nuevos usar `terraform init` con bucket/key/perfil indicados. Estados remotos separados: `production/terraform.tfstate` y `bootstrap/terraform.tfstate`; no volver a migrar estados locales antiguos.
- Amplify usa el repositorio Git conectado y `amplify.yml` con `npm ci`; publicar mediante commit/push de la versión revisada a main. Las operaciones manuales CreateDeployment/StartDeployment están documentadas por AWS para apps sin repositorio y no se usan en este proyecto.
- MFA inicia OPTIONAL para enrollment. La administradora configura autenticador desde login y vuelve a ingresar con TOTP; probar recuperación. Sólo entonces cambiar `admin_mfa_mode=ON`, regenerar/aplicar plan y probar otra vez. No cerrar T04 mientras siga OPTIONAL.
- SNS/email: introducir destinatario confirmado, recibir confirmación de suscripción y efectuar prueba sin relatos/PII. Topic creado o Publish aceptado no confirma recepción humana.
- IA: activar sólo después de cuota numérica, tarifas de modelo/región y validación de conversación; sin cuota, atención manual permanece disponible. Presupuestos no son hard cap de cuenta.

## Reversión segura

Guardar commit/artefacto y configuración anterior antes de rollout. Un rollback de UI no reabre JWT ni devuelve CORS wildcard. Si falla login, mantener API privada cerrada y publicar pantalla de mantenimiento/contacto mientras se corrige auth. Si falla agenda, `booking_ready=false` y coordinación por WhatsApp, conservando citas/locks.

Revertir código Lambda mediante artefacto revisado compatible con la protección actual, no mediante handler antiguo sin permisos. No bajar MFA ON ni permitir auto-registro para resolver errores sin revisar identidad/recuperación. No desactivar PITR ni borrar tablas para volver a una versión de software.

## Restauración (prueba pendiente)

Restaurar backup a tabla nueva aislada, comprobar conteos/keys/relaciones sin mostrar datos; apuntar entorno de prueba a ella, verificar lectura y reconstitución de slots. Medir RPO/RTO, conservar evidencia y limpiar únicamente recursos temporales identificados cuando esté autorizado. No sobrescribir producción como prueba. La creación de backups no acredita restore probado.
