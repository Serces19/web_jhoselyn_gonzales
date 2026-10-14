# 09 — Plan de implementación por fases (ultra detallado)

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Cada fase entrega valor usable por sí sola. Estimaciones para 1 desarrollador a tiempo parcial (~20 h/semana).
> Revisión 2026-10-13: [segunda auditoría](../audits/11_segunda_auditoria_2026-10-13.md) §4 añade A2 bloqueantes y corrige dependencias. Cronograma y USD 65–135/mes son hipótesis sin validación. Permisos, cuarentena, auditoría, presupuesto y restauración se adelantan a las fases con datos; no esperar F8.
> IDs de tarea `F{fase}.{n}` se replican en [`global_tasks.md`](../global_tasks.md).

---

## Preguntas abiertas (bloquean decisiones)

| ID | Pregunta | Para | Bloquea |
|---|---|---|---|
| Q1 | ¿Aprobamos Aurora PostgreSQL Serverless v2 (ADR-01) en lugar de seguir sólo con DynamoDB? | Sergio | F2+ |
| Q2 | WhatsApp: ¿Opción C (AWS EUM Social) con el **número actual** (+591 69512921, requiere *coexistence*) o un número nuevo para el bot? | Abogada + Sergio | F6 |
| Q3 | Lote de correcciones de contenido (textos/fotos) | Abogada | F1 |
| Q4 | Lista de normas núcleo y libros propios a cargar | Abogada | F3 |
| Q5 | Pasos, plazos y bases legales de los 10 workflows semilla | Abogada | F5 |
| Q6 | Modalidad de facturación SIAT actual (portal web / ninguna) y NIT | Abogada | F7.2 |
| Q7 | ¿Árbol de taxonomía (doc 03 §3) refleja cómo ella busca? Ajustes | Abogada | F3 |

## Cronograma

```
Sem:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22
F0   ███                                                             Seguridad + fundaciones
F1   ██████ (en paralelo, según llegan los lotes)                     Contenido web
F2      ████████████                                                 CRM (Aurora + migración + UI)
F4               █████                                               Alta rápida
F3               ████████████████                                    Documentos + RAG
F7.1                      ██████                                     Plazos procesales
F5                              ████████                             Marco de trabajo
F6                         ███████████████                           WhatsApp (incl. aprobación Meta)
F7.2                                     ██████                      Finanzas / cobranza
F8                                             ████                  Endurecimiento + métricas finales
```

---

## F0 — Seguridad y fundaciones (semanas 1–2)

| ID | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| F0.1 | Backend remoto de Terraform | Bucket `jg-tfstate-<account>` (versioning, SSE-KMS); `backend "s3" { use_lockfile = true }`; `terraform init -migrate-state` | `terraform plan` sin cambios desde otra máquina; state local eliminado |
| F0.2 | Reorganizar Terraform en módulos | `infrastructure/modules/{api,auth,data,docs,messaging,ai}`; `envs/prod` | Plan idéntico al actual (sin recreaciones) — usar `moved {}` |
| F0.3 | JWT Authorizer | `aws_apigatewayv2_authorizer` (JWT, issuer Cognito); rutas `/api/admin/{proxy+}` protegidas; frontend envía `Authorization: Bearer <idToken>` | `curl` sin token a `/api/admin/crm/leads` → 401 |
| F0.4 | Mover endpoints admin | `GET /api/appointments`, `PATCH /api/appointments/{id}`, `/api/crm/leads*`, blog POST/PUT/DELETE, `PUT /api/schedule`, `GET /api/probono` → `/api/admin/...`; mantener alias 2 semanas | Panel admin funciona; rutas viejas devuelven 401 tras el periodo |
| F0.5 | MFA Cognito | `mfa_configuration = "ON"` TOTP; `Login.jsx` con paso de código | Login exige TOTP |
| F0.6 | CORS + throttling | Origen = dominio Amplify/propio; throttling 10 rps burst 20 en rutas públicas | Origen ajeno bloqueado |
| F0.7 | PITR DynamoDB + log retention | `point_in_time_recovery { enabled = true }` en 6 tablas; retención 90 d | Verificado en consola |
| F0.8 | Refactor Lambda con Powertools | `APIGatewayHttpResolver`; separar `public_api.py` y `admin_api.py` (misma Lambda por ahora) | Tests de humo de todas las rutas pasan |
| F0.9 | Limpieza repo | Mover `test_*.py` a `scripts/experiments/`; borrar `ChatWidget.jsx` legacy; `.env.example` | Repo raíz limpio |
| F0.10 | Runbook restore | `docs/runbooks/restore.md` | Restauración PITR probada en tabla de prueba |

