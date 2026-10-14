# Estado operativo del proyecto

Verificado el 2026-10-14 con el perfil AWS Administrador, cuenta 295894327291, us-east-1.

- Web: https://main.d2caobufsyec5z.amplifyapp.com — Amplify, rama main; job 22 SUCCEED, login verificado y usuario confirmó TOTP.
- API: https://x4konjc6z6.execute-api.us-east-1.amazonaws.com — HTTP API payload v2, Lambda jhoselyn_web_api con secure_handler.lambda_handler.
- Cognito: us-east-1_WIEGYaEgn; cliente 7bnjmrjftms9vgrjksg2shc48b. Autoregistro deshabilitado, grupo Admins, access token/JWT y scope. MFA OPTIONAL por decisión explícita del usuario; cuenta actual con TOTP e ingreso confirmado. No cambiar a ON sin nueva autorización.
- Datos: Appointments, AvailabilityBlocks, BlogPosts, ChatLeads, ChatSessions, ProBonoRequests, OperationControl y BookingSlots; on-demand, PITR y protección contra borrado. Tres reservas activas migradas sin conflictos; agenda habilitada.
- Chat: inferencia desactivada; tarifas y presupuestos cero. No se invocaron modelos durante el despliegue.
- Operación: logs 30 días, alarma Lambda, SNS sin suscripción confirmada. Seis backups disponibles; cuatro citas restauradas idénticas y tabla de restore eliminada. Staging separado pasó 20 checks de integración y 11 de contratos, más recuperación TOTP con pool ON.
- Terraform: bucket privado jhoselyn-tfstate-295894327291-us-east-1, claves production/terraform.tfstate y bootstrap/terraform.tfstate, cifrado/versiones/lockfile. Configuración de producción en infrastructure/production.auto.tfvars.json.

## Rutas y acceso

Públicas: GET /api/availability, /api/schedule, /api/blog, /api/blog/{slug}; POST /api/appointments, /api/probono y /api/chat. Privadas: /api/admin/* y aliases anteriores, con JWT y verificación Admins en servidor. Comprobación real: lectura pública 200 y endpoints privados sin token 401.

## Desarrollo y verificación

Desde raíz en Windows: activar .venv\Scripts\activate, ejecutar uv run pytest -q. Desde frontend/: npm ci, npm run build y npm run lint. Scripts live separados en scripts/experiments/. Nunca ejecutar estos como tests offline.

El push a main publica frontend con amplify.yml y npm ci; backend requiere plan/apply revisados. Para Terraform usar la copia AMD64 verificada .tools/terraform/terraform.exe y perfil Administrador. No migrar nuevamente un state local antiguo sobre S3.

## Evidencia y pendientes

[Progreso E0](operations/e0-progress.md), [despliegue y reversión](operations/deploy-rollback.md), [baseline anterior](operations/baseline.md), [roadmap](global_tasks.md) y [checklist única](specs/despacho-digital-coste-minimo/tasks.md). La descripción técnica anterior se conserva como [histórico](archive/current-state-before-e0.md).

E0 sigue abierto: confirmación de alertas/presupuesto, aprobación de contenido y CI remoto, que no inició por bloqueo de facturación GitHub. IA apagada hasta cuota/tarifas y pruebas autorizadas. No comenzar la carga de expedientes hasta cerrar la puerta E0.
