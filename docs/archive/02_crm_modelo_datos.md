# 02 — Capa 2: CRM legal — modelo de datos, embudo y métricas

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Motor: Aurora PostgreSQL Serverless v2 (ver ADR-01 en [00](00_vision_y_arquitectura.md)).
> Objetivo: cruzar datos cliente × caso × dinero × canal de captación para medir el negocio y el embudo.
> Revisión 2026-10-13: DDL conceptual, **no migración ejecutada ni validada**. Resolver orden/ciclos de FK, integridad financiera y permisos; ver [segunda auditoría](../audits/11_segunda_auditoria_2026-10-13.md), D03/D04 y modelo mínimo. El inventario enumera 20 tablas en 7 dominios, además del historial del DDL; la cifra anterior de 16/6 no es correcta.

---

## 1. Respuesta directa: ¿bastan clientes, casos, finanzas, documentos?

No. Con sólo esas 4 tablas **no se puede**: medir el embudo (un prospecto no es todavía un cliente), detectar conflictos de interés (la contraparte no es cliente), calcular plazos, ni saber qué canal trae clientes rentables. Este inventario enumera **20 tablas en 7 dominios**, además del historial del DDL; implementar por entregas:

| Dominio | Tablas | Por qué |
|---|---|---|
| Personas | `personas`, `clientes` | Una persona puede ser cliente, contraparte, testigo, juez… Base del control de conflictos |
| Captación | `oportunidades`, `canales`, `interacciones` | Embudo de ventas real separado del caso |
| Casos | `casos`, `caso_partes`, `eventos_caso`, `tareas_plazos` | Expediente, roles, línea de tiempo, vencimientos |
| Finanzas | `acuerdos_honorarios`, `cuotas`, `movimientos`, `facturas` | Honorario pactado ≠ cobrado ≠ facturado; gastos del caso |
| Documentos | `documentos`, `taxonomia` | Archivos + árbol de ramas (detalle en doc 03) |
| Procedimiento | `workflows`, `workflow_pasos`, `caso_pasos` | Marco de trabajo (detalle en doc 05) |
| Sistema | `auditoria`, `configuracion_despacho` | Trazabilidad y datos únicos del despacho |

## 2. Diagrama entidad-relación

```
canales ──< oportunidades >── personas ──< clientes
                 │                │            │
                 │ (se convierte) │            │
                 ▼                ▼            ▼
               casos ──< caso_partes >── personas (contraparte, juez, etc.)
                 │
     ┌───────────┼─────────────┬────────────────┬──────────────┐
     ▼           ▼             ▼                ▼              ▼
eventos_caso  tareas_plazos  documentos   acuerdos_honorarios  caso_pasos ──> workflow_pasos ──> workflows
                                                │
                                         cuotas ─┴─ movimientos ── facturas
interacciones (WhatsApp/llamada/email/cita) ──> persona, oportunidad?, caso?
```

## 3. DDL (PostgreSQL 16)

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- búsqueda difusa de nombres (conflictos)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ===================== PERSONAS =====================
CREATE TABLE personas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            text NOT NULL CHECK (tipo IN ('natural','juridica')),
  nombres         text NOT NULL,
  apellidos       text,
  documento_tipo  text CHECK (documento_tipo IN ('CI','NIT','PASAPORTE','OTRO')),
  documento_num   text,
  documento_ext   text,                 -- extensión CI: CB, LP, SC...
  fecha_nac       date,
  telefono_e164   text,                 -- +5917XXXXXXX (clave para WhatsApp)
  email           text,
  pais_residencia text DEFAULT 'BO',
  ciudad          text,
  direccion       text,
  notas           text,
  creado_en       timestamptz DEFAULT now(),
  actualizado_en  timestamptz DEFAULT now(),
  UNIQUE (documento_tipo, documento_num)
);
-- Mantener normalización con aplicación/trigger; unaccent es STABLE.
ALTER TABLE personas ADD COLUMN nombre_busqueda text;
CREATE INDEX personas_nombre_trgm ON personas USING gin (nombre_busqueda gin_trgm_ops);
-- Un teléfono puede ser compartido: no fusionar personas automáticamente.
CREATE INDEX personas_tel ON personas (telefono_e164) WHERE telefono_e164 IS NOT NULL;

