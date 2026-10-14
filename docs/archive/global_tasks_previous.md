# Roadmap anterior — histórico

> No es una lista de tareas vigente. El estado de implementación se mantiene exclusivamente en [tasks.md](../specs/despacho-digital-coste-minimo/tasks.md). Incluye propuestas anteriores descartadas o sustituidas.

# 🗺️ Global Tasks Roadmap — Jhoselyn Gonzales Webpage & AI Assistant

## Plan vigente — specs de costo fijo mínimo (2026-10-13)

- [x] Preparar requisitos EARS, diseño, tareas, modelo económico y trazabilidad en [specs](../README.md).
- [ ] **E0 / T01–T11:** inventario y factura real; respaldo/state; rutas/JWT/roles; MFA/UI; contratos; reservas; blog/cursors; contenido honesto; chat/cuotas; operación/restore; CI y puerta de seguridad.
- [ ] **E1 / T12–T20:** patrones DynamoDB; outbox/idempotencia; personas/conflictos; oportunidades/migración; casos/alta; agenda; dinero exacto; KPIs; piloto.
- [ ] **E2 / T21–T26:** árbol documental; S3/cuarentena; extracción/ACL; retención/exportación; plantillas/workflows; piloto.
- [ ] **E3 / T27–T30:** recordatorios recuperables; reglas jurídicas verificadas; IA/OCR opcionales; métricas por canal.
- [ ] **E4 / T31–T36:** decisión económica WhatsApp; ingreso seguro; handoff; corpus/evaluación; RAG aislado; cierre y revisión del gasto.

Detalle canónico y criterios por tarea: [tasks.md](../specs/despacho-digital-coste-minimo/tasks.md). Cobertura de A2: [traceability.md](../specs/despacho-digital-coste-minimo/traceability.md). El spike Aurora A2-09/F2 se sustituye por validación DynamoDB T12. Las fases históricas de abajo no autorizan aprovisionar Aurora ni servicios de costo mínimo mensual. No hay funciones nuevas implementadas por esta preparación.

## Segunda auditoría — 2026-10-13

Informe rector: [docs/11_segunda_auditoria_2026-10-13.md](../audits/11_segunda_auditoria_2026-10-13.md). Evidencia: [docs/12_evidencia_auditoria_local.md](../audits/12_evidencia_auditoria_local.md). A2 prevalece sobre dependencias incompatibles del plan anterior. Hallazgos confirmados localmente; estado AWS no consultado.

- [x] Revisar conversación, código/IaC y documentos; verificar fuentes primarias accesibles; build/lint y reproducciones locales.
- [x] Documentar riesgos, corregir SQL de diseño, añadir dos rutas de entrega y actualizar índice/research.
- [ ] **A2-01 · P0 · Inventario y recuperación inicial:** contrastar Gateway/Lambda/Cognito con IaC; respaldar datos/state; inventariar aliases y modificaciones manuales; preparar rollback. Salida: matriz de rutas efectiva y respaldo verificable.
- [ ] **A2-02 · P0 · Acceso API:** JWT + autorización Admins en servidor; proteger lecturas/escrituras privadas y ambos aliases CRM; cerrar fallback. Salida: pruebas 401/403/admin y token incorrecto/vencido.
- [ ] **A2-03 · P1 · Autenticación UI:** fetch común Bearer/refresh/401/403; auto-registro cerrado; challenges TOTP/enrollment/recuperación. Salida: abogada usa panel sin bypass y usuario no admin queda rechazado.
- [ ] **A2-04 · P1 · Reservas:** validación, estado público fijo, slot único, transacción y claves idempotentes; cancelación/reprogramación atómicas. Salida: concurrencia devuelve una reserva + 409; reintento conserva ID.
- [ ] **A2-05 · P1 · Persistencia:** blog publicado, paginación/cursors, índices, dinero Decimal, condición de existencia/versiones. Salida: borradores inaccesibles, KPI completo, importe exacto y PATCH inexistente →404.
- [ ] **A2-06 · P1 · Agente:** cuotas/concurrencia, tools validadas/idempotentes, resultados de error, historial completo, TTL y fallback factual. Salida: sin duplicados, pérdida de turnos o confirmaciones falsas.
- [ ] **A2-07 · P1 · Pagos/contenido:** quitar QR decorativo y recepción no acreditada; inventario de datos bancarios reales; upload/acuse sólo si implementado. Salida: cerrar WhatsApp no confirma entrega; captura no confirma cobro.
- [ ] **A2-08 · P1 · Operación:** state remoto con bootstrap/lock, providers fijados, PITR, retención logs/redacción, SNS con destinatario, alarmas/budget, runbook restore. Salida: restauración y alerta extremo a extremo verificadas.
- [ ] **A2-09 · P1 · Arquitectura/SQL:** comparar costos y necesidades, spike Aurora/Data API y timeout tras pausa; migración desde cero/FK/extensiones; preagregar KPI y validar granularidad. Salida: informe medido y migración aprobada; no elegir por afirmación de imposibilidad de DynamoDB.
- [ ] **A2-10 · CRM MVP:** persona/contactos, oportunidad/historial, partes/casos, conflictos, alta transaccional, agenda manual y honorarios/pagos asignados. Salida: caso piloto real, migración dry-run/idempotente y reconciliación.
- [ ] **A2-11 · Biblioteca:** S3 privado/versiones/vínculos, ACL/cuarentena, árbol real, extracción idempotente/búsqueda textual y auditoría de descarga. Salida: permisos pasan antes de incorporar expedientes.
- [ ] **A2-12 · Procedimientos/plazos:** workflows versionados/copia por caso; reglas con fuente/notificación/jurisdicción/corte/feriados y revisión humana. Salida: casos de cómputo validados, alertas y plantillas sin mutar expedientes.
- [ ] **A2-13 · WhatsApp:** evidencia oficial de condiciones/tarifas/coexistence; SNS estándar/colas/adaptador/DLQ; identidad por caso, handoff y control de mensajes en vuelo. Salida: abogada toma control y bot permanece silencioso; reintentos no duplican envío.
- [ ] **A2-14 · RAG:** derechos/corpus autorizado, versiones/vigencia por artículo, aislamiento público/privado antes de recuperación/grafo, benchmark real y pruebas de inyección/fuga. Salida: citas fieles, abstención y revisión jurídica; grafo sólo con mejora medida.
- [ ] **A2-15 · Adopción:** piloto, exportación y manual/runbook; inventario final de gasto y soporte/suplencia. Salida: jornada real y expediente exportado utilizables.

