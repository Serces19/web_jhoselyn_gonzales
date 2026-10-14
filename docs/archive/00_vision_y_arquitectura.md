# 00 — Visión y Arquitectura Objetivo: "Despacho Digital" v3

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Documento rector. Define el alcance, las capas, la arquitectura objetivo y las decisiones de diseño (ADR).
> Revisión 2026-10-13: las correcciones y criterios bloqueantes de la [segunda auditoría](../audits/11_segunda_auditoria_2026-10-13.md) prevalecen. Arquitectura propuesta; no implementada.
> El plan ejecutable por fases está en [09_plan_implementacion.md](09_plan_implementacion.md).

---

## 1. Objetivo

Convertir el sitio web actual (landing + citas + chat IA + CRM Kanban básico) en un **sistema operativo del despacho** para una abogada independiente en Cochabamba (Bolivia) con clientes en Bolivia y EEUU:

| Capa | Módulo | Doc |
|---|---|---|
| 1 | Correcciones de contenido de la web pública | [01_web_contenido.md](01_web_contenido.md) |
| 2 | CRM legal real (clientes, casos, finanzas, embudo, métricas) | [02_crm_modelo_datos.md](02_crm_modelo_datos.md) |
| 3 | Documentos + plantillas + base de conocimiento + biblioteca legal (RAG / GraphRAG) | [03_documentos_y_conocimiento.md](03_documentos_y_conocimiento.md) |
| 4 | Panel de alta rápida (cliente + caso + relato) | [04_panel_alta_rapida.md](04_panel_alta_rapida.md) |
| 5 | Marco de trabajo del caso (guía procedimental) | [05_marco_de_trabajo.md](05_marco_de_trabajo.md) |
| 6 | Atención al cliente por WhatsApp con IA + derivación humana | [06_atencion_whatsapp.md](06_atencion_whatsapp.md) |
| + | Módulos sugeridos (plazos procesales, facturación/cobranza) | [07_modulos_sugeridos.md](07_modulos_sugeridos.md) |
| — | Seguridad, secreto profesional y cumplimiento | [08_seguridad_cumplimiento.md](08_seguridad_cumplimiento.md) |
| — | Plan de implementación ultra detallado | [09_plan_implementacion.md](09_plan_implementacion.md) |
| — | Research 2026 y fuentes | [10_research_2026.md](10_research_2026.md) |

---

## 2. Estado actual (v2.1, auditado 2026-10-07)

| Componente | Estado | Problema para escalar |
|---|---|---|
| Frontend React 19 + Vite 8 (Amplify) | Producción | `AdminDashboard.jsx` = 1926 líneas monolíticas |
| Lambda única `handler.py` (router `if/elif`) | Producción | Todo en una función, sin capas |
| DynamoDB: `Appointments`, `AvailabilityBlocks`, `BlogPosts`, `ProBonoRequests`, `ChatLeads`, `ChatSessions` | Producción | No hay `clientes`/`casos`; el "CRM" vive dentro de `ChatLeads`; sin JOIN SQL nativo; métricas requieren agregaciones/materializaciones |
| Chat IA (Bedrock Claude Haiku 4.5, 6 turnos, tool `save_lead_summary`) | Producción | Solo web; no WhatsApp |
| Cognito (grupo `Admins`) | Producción | **API Gateway sin authorizer** → endpoints admin (`/api/crm/leads`, `/api/appointments` GET) públicos |
| Terraform | State **local** | Riesgo de pérdida del state; sin entornos |

**Conclusión:** antes de construir encima hay que cerrar la seguridad (Fase 0) — se van a almacenar datos sensibles de familias y menores.

---

## 3. Arquitectura objetivo

```
                    ┌──────────────────────── Clientes ─────────────────────────┐
                    │  Web pública (Amplify)          WhatsApp (número oficial)  │
                    └──────────┬──────────────────────────────┬─────────────────┘
                               │ HTTPS                        │ Meta Cloud API
                               ▼                              ▼
                    API Gateway HTTP API          AWS End User Messaging Social
                    (JWT Cognito en /api/admin/*)        │ evento → SNS
                               │                              │
          ┌────────────────────┼──────────────────────────────┼─────────────────────┐
          │ Lambdas por dominio (Python 3.12, Powertools)                            │
          │  public_api │ crm_api │ docs_api │ workspace_api │ wa_inbound │ agent    │
          └──────┬──────────────┬───────────────┬──────────────────┬────────────────┘
                 │              │               │                  │
                 ▼              ▼               ▼                  ▼
     Aurora PostgreSQL     S3 (documentos)   Bedrock             EventBridge Scheduler
     Serverless v2         SSE-KMS +         - Claude Haiku       (recordatorios, plazos,
     (auto-pause, Data     versioning        - Claude Sonnet       crawl de normas)
     API; Lambda fuera       │              - Embeddings              │
     de VPC; BD en VPC)
     - CRM relacional         ▼                 multilingües            ▼
     - pgvector (RAG)    Pipeline ingesta      │                    SES / WhatsApp
     - ltree (árbol)     (Textract OCR →       │                    plantillas utility
     - grafo ligero      clasificar → chunk →  │
       (entidades/       embed → indexar) ◄────┘
        relaciones)
```

### 3.1 Principios