CREATE TABLE clientes (               -- persona que contrató al menos una vez
  persona_id        uuid PRIMARY KEY REFERENCES personas(id),
  codigo            text UNIQUE NOT NULL,          -- CLI-2026-0001
  canal_origen_id   int REFERENCES canales(id),
  fecha_alta        date NOT NULL DEFAULT current_date,
  estado            text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','moroso','vetado')),
  consentimiento_datos_en timestamptz,             -- ver doc 08
  nps_ultimo        smallint CHECK (nps_ultimo BETWEEN 0 AND 10)
);

-- ===================== CAPTACIÓN =====================
CREATE TABLE canales (
  id      serial PRIMARY KEY,
  nombre  text UNIQUE NOT NULL,   -- 'Chat IA web','WhatsApp','Instagram','TikTok','Facebook',
                                  -- 'Google','Referido cliente','Referido colega','Docencia','Pro bono','QR tarjeta'
  tipo    text CHECK (tipo IN ('organico','pagado','referido','directo')),
  costo_mensual_bs numeric(12,2) DEFAULT 0          -- para CAC
);

CREATE TABLE oportunidades (          -- = lead del embudo (reemplaza ChatLeads)
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id       uuid NOT NULL REFERENCES personas(id),
  canal_id         int REFERENCES canales(id),
  campana          text,                            -- utm_campaign / post concreto
  area_path        ltree,                           -- familia.divorcio.unilateral (ver taxonomia)
  resumen          text,                            -- relato del cliente
  detalles_ia      jsonb,                           -- case_details, emotional_state, urgency (del agente)
  urgencia         text DEFAULT 'normal' CHECK (urgencia IN ('baja','normal','alta','critica')),
  etapa            text NOT NULL DEFAULT 'nuevo'
                   CHECK (etapa IN ('nuevo','contactado','consulta_agendada','consulta_realizada',
                                    'propuesta_enviada','ganado','perdido')),
  motivo_perdida   text CHECK (motivo_perdida IN ('precio','no_responde','eligio_otro','no_viable',
                                                  'conflicto_interes','fuera_de_area','otro')),
  valor_estimado_bs numeric(12,2),
  probabilidad     smallint CHECK (probabilidad BETWEEN 0 AND 100),
  caso_id          uuid REFERENCES casos(id),       -- se llena al ganar
  legacy_lead_id   text,                            -- trazabilidad migración ChatLeads
  creado_en        timestamptz DEFAULT now(),
  etapa_cambiada_en timestamptz DEFAULT now(),
  cerrado_en       timestamptz
);

CREATE TABLE oportunidad_historial (  -- necesario para tiempos por etapa
  id             bigserial PRIMARY KEY,
  oportunidad_id uuid REFERENCES oportunidades(id) ON DELETE CASCADE,
  de_etapa       text, a_etapa text,
  en             timestamptz DEFAULT now()
);

CREATE TABLE interacciones (          -- todo contacto con una persona
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id     uuid REFERENCES personas(id),
  oportunidad_id uuid REFERENCES oportunidades(id),
  caso_id        uuid REFERENCES casos(id),
  canal          text CHECK (canal IN ('whatsapp','web_chat','llamada','email','presencial','videollamada')),
  direccion      text CHECK (direccion IN ('entrante','saliente')),
  autor          text CHECK (autor IN ('cliente','abogada','bot')),
  resumen        text,
  wa_conversacion_id text,                          -- enlace a la conversación WhatsApp (doc 06)
  en             timestamptz DEFAULT now()
);

