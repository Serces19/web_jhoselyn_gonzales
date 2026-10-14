# 08 — Seguridad, secreto profesional y cumplimiento

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> El sistema almacenará información de familias, menores, violencia y patrimonio. La seguridad es requisito de entrada (Fase 0), no un extra.
> Revisión 2026-10-13: ver [segunda auditoría](../audits/11_segunda_auditoria_2026-10-13.md). Retención y normas requieren validación jurídica. JWT requiere permiso Admins, cierre de aliases y actualización frontend; auditoría, ACL y restauración se implementan desde la primera entrega con datos sensibles.

---

## 1. Marco normativo a considerar (a validar por la abogada)

| Norma / principio | Implicación técnica |
|---|---|
| CPE arts. 21 (privacidad, intimidad) y 130 (Acción de Protección de Privacidad) | Derecho del titular a conocer, rectificar y eliminar sus datos → funciones de exportar/rectificar |
| Ley 387 del Ejercicio de la Abogacía — **secreto profesional** | Expedientes cifrados, acceso mínimo, sin datos de casos en la IA pública |
| Ley 548 (Niñez y Adolescencia) — reserva de identidad de menores | No exponer nombres de menores en WhatsApp, logs, conocimiento anonimizado |
| Ley 348 (violencia contra la mujer) | Protocolo de urgencia en el bot; reserva |
| Ley 164 (TIC) y normativa de documentos/firma digital (ADSIB) | Validez de documentos y firmas electrónicas |
| Ley general de protección de datos personales | **Verificar estado legislativo vigente en 2026**; diseñar como si aplicaran estándares tipo GDPR (consentimiento, finalidad, minimización, retención) |
| Clientes en EEUU | Inventariar destinatarios, región, inference profiles, Meta y proveedores de pago; documentar flujo real |

## 2. Controles técnicos

### Fase 0 (bloqueantes, antes de cualquier módulo nuevo)
- [ ] **JWT Authorizer de Cognito** en API Gateway para todas las rutas `/api/admin/*`; mover endpoints admin actuales (`GET /api/appointments`, `/api/crm/leads`, `/api/probono` GET, blog write, schedule PUT) bajo `/api/admin/`.
- [ ] **MFA obligatoria** (TOTP) en el User Pool; política de contraseña fuerte; sin auto-registro.
- [ ] CORS restringido al dominio de producción.
- [ ] Terraform state remoto en S3 cifrado con locking.
- [ ] Rate limiting en API Gateway (throttling) para `/api/chat` y rutas públicas.
- [ ] Secretos en SSM Parameter Store / Secrets Manager (nunca en código o `.env` versionado).

### Datos
- Aurora: cifrado KMS, backups automáticos 14 días + snapshot mensual retenido 1 año, deletion protection.
- S3: SSE-KMS, versioning, Block Public Access, URLs prefirmadas de 15 min, Object Lock (modo governance) opcional para expedientes cerrados.
- DynamoDB: PITR activado en todas las tablas.
- Logs: CloudWatch con redacción de PII (teléfonos, CI, nombres) vía Powertools; retención 90 días.
- `auditoria` registra lectura de expedientes y descargas, no sólo escrituras.

### IA
- Bedrock: los datos no se usan para entrenar modelos; región `us-east-1` con inference profiles (documentar flujo transfronterizo en el aviso de privacidad).
- Prompts del chat público aislados de C1 (casos) y C3 (conocimiento): sólo `normativa` y `bufete_knowledge`.
- Guardrails de Bedrock: bloqueo de PII en salidas del chat público, temas denegados (promesas de resultado, asesoría concluyente).
- Toda salida de IA en el panel se marca "Sugerencia IA — revisar".

## 3. Consentimiento y avisos

- Web y WhatsApp: aviso de privacidad breve + enlace a política completa (`/privacidad`, nueva página — Capa 1).
- `clientes.consentimiento_datos_en` obligatorio para convertir a cliente.
- Marketing por WhatsApp sólo con opt-in explícito registrado.

## 4. Retención

| Dato | Retención |
|---|---|
| Expediente de caso cerrado | Plazo por expediente y obligación aplicable pendiente de validación; 10 años era una hipótesis, no mínimo verificado |
| Oportunidades perdidas | 2 años, luego anonimizar |
| Conversaciones WhatsApp/chat sin conversión | 1 año |
| Logs técnicos | 90 días |

## 5. Continuidad

- Exportación completa mensual (pg_dump + inventario S3) a un bucket de backup en otra región.
- Runbook de restauración probado una vez por trimestre (`docs/runbooks/restore.md`, a crear en Fase 0).