No se implementaron estas remediaciones durante la auditoría. Reestimar esfuerzo/fechas después de A2-09; presupuesto anterior sin validación.

## Estado del Proyecto: Producción v2.1 (Activo)
- **Frontend:** React 19 + Vite (AWS Amplify auto-deploy)
- **Backend API:** AWS API Gateway + Lambda Python 3.11 (`https://x4konjc6z6.execute-api.us-east-1.amazonaws.com`)
- **Motor IA:** Amazon Bedrock — `us.anthropic.claude-haiku-4-5-20251001-v1:0` (Converse API + Tool Calling)
- **Base de Datos:** AWS DynamoDB (Appointments, AvailabilityBlocks, BlogPosts, ProBonoRequests, ChatLeads, ChatSessions)
- **Alertas:** AWS SNS Topic (`jhoselyn_lead_alerts`)

---

## 📋 Tareas Realizadas (Completadas)

- [x] **Diagnóstico arquitectónico integral** de infraestructura, frontend, backend y Bedrock.
- [x] **Instalación de Skills Oficiales de AWS:** `amazon-bedrock` y `agents-get-started`.
- [x] **Actualización de Motor IA:** Migración a Claude Haiku 4.5 en Bedrock con inference profile validado.
- [x] **Método de Escucha y Anclaje Profundo:** Rediseño del System Prompt enfocado en acogida empática y extracción profunda del caso legal.
- [x] **Límite Estricto de 6 Turnos:** Contador `turn_count` por sesión en DynamoDB con mensaje de cierre y CTA a citas / WhatsApp.
- [x] **Base de Conocimiento Jurídico:** Módulo [`bufete_knowledge.py`](../../infrastructure/lambda_api/bufete_knowledge.py) con datos oficiales y áreas de práctica.
- [x] **Infraestructura de Alertas:** Creación de SNS Topic `jhoselyn_lead_alerts` y permisos `sns:Publish` en Lambda.
- [x] **UX del Chat:** Manejo de límite en [`ChatPage.jsx`](../../frontend/src/pages/ChatPage.jsx) con banner de acción rápida y bloqueo amigable de input.
- [x] **Formateo Markdown en Chat:** Integración de `ReactMarkdown` en [`ChatPage.jsx`](../../frontend/src/pages/ChatPage.jsx) y [`ChatWidget.jsx`](../../frontend/src/components/ChatWidget.jsx) para renderizar correctamente `**negrita**`, viñetas, citas y enlaces sin mostrar caracteres sin procesar.
- [x] **CTA Banner en Servicios:** Añadida tarjeta interactiva y estética *"¿No encuentras tu caso específico? Agenda una consulta"* en [`LandingPage.jsx`](../../frontend/src/pages/LandingPage.jsx).
- [x] **Nueva Página "Sobre Mí":** Creada [`AboutPage.jsx`](../../frontend/src/pages/AboutPage.jsx) con biografía, valores, sección de Docencia y testimonios de Google Reviews.
- [x] **Actualización de Tarifas y Métodos de Pago:** 200 Bs (Bolivia) / 20 USD o 20 EUR (Exterior) en [`PagosPage.jsx`](../../frontend/src/pages/PagosPage.jsx), [`BookingApp.jsx`](../../frontend/src/pages/BookingApp.jsx) y [`bufete_knowledge.py`](../../infrastructure/lambda_api/bufete_knowledge.py). Removidas referencias a AirTM y Zelle.
- [x] **Ajuste en FAQ:** Banner actualizado en [`FaqPage.jsx`](../../frontend/src/pages/FaqPage.jsx) aclarando que no incluye redacción de documentos complejos y recomendando consulta personalizada.
- [x] **Integración Google Reviews (100% Real):** Reseñas reales de Brenda A., Keil Lucas y Fernanda Villarroel integradas con distintivo de verificación y enlace oficial en [`LandingPage.jsx`](../../frontend/src/pages/LandingPage.jsx) y [`AboutPage.jsx`](../../frontend/src/pages/AboutPage.jsx).
- [x] **Módulo CRM & Embudo de Ventas Legal:** Diseñado e implementado en [`AdminDashboard.jsx`](../../frontend/src/pages/AdminDashboard.jsx) con tablero Kanban interactivo (6 etapas del embudo: Nuevo Prospecto, Primer Contacto, Asesoría Agendada, Propuesta Enviada, Casos Ganados, No Concretados).
- [x] **Gestión Integral de Prospectos (CRM):** Creación manual de prospectos, edición de honorarios estimados, bitácora histórica de notas de seguimiento, filtrado por canal de marketing/origen/área/urgencia y acciones directas de WhatsApp con plantillas contextuales.
- [x] **Endpoints Backend CRM:** Implementados `GET`, `POST`, `PATCH`, `DELETE` en `/api/crm/leads` con normalización automática de datos legacy en DynamoDB y despliegue exitoso en AWS Lambda via Terraform.
- [x] **Despliegue Terraform:** `terraform apply` ejecutado exitosamente en AWS us-east-1 actualizando la base de conocimiento y endpoints CRM de la Lambda.