-- ===================== CASOS =====================
CREATE TABLE casos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo            text UNIQUE NOT NULL,            -- CAS-2026-0042
  cliente_id        uuid NOT NULL REFERENCES clientes(persona_id),
  titulo            text NOT NULL,                   -- "Divorcio de mutuo acuerdo — Pérez/López"
  area_path         ltree NOT NULL,                  -- familia.divorcio.mutuo_acuerdo
  tipo_tramite      text CHECK (tipo_tramite IN ('judicial','extrajudicial','administrativo','asesoria','notarial')),
  descripcion       text,                            -- relato estructurado (doc 04)
  objetivo_cliente  text,
  estrategia        text,
  -- Datos judiciales
  juzgado           text,                            -- "Juzgado Público de Familia 3° Cochabamba"
  nurej             text,                            -- Número Único de Registro Judicial
  ciudad_juzgado    text DEFAULT 'Cochabamba',
  -- Estado
  estado            text NOT NULL DEFAULT 'abierto'
                    CHECK (estado IN ('abierto','en_tramite','suspendido','sentencia','ejecucion','cerrado','archivado')),
  resultado         text CHECK (resultado IN ('favorable','parcial','desfavorable','conciliado','desistido')),
  workflow_id       uuid REFERENCES workflows(id),   -- procedimiento base (doc 05)
  pro_bono          boolean DEFAULT false,
  fecha_apertura    date NOT NULL DEFAULT current_date,
  fecha_cierre      date,
  embedding         vector(1024)                     -- para "casos similares" (doc 05)
);

CREATE TABLE caso_partes (
  caso_id    uuid REFERENCES casos(id) ON DELETE CASCADE,
  persona_id uuid REFERENCES personas(id),
  rol        text CHECK (rol IN ('cliente','contraparte','abogado_contrario','menor_involucrado',
                                 'testigo','perito','juez','fiscal','otro')),
  PRIMARY KEY (caso_id, persona_id, rol)
);

CREATE TABLE eventos_caso (           -- línea de tiempo inmutable
  id        bigserial PRIMARY KEY,
  caso_id   uuid REFERENCES casos(id) ON DELETE CASCADE,
  tipo      text,                      -- 'memorial_presentado','audiencia','notificacion','resolucion',
                                       -- 'reunion_cliente','pago','nota','documento','paso_completado'
  titulo    text, detalle text,
  fecha     timestamptz NOT NULL DEFAULT now(),
  ref_id    uuid,                      -- documento/pago/paso relacionado
  autor     text DEFAULT 'abogada'
);

CREATE TABLE tareas_plazos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id       uuid REFERENCES casos(id) ON DELETE CASCADE,
  tipo          text CHECK (tipo IN ('plazo_procesal','audiencia','tarea','recordatorio_cliente','cobro')),
  titulo        text NOT NULL,
  base_legal    text,                  -- "Art. 365 Ley 439 — apelación 15 días"
  fecha_inicio  date,                  -- p.ej. fecha de notificación
  dias          int, dias_habiles boolean DEFAULT true,
  vence_en      timestamptz NOT NULL,
  estado        text DEFAULT 'pendiente' CHECK (estado IN ('pendiente','hecho','vencido','cancelado')),
  alertas_dias  int[] DEFAULT '{7,3,1}',
  completado_en timestamptz
);

-- ===================== FINANZAS =====================
CREATE TABLE acuerdos_honorarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id       uuid NOT NULL REFERENCES casos(id),
  modalidad     text CHECK (modalidad IN ('fijo','por_etapa','por_hora','cuota_litis','mixto','consulta')),
  monto_total   numeric(12,2),
  moneda        text DEFAULT 'BOB' CHECK (moneda IN ('BOB','USD','EUR')),
  porcentaje_exito numeric(5,2),       -- cuota litis si aplica
  documento_id  uuid REFERENCES documentos(id),   -- contrato firmado
  firmado_en    date
);

CREATE TABLE cuotas (                  -- plan de pagos
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acuerdo_id  uuid REFERENCES acuerdos_honorarios(id) ON DELETE CASCADE,
  concepto    text,                    -- "Anticipo", "Al presentar demanda", "Sentencia"
  monto       numeric(12,2) NOT NULL,
  vence_en    date,
  estado      text DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagada','parcial','vencida','condonada'))
);

