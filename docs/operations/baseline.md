# E0 — Baseline e inventario

**Registro histórico previo al rollout del 2026-10-14.** La configuración vigente y su verificación están en [current-state](../current-state.md) y [deployment-verification.json](deployment-verification.json). Conservar este archivo como evidencia del antes.

Perfil comprobado: **Administrador** (mayúscula), región us-east-1, misma cuenta del state local. Inventario en [aws-inventory.json](aws-inventory.json). Se consultaron configuración y metadatos; no se imprimieron registros de clientes ni secretos.

## Configuración desplegada comprobada

- API `x4konjc6z6`: `ANY /api/{proxy+}`, AuthorizationType NONE, 0 authorizers; CORS wildcard.
- Lambda Python 3.11, 30 s, 128 MiB, fuera de VPC; actualización registrada 2026-08-27.
- Cognito tier ESSENTIALS, MFA OFF, auto-registro habilitado; 1 usuario habilitado en Admins.
- Seis tablas on-demand: PITR DISABLED en todas. Conteos aproximados: Appointments 4, AvailabilityBlocks 1, BlogPosts 0, ChatLeads 3, ChatSessions 10, ProBonoRequests 0. No se consideran conteos transaccionales exactos.
- SNS lead_alerts sin suscriptores.
- Amplify del proyecto: main, autobuild activo, `main.d2caobufsyec5z.amplifyapp.com`; sin dominio personalizado asociado.
- Perfil Bedrock Haiku 4.5 distribuye a us-east-1, us-east-2 y us-west-2; no se ejecutó inferencia.

## Costos y límites de atribución

Cost Explorer devolvió **gasto estimado de la cuenta completa** para 2026-10-01 a 2026-10-14 exclusivo. Incluye Amazon Registrar USD 16 y importes pequeños/cargos compensados de varios proyectos; no atribuirlo al despacho ni concluir que el proyecto cuesta exactamente cero. Falta atribución por tags/resource y comparación de períodos completos. No se activaron recursos de capacidad fija ni se invocaron modelos durante el inventario.

## Trabajo local frente a producción

Este inventario describe la configuración anterior al rollout. Backend y frontend E0 ya se publicaron; evidencia en [e0-progress](e0-progress.md). MFA quedó OPTIONAL para enrollment; ON y recuperación requieren prueba de la administradora antes del cierre de T04. IA permanece desactivada hasta cuota/tarifa confirmada.