---

## 🚀 Plan v3 "Despacho Digital" (detalle completo en [docs/09_plan_implementacion.md](09_plan_implementacion.md))

### Preguntas abiertas
- [ ] Q1 Aprobar Aurora PostgreSQL Serverless v2 (ADR-01)
- [ ] Q2 WhatsApp: número actual con coexistence vs. número nuevo para el bot
- [ ] Q3 Lote de correcciones de contenido web (abogada)
- [ ] Q4 Lista de normas núcleo y libros propios
- [ ] Q5 Pasos/plazos de los 10 workflows semilla (abogada)
- [ ] Q6 Modalidad SIAT y NIT
- [ ] Q7 Validar árbol de taxonomía con la abogada

### F0 — Seguridad y fundaciones (sem 1–2)
- [ ] F0.1 Terraform remote state S3 + lockfile
- [ ] F0.2 Terraform en módulos (`moved {}` sin recreaciones)
- [ ] F0.3 JWT Authorizer Cognito en `/api/admin/*`
- [ ] F0.4 Mover endpoints admin bajo `/api/admin/`
- [ ] F0.5 MFA TOTP Cognito
- [ ] F0.6 CORS restringido + throttling
- [ ] F0.7 PITR DynamoDB + retención de logs
- [ ] F0.8 Refactor Lambda con Powertools
- [ ] F0.9 Limpieza de repo (tests a `scripts/experiments/`, borrar `ChatWidget.jsx`)
- [ ] F0.10 Runbook de restauración

### F1 — Contenido web (continuo)
- [ ] F1.1 `frontend/src/content/despacho.js` fuente única
- [ ] F1.2 Aplicar lotes de correcciones
- [ ] F1.3 Página `/privacidad`
- [ ] F1.4 UTM/canal en formularios, chat y booking
- [ ] F1.5 SEO local (schema.org LegalService, sitemap)

### F2 — CRM legal (sem 2–7)
- [ ] F2.1 Aurora Serverless v2 (auto-pause, Data API) en Terraform
- [ ] F2.2 Migraciones SQL (extensiones ltree, vector, pg_trgm, unaccent)
- [ ] F2.3 Seeds (canales, taxonomía, configuración)
- [ ] F2.4 `db.py` Data API con retry de reanudación
- [ ] F2.5 Lambda `crm_api`
- [ ] F2.6 Migración `ChatLeads` → Aurora
- [ ] F2.7 `agent_core.py` escribe persona + oportunidad
- [ ] F2.8 Booking vinculado a oportunidad
- [ ] F2.9 Dividir `AdminDashboard.jsx` en módulos
- [ ] F2.10 Kanban v2 (7 etapas, motivo de pérdida, "Ganar")
- [ ] F2.11 Fichas de cliente y caso
- [ ] F2.12 Control de conflictos
- [ ] F2.13 Tablero de métricas v1