CREATE TABLE movimientos (             -- dinero que entra o sale
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id     uuid REFERENCES casos(id),
  cuota_id    uuid REFERENCES cuotas(id),
  tipo        text CHECK (tipo IN ('ingreso_honorario','ingreso_consulta','gasto_caso','reembolso_gasto','gasto_despacho')),
  categoria   text,                    -- 'aranceles','timbres','fotocopias','pasajes','peritaje','publicidad'...
  monto       numeric(12,2) NOT NULL,
  moneda      text DEFAULT 'BOB',
  tipo_cambio numeric(10,4) DEFAULT 1, -- a BOB
  metodo      text CHECK (metodo IN ('qr','transferencia','efectivo','tarjeta','exterior')),
  comprobante_doc_id uuid REFERENCES documentos(id),
  fecha       date NOT NULL DEFAULT current_date,
  canal_id    int REFERENCES canales(id)   -- gasto de marketing por canal (CAC)
);

CREATE TABLE facturas (                -- SIAT (doc 07)
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimiento_id uuid REFERENCES movimientos(id),
  nit_ci_cliente text, razon_social text,
  numero       bigint, cuf text, monto numeric(12,2),
  estado       text CHECK (estado IN ('emitida','anulada','pendiente')),
  emitida_en   timestamptz, pdf_doc_id uuid REFERENCES documentos(id)
);

-- ===================== SISTEMA =====================
CREATE TABLE auditoria (
  id bigserial PRIMARY KEY, usuario text, accion text, entidad text, entidad_id text,
  diff jsonb, ip inet, en timestamptz DEFAULT now()
);
```

> Las tablas `documentos`, `taxonomia`, `chunks`, `entidades`, `relaciones` están en [03](03_documentos_y_conocimiento.md); `workflows`, `workflow_pasos`, `caso_pasos` en [05](05_marco_de_trabajo.md).
> Orden real de creación: `canales → personas → clientes → taxonomia → documentos → workflows → casos → ...` (las FK circulares `oportunidades.caso_id` / `acuerdos.documento_id` se añaden con `ALTER TABLE` al final).

## 4. Embudo de ventas (pipeline)

Se amplía de 6 a 7 etapas para medir la consulta pagada (el principal punto de conversión del despacho: 200 Bs / 20 USD):

```
nuevo → contactado → consulta_agendada → consulta_realizada → propuesta_enviada → ganado
                                                                              ↘ perdido (motivo obligatorio)
```

| Etapa | Criterio de entrada | Automatización |
|---|---|---|
| nuevo | Lead de chat web, WhatsApp, formulario, alta manual | Crear persona (dedupe por teléfono) + oportunidad |
| contactado | Primera respuesta humana o bot calificó | WhatsApp: el bot mueve aquí tras calificar |
| consulta_agendada | Cita creada en `Appointments` vinculada | Booking web la crea con `oportunidad_id` |
| consulta_realizada | Cita marcada como atendida | Recordatorio a la abogada: "enviar propuesta" (48 h) |
| propuesta_enviada | Propuesta de honorarios generada desde plantilla | Seguimiento automático a los 3 y 7 días |
| ganado | Acuerdo de honorarios firmado / anticipo pagado | Crea `clientes` + `casos` + `acuerdos_honorarios` |
| perdido | Manual con `motivo_perdida` | Reactivación opcional a los 90 días |

## 5. Métricas del negocio (vistas SQL)

| KPI | Definición | Pregunta que responde |
|---|---|---|
| Conversión por etapa | % oportunidades que pasan de etapa i a i+1 | ¿Dónde se pierden clientes? |
| Conversión por canal | ganados / creados por `canal_id` | ¿Qué red social trae clientes reales? |
| CAC por canal | gasto marketing canal / clientes ganados canal | ¿Cuánto cuesta un cliente? |
| Ingreso por canal y por área | Σ ingresos de casos agrupado por `canal_origen` y `subpath(area_path,0,1)` | ¿Qué área y canal son más rentables? |
| Ticket promedio | honorario medio por área | Fijación de precios |
| Tiempo de cierre | mediana `cerrado_en - creado_en` de ganados | Velocidad comercial |
| Tiempo por etapa | desde `oportunidad_historial` | Cuellos de botella |
| Tasa de cobro | cobrado / pactado | Salud financiera |
| Cartera vencida | Σ cuotas vencidas no pagadas (aging 0-30/31-60/61-90/+90) | Riesgo de cobro |
| Rentabilidad del caso | honorarios cobrados − gastos no reembolsados | ¿Qué casos valen la pena? |
| Duración media del caso | por área y tipo de trámite | Expectativas al cliente y capacidad |
| Resultados | % favorable/conciliado por área | Marketing basado en evidencia (sin datos personales) |
| Carga activa | casos abiertos, plazos próximos 7 días | Capacidad de aceptar más casos |
| Motivos de pérdida | distribución `motivo_perdida` | Ajustar precio u oferta |
| Clientes recurrentes / referidos | clientes con >1 caso; oportunidades con canal "Referido cliente" | Fidelización |

Ejemplo:

```sql
CREATE VIEW v_embudo_canal AS
WITH ingresos_caso AS (
  SELECT caso_id, sum(monto * tipo_cambio) AS ingresos_bs
  FROM movimientos WHERE tipo LIKE 'ingreso%'
  GROUP BY caso_id
)
SELECT c.nombre AS canal,
       count(*)                                         AS oportunidades,
       count(*) FILTER (WHERE o.etapa = 'ganado')       AS ganadas,
       round(100.0 * count(*) FILTER (WHERE o.etapa='ganado') / nullif(count(*),0), 1) AS conversion_pct,
       coalesce(sum(m.ingresos_bs),0)                  AS ingresos_bs