## F1 — Contenido web (continuo, semanas 1–4)

| ID | Tarea | Criterio |
|---|---|---|
| F1.1 | Crear `frontend/src/content/despacho.js` (fuente única de contacto/tarifas/áreas) y refactorizar páginas | grep del teléfono sólo aparece en ese archivo |
| F1.2 | Aplicar lotes L-01..L-n según [01](01_web_contenido.md) | Lote verificado en producción |
| F1.3 | Página `/privacidad` + aviso en chat | Enlazada en footer y chat |
| F1.4 | UTM y `canal` en formularios/chat/booking (para el CRM) | Lead nuevo trae `canal` y `campana` |
| F1.5 | SEO local: meta por página, schema.org `LegalService`/`Attorney`, sitemap | Validado en Rich Results Test |

## F2 — CRM legal (semanas 2–7)

| ID | Tarea | Detalle | Criterio |
|---|---|---|---|
| F2.1 | Aurora Serverless v2 | Terraform: cluster PG 16, `serverlessv2_scaling_configuration { min_capacity = 0, max_capacity = 2, seconds_until_auto_pause = 1800 }`, `enable_http_endpoint = true` (Data API), KMS, backups 14 d, deletion protection; secret en Secrets Manager | `aws rds-data execute-statement "select 1"` OK desde Lambda sin VPC |
| F2.2 | Migraciones de esquema | Herramienta: SQL versionado `db/migrations/0001_init.sql…` aplicado por Lambda `db_migrate` (Data API) o `alembic` local; extensiones `ltree, vector, pg_trgm, unaccent` | Esquema doc 02 + 03 + 05 creado |
| F2.3 | Seeds | `canales`, `taxonomia` inicial, `configuracion_despacho` | Árbol visible vía SQL |
| F2.4 | Capa de acceso a datos | `db.py` sobre Data API (param binding, transacciones `begin/commit`), manejo de `DatabaseResumingException` con retry/backoff (auto-pause) | Primer request tras pausa responde < 30 s con retry transparente |
| F2.5 | Lambda `crm_api` | Endpoints doc 02 §7 con validación Pydantic | Tests de integración contra Aurora dev |
| F2.6 | Migración `ChatLeads` | `scripts/migrate_chatleads.py --dry-run / --apply`, idempotente por `legacy_lead_id` | Conteo origen = destino; 0 duplicados de teléfono |
| F2.7 | `agent_core.py` escribe en Aurora | `save_lead_summary` → persona + oportunidad (canal `Chat IA web`); doble escritura a `ChatLeads` 2 semanas | Lead del chat aparece en Kanban nuevo |
| F2.8 | Booking ↔ oportunidad | `POST /api/appointments` busca/crea persona y mueve oportunidad a `consulta_agendada` | Cita web refleja etapa |
| F2.9 | Frontend modular | Dividir `AdminDashboard.jsx` en `admin/` (`Layout`, `CrmBoard`, `Clientes`, `ClienteDetalle`, `Casos`, `Citas`, `Blog`, `Horarios`); React Router anidado; cliente API con token | Ningún archivo > 500 líneas |
| F2.10 | Kanban v2 | 7 etapas, drag & drop, `motivo_perdida` obligatorio, "Ganar" → modal cliente+caso+acuerdo | Flujo completo en UI |
| F2.11 | Ficha de cliente y de caso (básica) | Datos, casos, interacciones, línea de tiempo | — |
| F2.12 | Control de conflictos | Endpoint + alerta en formularios | Prueba con nombre similar (tildes/typos) detecta |
| F2.13 | Tablero de métricas v1 | Vistas SQL: embudo por canal, conversión por etapa, tiempo de cierre, ingresos por área; gráficos simples | Datos reales migrados visibles |

## F4 — Alta rápida (semanas 6–8)

| ID | Tarea | Criterio |
|---|---|---|
| F4.1 | Endpoint `intake/estructurar` (Haiku, tool con JSON schema doc 04 §2, `area_path` validado) | 10 relatos reales → área correcta ≥ 9/10 |
| F4.2 | Endpoint `intake` transaccional | Rollback si falla cualquier insert |
| F4.3 | UI modal 4 pasos + atajo `N` + botón global; dictado Web Speech `es-BO` | Alta ≤ 90 s en móvil |
| F4.4 | Acciones post-guardado (WhatsApp bienvenida — habilitado en F6; agendar; contrato) | — |

## F3 — Documentos y conocimiento (semanas 6–13)