### F4 — Alta rápida (sem 6–8)
- [ ] F4.1 `intake/estructurar` (Haiku)
- [ ] F4.2 `intake` transaccional
- [ ] F4.3 UI 4 pasos + dictado
- [ ] F4.4 Acciones post-guardado

### F3 — Documentos y conocimiento (sem 6–13)
- [ ] F3.1 Bucket docs KMS + lifecycle
- [ ] F3.2 Subida/descarga prefirmada
- [ ] F3.3 Pipeline de ingesta Step Functions
- [ ] F3.4 Benchmark de embeddings
- [ ] F3.5 Escaneo de malware
- [ ] F3.6 Normativa núcleo (~40 normas)
- [ ] F3.7 Crawler mensual Gaceta
- [ ] F3.8 Jurisprudencia TCP/TSJ + grafo de citas
- [ ] F3.9 Búsqueda híbrida + RRF + grafo + rerank
- [ ] F3.10 Respuestas con citas (Sonnet)
- [ ] F3.11 UI Biblioteca (árbol)
- [ ] F3.12 Plantillas DOCX (docxtpl)
- [ ] F3.13 Migración de documentos existentes

### F7.1 — Plazos procesales (sem 9–11)
- [ ] F7.1.1 Feriados + reglas de plazo
- [ ] F7.1.2 Calculadora con tests
- [ ] F7.1.3 Alertas escalonadas
- [ ] F7.1.4 Agenda unificada + ICS
- [ ] F7.1.5 Tablero "Hoy"

### F5 — Marco de trabajo (sem 11–14)
- [ ] F5.1 Tablas + editor de workflows
- [ ] F5.2 10 workflows semilla
- [ ] F5.3 Casos similares (embeddings)
- [ ] F5.4 Guía adaptada (Sonnet + RAG)
- [ ] F5.5 Pantalla 3 columnas
- [ ] F5.6 Lecciones anonimizadas al cerrar caso
- [ ] F5.7 Sugerencias de mejora de workflow

### F6 — WhatsApp (sem 9–15)
- [ ] F6.0 Decisión Q2 + tarifas Bolivia + coexistence
- [ ] F6.1 Verificación Meta Business
- [ ] F6.2 Onboarding AWS End User Messaging Social
- [ ] F6.3 Infra SNS → SQS FIFO → Lambda + DynamoDB
- [ ] F6.4 Núcleo de agente compartido web/WhatsApp
- [ ] F6.5 Router de intenciones + escalamiento
- [ ] F6.6 Tools (citas, estado de caso, documentos)
- [ ] F6.7 Media (S3, Transcribe)
- [ ] F6.8 Bandeja `/admin/whatsapp`
- [ ] F6.9 Notificación de handoff
- [ ] F6.10 Plantillas Meta aprobadas
- [ ] F6.11 Recordatorios de cita 24 h
- [ ] F6.12 Piloto → producción

### F7.2 — Finanzas y cobranza (sem 15–17)
- [ ] F7.2.1 Acuerdos, cuotas, movimientos
- [ ] F7.2.2 Propuesta de honorarios
- [ ] F7.2.3 Hitos → cuotas
- [ ] F7.2.4 Recordatorios de pago
- [ ] F7.2.5 Registro de facturas SIAT
- [ ] F7.2.6 Reportes financieros

### F8 — Endurecimiento (sem 18–19)
- [ ] F8.1 Bedrock Guardrails
- [ ] F8.2 Auditoría de lecturas
- [ ] F8.3 Backup cross-region + restore
- [ ] F8.4 Dashboard CloudWatch + AWS Budgets
- [ ] F8.5 Manual de usuario
- [ ] F8.6 Revisión de seguridad

---

## 🔮 Tareas Futuras / Backlog

- [ ] **Suscripción de Canales SNS:** Conectar suscripción de WhatsApp Business API o Email a `jhoselyn_lead_alerts`.
- [ ] **JWT Authorizer en API Gateway:** Proteger rutas de administración (`/api/appointments`, `/api/chat/leads`) con Cognito JWT.
- [ ] **Subida de Archivos PDF a S3:** Pipeline para adjuntar documentos del cliente en el proceso de cita.
- [ ] **Email Transaccional (AWS SES):** Confirmación automática de citas agendadas por email al cliente y a la abogada.
