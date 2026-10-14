# 05 — Capa 5: Marco de trabajo del caso (guía procedimental)

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Pantalla `/admin/casos/:id`. Una vez creado y explicado el caso, muestra **qué hacer, en qué orden, con qué documentos y en qué plazo**, basado en (a) procedimientos estandarizados de la abogada y (b) casos anteriores similares.

---

## 1. Dos fuentes de la guía

| Fuente | Qué es | Confiabilidad |
|---|---|---|
| **Workflows estándar** (`workflows`) | Procedimientos tipo definidos/validados por la abogada: p.ej. "Divorcio de mutuo acuerdo (Ley 603)", "Incremento de asistencia familiar", "Declaratoria de herederos notarial" | Alta — fuente principal |
| **Casos similares** | Casos cerrados con `area_path` cercano y embedding similar: qué pasos reales siguieron, cuánto duró, qué funcionó, qué no | Media — complementaria |
| **IA (Sonnet) + biblioteca** | Adapta el workflow al caso concreto y cita normas | Sugerencia — siempre revisada |

## 2. Modelo de datos

```sql
CREATE TABLE workflows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  area_path   ltree REFERENCES taxonomia(path),
  tipo_tramite text,
  descripcion text,
  version     int DEFAULT 1,
  activo      boolean DEFAULT true,
  origen      text CHECK (origen IN ('manual','derivado_de_caso','ia_aprobado')),
  duracion_estimada_dias int
);

CREATE TABLE workflow_pasos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid REFERENCES workflows(id) ON DELETE CASCADE,
  orden           int NOT NULL,
  fase            text,               -- 'Preparación','Demanda','Citación','Audiencia','Sentencia','Ejecución'
  titulo          text NOT NULL,      -- "Presentar demanda de divorcio"
  instrucciones   text,               -- markdown: cómo hacerlo, tips de juzgado
  base_legal      text,               -- "Ley 603 arts. 205-210"
  plantilla_ids   uuid[],             -- documentos (colección plantilla) a generar
  docs_requeridos text[],             -- "Certificado de matrimonio", "Certificados de nacimiento de hijos"
  plazo_dias      int,                -- plazo procesal disparado por el paso anterior
  plazo_habiles   boolean DEFAULT true,
  plazo_desde     text,               -- 'notificacion','audiencia','paso_anterior'
  depende_de      int[],              -- órdenes previos requeridos
  es_hito_cobro   boolean DEFAULT false  -- dispara cuota de honorarios (doc 02 cuotas)
);

CREATE TABLE caso_pasos (             -- instancia del workflow en un caso
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id       uuid REFERENCES casos(id) ON DELETE CASCADE,
  workflow_paso_id uuid REFERENCES workflow_pasos(id),   -- null si es paso ad-hoc
  orden         int, titulo text, instrucciones text,
  estado        text DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_curso','hecho','omitido','bloqueado')),
  fecha_objetivo date, completado_en timestamptz,
  nota_resultado text                 -- qué pasó realmente → alimenta "lecciones"
);
```

## 3. Layout de la pantalla

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ CAS-2026-0042 · Incremento de asistencia familiar · Cliente: M. López   [en_tramite]│
│ Juzgado Público de Familia 3° Cbba · NUREJ 30xxxxx · Próximo plazo: 12/10 (3 días) ⚠ │
├───────────────────────────┬──────────────────────────────────┬───────────────────────┤
│ GUÍA (workflow)           │ DETALLE DEL PASO ACTUAL          │ CONTEXTO              │
│ ✔ 1 Entrevista y docs     │ 4. Presentar demanda             │ Resumen del caso (IA) │
│ ✔ 2 Contrato honorarios   │ Base legal: Ley 603 art. ...     │ Partes                │
│ ✔ 3 Redactar demanda      │ Instrucciones (markdown)         │ Finanzas: pagado 60 % │
│ ▶ 4 Presentar demanda     │ Documentos: [Generar memorial ▸] │ Casos similares (3)   │
│ ○ 5 Citación demandado    │ Checklist docs del cliente       │  · CAS-2025-0017 ✔    │
│ ○ 6 Audiencia             │ [Marcar hecho] → crea plazo sig. │   duró 94 días        │
│ ○ 7 Sentencia             │ Nota de resultado                │ Normas clave (RAG)    │
│ + Paso ad-hoc             │                                  │ Pregunta a la IA 💬   │
├───────────────────────────┴──────────────────────────────────┴───────────────────────┤
│ LÍNEA DE TIEMPO (eventos_caso)  ·  DOCUMENTOS  ·  COMUNICACIONES (WhatsApp)           │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

## 4. Generación de la guía (al abrir un caso sin workflow)

1. **Candidatos**: workflows activos con `area_path` igual o ancestro del caso (`casos.area_path <@ workflows.area_path`).
2. **Casos similares**: top-5 por `embedding` del caso (descripción + hechos) filtrando misma rama, sólo `cerrado` con `resultado` conocido.
3. **Sonnet** recibe: relato estructurado, workflow candidato, pasos reales y notas de los casos similares, chunks de normas relevantes (RAG). Devuelve una guía adaptada (JSON de pasos) **marcando qué viene del estándar, qué de casos previos y qué es nuevo**, con citas.
4. La abogada acepta / edita / reordena → se instancia en `caso_pasos`.
5. Si no hay workflow estándar para la rama → la guía generada puede guardarse como **nuevo workflow** (`origen = 'ia_aprobado'`) tras su aprobación.

## 5. Ciclo de aprendizaje (base de conocimiento viva)

Al cerrar un caso:
- Formulario corto: "¿Qué funcionó?", "¿Qué no repetirías?", "Tip del juzgado" (+ dictado).
- Haiku genera una **lección anonimizada** (sin nombres, CI, ni datos de menores) → `documentos` colección `conocimiento` en la rama del caso, para revisión.
- Pasos ad-hoc repetidos en ≥ 2 casos de la misma rama → sugerencia "¿Agregar al workflow estándar?" (nueva `version`).
- Duraciones reales actualizan `workflows.duracion_estimada_dias` (mediana).

## 6. Workflows semilla (a redactar con la abogada en Fase 5)

| # | Workflow | Rama |
|---|---|---|
| 1 | Divorcio de mutuo acuerdo | familia.divorcio.mutuo_acuerdo |
| 2 | Divorcio unilateral | familia.divorcio.unilateral |
| 3 | Fijación de asistencia familiar | familia.asistencia_familiar.fijacion |
| 4 | Incremento de asistencia familiar | familia.asistencia_familiar.incremento |
| 5 | Cobro de asistencia devengada / apremio | familia.asistencia_familiar.apremio |
| 6 | Guarda y custodia | familia.guarda_custodia |
| 7 | Autorización de viaje de menor | ninez_adolescencia.autorizacion_viaje |
| 8 | Declaratoria de herederos | civil.sucesiones.declaratoria_herederos |
| 9 | Poder para residente en EEUU (apostilla) | internacional_eeuu.poderes_exterior |
| 10 | Consulta / asesoría puntual | (genérico) |

> Los pasos, plazos y bases legales de cada workflow los **define y valida la abogada**; el sistema no inventa plazos procesales.
