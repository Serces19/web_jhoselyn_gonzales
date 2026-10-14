# Estado operativo del proyecto

Verificado el 2026-10-14 con el perfil AWS Administrador, cuenta 295894327291, us-east-1.

- Web: https://main.d2caobufsyec5z.amplifyapp.com — Amplify, rama main; publicación coordinada en curso.
- API: https://x4konjc6z6.execute-api.us-east-1.amazonaws.com — HTTP API payload v2, Lambda jhoselyn_web_api con secure_handler.lambda_handler.
- Cognito: us-east-1_WIEGYaEgn; cliente 7bnjmrjftms9vgrjksg2shc48b. Autoregistro deshabilitado, grupo Admins, access token/JWT y scope. MFA OPTIONAL hasta inscripción y prueba humana; luego ON.
- Datos: Appointments, AvailabilityBlocks, BlogPosts, ChatLeads, ChatSessions, ProBonoRequests, OperationControl y BookingSlots; on-demand, PITR y protección contra borrado. Tres reservas activas migradas sin conflictos; agenda habilitada.
- Chat: inferencia desactivada; tarifas y presupuestos cero. No se invocaron modelos durante el despliegue.
- Operación: logs retenidos 30 días, alarma Lambda, SNS sin suscripción confirmada. Seis backups disponibles; prueba restore aislada en curso.
- Terraform: bucket privado jhoselyn-tfstate-295894327291-us-east-1, claves production/terraform.tfstate y bootstrap/terraform.tfstate, cifrado/versiones/lockfile. Configuración de producción en infrastructure/production.auto.tfvars.json.

## Rutas y acceso

Públicas: GET /api/availability, /api/schedule, /api/blog, /api/blog/{slug}; POST /api/appointments, /api/probono y /api/chat. Privadas: /api/admin/* y aliases anteriores, con JWT y verificación Admins en servidor. Comprobación real: lectura pública 200 y endpoints privados sin token 401.

## Desarrollo y verificación

Desde raíz en Windows: activar .venv\Scripts\activate, ejecutar uv run pytest -q. Desde frontend/: npm ci, npm run build y npm run lint. Scripts live separados en scripts/experiments/. Nunca ejecutar estos como tests offline.

El push a main publica frontend con amplify.yml y npm ci; backend requiere plan/apply revisados. Para Terraform usar la copia AMD64 verificada .tools/terraform/terraform.exe y perfil Administrador. No migrar nuevamente un state local antiguo sobre S3.

## Evidencia y pendientes

[Progreso E0](operations/e0-progress.md), [despliegue y reversión](operations/deploy-rollback.md), [baseline anterior](operations/baseline.md), [roadmap](global_tasks.md) y [checklist única](specs/despacho-digital-coste-minimo/tasks.md). La descripción técnica anterior se conserva como [histórico](archive/current-state-before-e0.md).

E0 sigue abierto: prueba humana TOTP/recuperación y MFA ON, staging integral y concurrencia real, confirmación de alertas/costos, aprobación de contenido y cierre de CI. No comenzar la carga de expedientes hasta cerrar la puerta E0.