| ID | Tarea | Detalle | Criterio |
|---|---|---|---|
| F3.1 | Bucket docs + KMS + lifecycle | doc 03 §2 | Bucket privado, cifrado verificado |
| F3.2 | Subida/descarga | `docs_api`: URL prefirmada PUT/GET; registro en `documentos`; sha256 | Subir PDF 20 MB desde panel |
| F3.3 | Pipeline ingesta (Step Functions) | Validar → dedupe → extraer (pypdf/Textract/python-docx) → clasificar (Haiku) → chunk → contexto → embeddings → grafo → indexar | Documento escaneado queda `indexado` < 3 min |
| F3.4 | Benchmark embeddings | 50 preguntas reales; comparar 2 modelos multilingües Bedrock; elegir por recall@8 | Informe en `docs/10_research_2026.md` |
| F3.5 | Malware scan | GuardDuty Malware Protection for S3 en prefijo `_ingesta/` | Archivo EICAR bloqueado |
| F3.6 | Carga normativa núcleo | ~40 normas (Q4) segmentadas por artículo; metadatos de vigencia | Búsqueda "art. 210 Ley 603" devuelve el artículo |
| F3.7 | Crawler Gaceta (mensual) | EventBridge Scheduler → Lambda; sólo novedades; respeta términos | Nueva norma aparece en "Por clasificar" |
| F3.8 | Jurisprudencia TCP/TSJ (familia) | Carga inicial de sistematizaciones + sentencias relevantes; extracción de citas → grafo | Consulta muestra sentencias que interpretan un artículo |
| F3.9 | Búsqueda híbrida + RRF + filtro árbol + expansión grafo + rerank | doc 03 §7 | recall@8 ≥ 0.85 |
| F3.10 | Respuesta con citas (Sonnet) | Citas enlazadas; "no encontrado" si no hay respaldo | 0 citas inventadas en set de evaluación |
| F3.11 | UI Biblioteca | Árbol, pestañas, preview, bandeja "Por clasificar", búsqueda/pregunta | Abogada encuentra 10 docs pedidos en < 30 s c/u |
| F3.12 | Plantillas DOCX | Carga de plantillas con variables; generación `docxtpl`; "Usar en caso" | Contrato de honorarios generado con datos del caso |
| F3.13 | Migrar documentos existentes | Carga masiva de carpetas de la abogada a `_ingesta` con mapeo de carpeta → rama | Inventario: % clasificado automático vs. manual |

## F7.1 — Plazos procesales (semanas 9–11)

| ID | Tarea | Criterio |
|---|---|---|
| F7.1.1 | Tablas `feriados`, `reglas_plazo`; seed feriados 2026–2027 Bolivia + Cochabamba | — |
| F7.1.2 | Calculadora (días hábiles/calendario, vacaciones judiciales) + tests unitarios con casos validados por la abogada | 20 casos de prueba correctos |
| F7.1.3 | Alertas EventBridge Scheduler 7/3/1/0 días → panel + SES + WhatsApp personal | Alerta recibida en prueba |
| F7.1.4 | Agenda unificada + feed ICS privado | Visible en Google Calendar |
| F7.1.5 | Tablero "Hoy" | — |

## F5 — Marco de trabajo (semanas 11–14)

| ID | Tarea | Criterio |
|---|---|---|
| F5.1 | Tablas `workflows`, `workflow_pasos`, `caso_pasos` + editor de workflows en el panel | Abogada crea un workflow sin ayuda |
| F5.2 | Redactar 10 workflows semilla con la abogada (Q5) | Validados por ella |
| F5.3 | Embedding de casos + "casos similares" | Top-3 coherentes en 5 casos de prueba |
| F5.4 | Generación de guía adaptada (Sonnet + RAG + similares) con origen marcado de cada paso | Guía aceptada con ≤ 2 ediciones en 4/5 casos |
| F5.5 | Pantalla 3 columnas (doc 05 §3); "Marcar hecho" → evento + plazo siguiente + cuota si hito | — |
| F5.6 | Cierre de caso → lección anonimizada → conocimiento | Sin PII en lección (revisión) |
| F5.7 | Sugerencia de mejora de workflow por pasos ad-hoc repetidos | — |

## F6 — WhatsApp (semanas 9–15; incluye tiempos de Meta)