1. **Serverless y pago por uso.** Volumen esperado: 1 abogada, decenas de casos activos, cientos de clientes/año. Nada always-on caro.
2. **Una sola base de datos de verdad (PostgreSQL)** para CRM + vectores + árbol + grafo ligero. Menos piezas = menos costo y menos fallos.
3. **El humano decide.** La IA sugiere (clasificación, guía, borradores, respuestas); la abogada aprueba. Nunca se envía asesoría jurídica vinculante de forma automática.
4. **Datos reales.** Sin datos mock en las interfaces; migración de los leads existentes de DynamoDB.
5. **Trazabilidad.** Toda acción sobre un caso queda en `eventos_caso` (línea de tiempo) y `auditoria`.

---

## 4. Decisiones de arquitectura (ADR)

### ADR-01 — Base de datos del CRM: Aurora PostgreSQL Serverless v2 (recomendado) vs. seguir en DynamoDB

| Criterio | DynamoDB (actual) | Aurora PG Serverless v2 |
|---|---|---|
| Cruzar datos (cliente × caso × pagos × canal) | Agregaciones/materialización en aplicación o analítica exportada, según patrón | `JOIN` nativo, vistas, CTEs |
| Métricas / embudo | Agregaciones en código | SQL + vistas materializadas |
| Vectores RAG | Servicio aparte | `pgvector` en la misma BD |
| Árbol de categorías | Simular con prefijos | Extensión `ltree` (consultas por rama) |
| Grafo de relaciones (GraphRAG-lite) | No | Tablas `entidades`/`relaciones` + CTE recursivo |
| Costo en reposo | ~0 | ~0 con **auto-pause a 0 ACU** (sólo storage) |
| Latencia primer request del día | ms | Típica ~15 s; posible ≥30 s tras pausa prolongada; medir timeout/reintento |
| Acceso desde Lambda | SDK | **RDS Data API** (HTTP, sin VPC ni NAT) |

**Decisión propuesta:** Aurora PostgreSQL Serverless v2 con `min_capacity = 0` (auto-pause), Data API habilitada.
DynamoDB se mantiene para lo que ya funciona y es de alto tráfico público: `Appointments`, `AvailabilityBlocks`, `BlogPosts`, `ChatSessions`.
**Estado:** pendiente de aprobación (ver pregunta abierta Q1 en el plan).

### ADR-02 — RAG: GraphRAG-lite en Postgres en vez de Neptune Analytics
Bedrock Knowledge Bases soporta GraphRAG sobre Neptune Analytics, pero Neptune es un recurso con costo por hora permanente (no escala a cero), desproporcionado para un despacho unipersonal. Se implementa:
- búsqueda híbrida (FTS `tsvector` español con `ts_rank`/`ts_rank_cd` + `pgvector`; no BM25 nativo),
- filtro por rama del árbol (`ltree`),
- expansión por grafo (norma → artículo → sentencias que lo citan → casos propios que lo usaron).
Migración a Bedrock KB + Neptune queda como opción si el corpus supera ~1 M de chunks. Ver [03](03_documentos_y_conocimiento.md).

### ADR-03 — WhatsApp: AWS End User Messaging Social + Lambda + Bedrock
Integración nativa AWS (evento → SNS → Lambda), mismo stack, facturación unificada, con AWS como proveedor de integración y cargos propios. Ver comparación completa en [06](06_atencion_whatsapp.md).

### ADR-04 — Modelos
| Uso | Modelo (Bedrock) | Motivo |
|---|---|---|
| Chat público web/WhatsApp, clasificación de intención, extracción | Claude Haiku 4.5 (actual) | Latencia y costo |
| Guía procedimental, análisis de caso, borradores | Claude Sonnet (última versión disponible en Bedrock) | Razonamiento jurídico |
| Embeddings | Modelo multilingüe en Bedrock (Cohere Embed Multilingual o Titan Text Embeddings V2) — elegir por benchmark propio en español jurídico (Fase 3) | Corpus 100 % español |
| OCR | Amazon Textract | Escaneos de expedientes y resoluciones |

### ADR-05 — Backend modular
Se divide `handler.py` en Lambdas por dominio con **AWS Lambda Powertools** (router, validación, logging estructurado). El frontend admin se divide en módulos (`/admin/crm`, `/admin/casos/:id`, `/admin/biblioteca`, `/admin/whatsapp`, `/admin/finanzas`).

### ADR-06 — Terraform remote state
State en S3 (versionado + cifrado) con locking nativo de S3 (`use_lockfile = true`). Elimina el state local.

---

## 5. Mapa de navegación del panel admin (objetivo)

```
/admin
├── Inicio (tablero: KPIs, plazos de hoy, conversaciones que esperan a la abogada)
├── Alta rápida (+ botón global)                         → doc 04
├── Embudo (Kanban de oportunidades)                      → doc 02
├── Clientes  /admin/clientes/:id                         → doc 02
├── Casos     /admin/casos/:id  (Marco de trabajo)        → doc 05
├── Agenda (citas + plazos procesales)                    → doc 07
├── Biblioteca (árbol: casos · plantillas · conocimiento · normativa) → doc 03
├── Bandeja WhatsApp (conversaciones, toma de control)    → doc 06
├── Finanzas (honorarios, pagos, facturas, cartera)       → docs 02 / 07
├── Web (blog, horarios, contenidos)                      → doc 01
└── Configuración (usuarios, plantillas WA, etiquetas)
```
