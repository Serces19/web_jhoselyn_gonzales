# Estado operativo del proyecto

Verificado el 2026-10-14 con el perfil AWS Administrador, cuenta 295894327291, us-east-1.

- Web: https://main.d2caobufsyec5z.amplifyapp.com — Amplify, rama main; job 25 SUCCEED (b39165b), CRM E1 `/admin/despacho/` publicado en sólo lectura y comprobado con sesión existente. Aviso `/privacidad` publicado; login TOTP confirmado. Controles locales, sin GitHub Actions.
- API: https://x4konjc6z6.execute-api.us-east-1.amazonaws.com — HTTP API payload v2, Lambda jhoselyn_web_api con secure_handler.lambda_handler.
- Cognito: us-east-1_WIEGYaEgn; cliente 7bnjmrjftms9vgrjksg2shc48b. Autoregistro deshabilitado, grupo Admins, access token/JWT y scope. MFA OPTIONAL por decisión explícita del usuario; cuenta actual con TOTP e ingreso confirmado. No cambiar a ON sin nueva autorización.
- Datos: Appointments, AvailabilityBlocks, BlogPosts, ChatLeads, ChatSessions, ProBonoRequests, OperationControl y BookingSlots; on-demand, PITR y protección contra borrado. Tres reservas activas migradas sin conflictos; agenda habilitada.
- Chat: inferencia desactivada; tarifas y presupuestos cero. No se invocaron modelos durante el despliegue.
- Operación: logs 30 días, alarma Lambda, SNS con suscripción confirmada y prueba recibida por el usuario. Seis backups disponibles; cuatro citas restauradas idénticas y tabla de restore eliminada. Staging separado pasó 20 checks de integración y 11 de contratos, más recuperación TOTP con pool ON.
- Terraform: bucket privado jhoselyn-tfstate-295894327291-us-east-1, claves production/terraform.tfstate y bootstrap/terraform.tfstate, cifrado/versiones/lockfile. Configuración de producción en infrastructure/production.auto.tfvars.json.

## Rutas y acceso

Públicas: GET /api/availability, /api/schedule, /api/blog, /api/blog/{slug}; POST /api/appointments, /api/probono y /api/chat. Privadas: /api/admin/* y aliases anteriores, con JWT y verificación Admins en servidor. Comprobación real: lectura pública 200 y endpoints privados sin token 401.

## Desarrollo y verificación

Desde raíz en Windows: activar .venv\Scripts\activate, ejecutar uv run pytest -q. Desde frontend/: npm ci, npm run build y npm run lint. Scripts live separados en scripts/experiments/. Nunca ejecutar estos como tests offline.

El push a main publica frontend con amplify.yml y npm ci; backend requiere plan/apply revisados. Para Terraform usar la copia AMD64 verificada .tools/terraform/terraform.exe y perfil Administrador. No migrar nuevamente un state local antiguo sobre S3.

## Evidencia y pendientes

[Progreso E0](operations/e0-progress.md), [despliegue y reversión](operations/deploy-rollback.md), [baseline anterior](operations/baseline.md), [roadmap](global_tasks.md) y [checklist única](specs/despacho-digital-coste-minimo/tasks.md). La descripción técnica anterior se conserva como [histórico](archive/current-state-before-e0.md).

Controles de release locales en scripts/ops/check_local.py; GitHub Actions retirado por decisión del usuario, sin contratar CI. Presupuesto de aviso aprobado USD 20/mes por Project, lista de destinatarios privada y ampliable; verificar recepción humana en [checks-and-alerts](operations/checks-and-alerts.md). Contenido existente aprobado operativamente; aviso factual de datos implementado y revisión jurídica/retención pendiente antes del piloto. IA apagada hasta cuota/tarifas y pruebas autorizadas. E1 puede avanzar en desarrollo aislado.

## Publicación E1 autorizada

El usuario autorizó explícitamente publicar los 26 recursos E1 y el CRM en sólo lectura. Despliegue completado; se agregó una ruta OPTIONS de preflight necesaria, sin abrir lecturas. [Evidencia](operations/e1-progress.md). API `/api/admin/despacho/*`, DespachoCore y roles/workers propios; Lambda pública sin Core. `PILOT_ENABLED=false` bloquea altas/cambios/jobs y la UI los deshabilita. No se migró ChatLeads ni se crearon usuarios/expedientes de prueba productivos. Staging pasó 40 controles y fue retirado; 34 tests offline y 26 controles productivos pasan. Navegación E1 autenticada verificada en navegador, Terraform No changes. Piloto humano/conservación siguen pendientes.