| ID | Tarea | Detalle | Criterio |
|---|---|---|---|
| F6.0 | Decisión Q2 + verificación de *coexistence* y tarifas Bolivia | Revisar tabla oficial de precios Meta | Decisión documentada |
| F6.1 | Meta Business Manager verificado | Verificación de negocio (documentos del despacho) | Business verificado |
| F6.2 | Onboarding en AWS End User Messaging Social | Vincular WABA + número; destino de eventos = SNS `wa_inbound` | Mensaje de prueba recibido en SNS |
| F6.3 | Infra | SNS estándar → SQS estándar → adaptador → SQS FIFO → Lambda; DLQ, idempotencia y eventos fuera de orden; IAM según API oficial `social-messaging` | Reintentos y handoff pasan en staging |
| F6.4 | Refactor `agent_core.py` en núcleo compartido web/WhatsApp (canal como parámetro; mismo método de escucha; tools) | Tests del chat web siguen pasando |
| F6.5 | Router de intenciones + política de escalamiento (doc 06 §5–6) | Set de 60 mensajes reales etiquetados: precisión ≥ 90 %, 100 % de urgencias escaladas |
| F6.6 | Tools: disponibilidad, crear/reprogramar cita, estado de caso (verificado), recibir documento | — |
| F6.7 | Media: imágenes/PDF → S3 caso; audio → Transcribe → texto | Nota de voz entendida |
| F6.8 | Bandeja `/admin/whatsapp` (tomar control / devolver / responder / plantillas / crear caso) | Abogada atiende una conversación de punta a punta |
| F6.9 | Notificación de handoff a la abogada | Llega en < 30 s |
| F6.10 | Plantillas Meta (doc 06 §8) enviadas y aprobadas | Aprobadas |
| F6.11 | Recordatorios de cita 24 h (EventBridge) | Enviado en prueba |
| F6.12 | Piloto 2 semanas con números de confianza → producción | Revisión diaria de conversaciones; ajuste de prompts |

## F7.2 — Finanzas y cobranza (semanas 15–17)

| ID | Tarea | Criterio |
|---|---|---|
| F7.2.1 | Acuerdos, cuotas, movimientos en UI de caso | Registrar honorario + 3 cuotas + 2 pagos |
| F7.2.2 | Propuesta de honorarios (plantilla) → WhatsApp | — |
| F7.2.3 | Hitos de workflow activan cuotas | — |
| F7.2.4 | Recordatorios de pago | — |
| F7.2.5 | Registro de facturas SIAT (manual asistido) | Factura con CUF adjunta |
| F7.2.6 | Reportes: cartera aging, rentabilidad por caso, flujo proyectado | — |

## F8 — Endurecimiento y cierre (semanas 18–19)

| ID | Tarea |
|---|---|
| F8.1 | Bedrock Guardrails en chat público (PII, temas denegados) |
| F8.2 | Auditoría de lecturas de expedientes |
| F8.3 | Backup cross-region mensual + prueba de restore |
| F8.4 | Dashboard CloudWatch (errores, latencia, costo Bedrock) + presupuesto AWS Budgets con alerta |
| F8.5 | Manual de usuario para la abogada (`docs/manual_usuario.md`) |
| F8.6 | Revisión de seguridad (`/security-review`) |

---

## Costos mensuales estimados (régimen, orden de magnitud)

| Servicio | Estimación USD/mes |
|---|---|
| Aurora Serverless v2 (auto-pause, ~4 h/día activo a 0.5–1 ACU) + storage | 15 – 30 |
| S3 + KMS | 2 – 5 |
| Textract (sólo escaneados; carga inicial aparte) | 0 – 10 |
| Bedrock (chat web + WhatsApp + panel + embeddings) | 20 – 50 |
| Lambda / API GW / DynamoDB / SNS / SQS / Step Functions | < 5 |
| WhatsApp (Meta) | < 30 |
| Amplify | ~1 – 5 |
| **Total** | **≈ 65 – 135** |

La carga inicial del corpus (Textract + embeddings de miles de documentos) es un costo único a presupuestar en F3.6–F3.8 (estimar con el inventario real antes de ejecutar).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Plazo mal calculado | La IA nunca fija plazos sola; calculadora con tests validados; alertas múltiples |
| Alucinación jurídica | Citas obligatorias, "no encontrado", revisión humana, Guardrails |
| Fuga de datos de casos | Fase 0 primero; aislamiento C1/C3 del chat público; KMS; auditoría |
| Meta rechaza plantillas o bloquea número | Plantillas utility sobrias; Opción A como respaldo; no mensajes masivos |
| Cold start Aurora (auto-pause) | Retry transparente + indicador "despertando base de datos"; subir `seconds_until_auto_pause` en horario laboral si molesta |
| Adopción por la abogada | Entregas cortas, piloto con casos reales, manual, alta rápida móvil |