FROM oportunidades o
JOIN canales c ON c.id = o.canal_id
LEFT JOIN ingresos_caso m ON m.caso_id = o.caso_id
GROUP BY c.nombre;
```

La vista presupone una sola oportunidad atribuida por caso; exigir esa regla o distribuir ingresos antes de sumar. Separar cohortes/períodos, reversiones y monedas. SQL de diseño pendiente de ejecución.

## 6. Control de conflictos de interés (obligatorio)

Al crear una oportunidad o caso, se busca cada nombre de contraparte en `personas` con similitud trigram ≥ 0.45 y por documento exacto:
- si la contraparte nueva es/fue **cliente** → bloqueo con alerta roja;
- si aparece como contraparte en otro caso → alerta amarilla informativa.
La decisión (aceptar/rechazar) queda en `auditoria`.

## 7. API (crm_api Lambda — todas con JWT Cognito)

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/admin/personas` | Búsqueda (`?q=`) / alta con dedupe |
| GET | `/api/admin/conflictos?nombre=&doc=` | Control de conflictos |
| GET/POST/PATCH | `/api/admin/oportunidades[/{id}]` | Embudo |
| POST | `/api/admin/oportunidades/{id}/ganar` | Transacción: cliente + caso + acuerdo |
| GET/POST/PATCH | `/api/admin/casos[/{id}]` | Casos |
| GET/POST | `/api/admin/casos/{id}/eventos` | Línea de tiempo |
| GET/POST/PATCH | `/api/admin/plazos` | Tareas y plazos (`?desde=&hasta=`) |
| GET/POST | `/api/admin/finanzas/movimientos` | Pagos y gastos |
| GET | `/api/admin/metricas/{vista}` | KPIs (lectura de vistas) |

## 8. Migración desde DynamoDB `ChatLeads`

| ChatLeads | Destino |
|---|---|
| `client_name`, `client_phone`, `client_email` | `personas` (teléfono normalizado E.164, dedupe) |
| `category` | `oportunidades.area_path` (tabla de mapeo, ver doc 03 §3) |
| `source` | `canales` |
| `stage` (`NUEVO`,`CONTACTADO`,`ASESORIA`,`PROPUESTA`,`GANADO`,`CERRADO`) | `nuevo`,`contactado`,`consulta_agendada`,`propuesta_enviada`,`ganado`,`perdido` |
| `deal_value` | `valor_estimado_bs` |
| `case_details`, `emotional_state`, `urgency` | `detalles_ia` (jsonb), `urgencia` |
| notas/bitácora | `interacciones` (autor `abogada`) |
| `lead_id` | `legacy_lead_id` |

Script idempotente `scripts/migrate_chatleads.py` (`uv run`), modo `--dry-run` que imprime el conteo y diferencias. `ChatLeads` queda en sólo lectura 30 días y luego se archiva a S3.
