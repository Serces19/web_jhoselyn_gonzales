# 03 — Capa 3: Documentos, plantillas, base de conocimiento y biblioteca legal

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Objetivo: que la abogada encuentre cualquier documento **navegando un árbol de ramas** o **preguntando en lenguaje natural**, con respuestas citadas a la fuente.
> Revisión 2026-10-13: [segunda auditoría](../audits/11_segunda_auditoria_2026-10-13.md) corrige DDL, dedupe, ACL y vigencia. Empezar por biblioteca privada y búsqueda textual; RAG/grafo requieren evaluación y corpus autorizado. SQL conceptual: resolver FK antes de migrar y mantener tsv transaccionalmente por aplicación/trigger.
> Tecnología: S3 (archivos) + PostgreSQL (`ltree` árbol, `pgvector` vectores, `tsvector` texto, grafo ligero) + Bedrock (embeddings, clasificación, respuesta). Ver ADR-02 en [00](00_vision_y_arquitectura.md).

---

## 1. Las 4 colecciones

| Colección | Contenido | Origen | Confidencialidad | Uso principal |
|---|---|---|---|---|
| **C1 Casos** | Demandas, memoriales, resoluciones, notificaciones, pruebas, contratos firmados, CI escaneados | Subidos por la abogada / cliente / adjuntos WhatsApp | **Secreto profesional** — máxima | Expediente digital del caso |
| **C2 Plantillas** | Contratos (honorarios, compraventa, alquiler), cartas, poderes, memoriales tipo, propuestas | Creadas por la abogada (DOCX con variables) | Interna | Generar documentos en segundos |
| **C3 Conocimiento propio** | Esquemas de procedimientos que funcionaron, aprendizajes, workflows, metodologías, checklists, "trucos" de juzgados | Notas de la abogada + extraído de casos cerrados (anonimizado) | Interna | Guía del marco de trabajo (doc 05) |
| **C4 Normativa pública** | CPE, códigos, leyes, decretos, reglamentos departamentales y municipales, jurisprudencia (TCP, TSJ), doctrina/libros | Fuentes oficiales (§5) + libros que ella posee | Pública (libros: licencia propia) | Fundamentar escritos, RAG |

## 2. Almacenamiento en S3

Bucket único `jg-despacho-docs-<account>` — SSE-KMS (CMK propia), versioning, Block Public Access, acceso sólo por URL prefirmada (15 min).

```
s3://jg-despacho-docs/
├── casos/{caso_codigo}/{subcarpeta}/{documento_id}_{slug}.{ext}
│        subcarpetas: 01_cliente · 02_escritos · 03_resoluciones · 04_pruebas · 05_contratos · 06_comunicaciones
├── plantillas/{area_path}/{plantilla_id}_v{n}.docx
├── conocimiento/{area_path}/{doc_id}.md
├── normativa/{jerarquia}/{norma_id}.pdf          # original
├── normativa_txt/{norma_id}.json                  # texto extraído y segmentado por artículo
└── _ingesta/entrada/                              # zona de aterrizaje → dispara pipeline
```

Lifecycle: casos `archivado` > 2 años → S3 Glacier Instant Retrieval. Nunca borrado automático (conservación del expediente; ver doc 08).

## 3. Taxonomía (el árbol)

Una sola tabla de árbol con `ltree`; **todas** las colecciones cuelgan del mismo árbol de materias, así al abrir una rama se ven juntos sus casos, plantillas, conocimiento y normas.

```sql
CREATE TABLE taxonomia (
  path        ltree PRIMARY KEY,          -- familia.divorcio.unilateral
  etiqueta    text NOT NULL,              -- "Divorcio unilateral"
  descripcion text,
  orden       int DEFAULT 0
);
CREATE INDEX taxonomia_gist ON taxonomia USING gist (path);
-- Todo lo que cuelga de Familia:  WHERE area_path <@ 'familia'
```

Árbol inicial (alineado a las áreas actuales de la web; la abogada lo ajusta en el panel):

```
familia
├── divorcio (mutuo_acuerdo · unilateral · desvinculacion_union_libre)
├── asistencia_familiar (fijacion · incremento · cobro_devengados · apremio)
├── guarda_custodia · regimen_visitas · autoridad_parental
├── filiacion (reconocimiento · impugnacion)
├── adopcion
└── violencia_familiar (medidas_proteccion_ley_348)
ninez_adolescencia (ley_548 · autorizacion_viaje · restitucion_internacional)
civil
├── contratos (compraventa · anticresis · alquiler · prestamo)
├── sucesiones (declaratoria_herederos · testamentos · division_particion)
├── derechos_reales (usucapion · reivindicacion · mejor_derecho_propietario)
└── obligaciones (cobro · danos_perjuicios)
internacional_eeuu (poderes_exterior · apostilla · tramites_consulares)
constitucional (accion_libertad · accion_amparo · proteccion_privacidad)
administrativo
pro_bono
```

Las colecciones son una segunda dimensión (filtro), no ramas: en la UI, el árbol a la izquierda y pestañas **Casos | Plantillas | Conocimiento | Normativa** arriba. La normativa además tiene su propio árbol por **jerarquía normativa** (Kelsen boliviano, art. 410 CPE):

```
normativa
├── constitucion (cpe_2009)
├── tratados (cdn · cedaw · convencion_americana · la_haya_1980_sustraccion)
├── leyes (codigos: ley_603_familias · ley_439_procesal_civil · codigo_civil · ley_548 · ley_348 · ...)
├── decretos_supremos
├── departamental (cochabamba)
├── municipal (cochabamba · quillacollo · sacaba)
├── jurisprudencia (tcp · tsj · tribunal_departamental_cbba)
└── doctrina (libros · articulos)
```

## 4. Modelo de datos documental

```sql
CREATE TABLE documentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coleccion     text NOT NULL CHECK (coleccion IN ('caso','plantilla','conocimiento','normativa')),
  titulo        text NOT NULL,
  area_path     ltree REFERENCES taxonomia(path),
  norma_path    ltree,                  -- sólo normativa: normativa.leyes.ley_603
  caso_id       uuid REFERENCES casos(id),
  tipo_doc      text,                   -- memorial, resolucion, contrato, poder, carta, ley, sentencia_constitucional...
  s3_key        text NOT NULL,
  mime          text, paginas int, sha256 text,          -- checksum; vínculos/ACL separados del blob
  version       int DEFAULT 1,
  fuente_url    text, fecha_doc date, vigente boolean DEFAULT true,
  metadatos     jsonb,                  -- número de ley, sala, magistrado, NUREJ, variables de plantilla...
  estado_ingesta text DEFAULT 'pendiente' CHECK (estado_ingesta IN ('pendiente','ocr','clasificado','indexado','error','revisar')),
  clasif_confianza real,
  subido_por    text, creado_en timestamptz DEFAULT now()
);

CREATE TABLE chunks (
  id          bigserial PRIMARY KEY,
  documento_id uuid REFERENCES documentos(id) ON DELETE CASCADE,
  orden       int,
  unidad      text,                     -- 'articulo 12', 'considerando III.2', 'paso 4', 'pagina 3'
  texto       text NOT NULL,
  contexto    text,                     -- resumen contextual (contextual retrieval) antepuesto al embedding
  tsv         tsvector,               -- mantener por aplicación/trigger; unaccent STABLE no sirve en GENERATED
  embedding   vector(1024),
  area_path   ltree, coleccion text     -- desnormalizado para filtrar rápido
);
CREATE INDEX chunks_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX chunks_tsv  ON chunks USING gin (tsv);
CREATE INDEX chunks_area ON chunks USING gist (area_path);

-- Grafo ligero (GraphRAG-lite)
CREATE TABLE entidades (
  id    bigserial PRIMARY KEY,
  tipo  text CHECK (tipo IN ('norma','articulo','sentencia','instituto_juridico','organo','caso','procedimiento')),
  clave text UNIQUE,                    -- 'ley_603:art_210', 'SCP_0123/2024-S2', 'instituto:asistencia_familiar'
  nombre text, documento_id uuid REFERENCES documentos(id)
);
CREATE TABLE relaciones (
  origen  bigint REFERENCES entidades(id),
  destino bigint REFERENCES entidades(id),
  tipo    text CHECK (tipo IN ('cita','modifica','deroga','reglamenta','interpreta','aplica_en','trata_sobre','precedente_de')),
  peso    real DEFAULT 1,
  PRIMARY KEY (origen, destino, tipo)
);
```

**Plantillas:** DOCX con variables Jinja (`{{ cliente.nombres }}`, `{{ caso.juzgado }}`, `{{ hoy | fecha_larga }}`). Metadatos en `documentos.metadatos.variables`. Generación con `docxtpl` en Lambda → se guarda el resultado en `casos/{codigo}/02_escritos/` y se registra en `eventos_caso`.

## 5. Fuentes para poblar la normativa pública (Bolivia)

| Fuente | Contenido | Método de obtención | Notas |
|---|---|---|---|
| Gaceta Oficial del Estado Plurinacional (`gacetaoficialdebolivia.gob.bo`) | Leyes, decretos supremos — fuente oficial | Descarga de PDFs + crawl mensual de novedades (EventBridge) | Fuente de verdad para vigencia |
| Tribunal Constitucional Plurinacional (`tcpbolivia.bo`) | Sentencias constitucionales (SCP), sistematizaciones de jurisprudencia relevante | Buscador de jurisprudencia + PDFs publicados | Priorizar líneas jurisprudenciales en familia/niñez |
| Tribunal Supremo de Justicia (`tsj.bo`) | Autos supremos, revistas jurisprudenciales | PDFs de revistas + buscador | |
| Lexivox (`lexivox.org`) | Normas bolivianas en HTML estructurado por artículo | Descarga HTML (verificar términos de uso/licencia antes de automatizar) | Facilita el chunking por artículo |
| Asamblea Legislativa / Gob. Departamental Cochabamba / GAM Cochabamba | Leyes departamentales y municipales | Descarga manual inicial | Bajo volumen |
| Libros y doctrina | Biblioteca personal de la abogada | Sólo ejemplares que ella posee; uso interno, nunca expuestos al chat público | Derechos de autor |
| Sus propios casos cerrados | Conocimiento C3 | Pipeline de "lecciones" (§7) | Anonimizar |

Reglas de scraping: respetar `robots.txt` y términos, 1 req/s, user-agent identificado, cachear y no re-descargar (dedupe por `sha256`). Arranque recomendado: **núcleo de ~40 normas** que usa a diario (CPE, Ley 603, Ley 439, Código Civil, Ley 548, Ley 348, Ley 1173, Ley 387 del Ejercicio de la Abogacía, Ley 025 Órgano Judicial, Código Procesal Constitucional…) + jurisprudencia de familia del TCP. Crecer por demanda.

## 6. Pipeline de ingesta y clasificación

```
Subida (panel / WhatsApp / crawler) → S3 _ingesta/entrada/ → EventBridge → Step Functions:

 1. Validar      tipo MIME, tamaño ≤ 50 MB, antivirus (ClamAV layer o GuardDuty Malware Protection for S3)
 2. Dedupe       sha256 → si existe, enlazar y terminar
 3. Extraer      PDF con texto → pypdf | escaneado/imagen → Textract (async) | DOCX → python-docx
 4. Clasificar   Claude Haiku con salida JSON estructurada:
                 {coleccion, area_path (de la lista cerrada del árbol), tipo_doc, titulo, fecha_doc,
                  metadatos{nurej, juzgado, numero_norma, partes...}, confianza}
                 confianza < 0.75 → estado 'revisar' (bandeja "Por clasificar" en el panel)
 5. Segmentar    normativa: por artículo | sentencias: por secciones (antecedentes, fundamentos, por tanto)
                 casos/conocimiento: ~800 tokens con solape 15 %
 6. Contexto     1-2 frases por chunk ("Ley 603, Libro II, Cap. asistencia familiar…") — contextual retrieval
 7. Embeddings   Bedrock (batch)
 8. Grafo        extracción de citas con regex + LLM: "art. 210 de la Ley 603", "SCP 0123/2024-S2"
                 → entidades + relaciones 'cita' / 'interpreta'
 9. Mover        a la ruta definitiva de S3, estado 'indexado', evento en el caso si aplica
```

Costo dominante: Textract (sólo escaneados) y embeddings; el corpus inicial cabe holgado en Aurora.

## 7. Recuperación (RAG híbrido + grafo)

Consulta del usuario (panel "Pregúntale a la biblioteca" o el marco de trabajo):

1. **Reescritura**: Haiku extrae filtros (`area_path`, colección, rango de fechas, norma citada).
2. **Búsqueda híbrida**: top-40 por `tsvector` + top-40 por `pgvector`, fusión **RRF**, filtro `area_path <@` y `coleccion`.
3. **Expansión por grafo** (1-2 saltos): artículos citados → sentencias que los interpretan → casos propios que los usaron.
4. **Re-ranking** (Bedrock rerank o Haiku) → top-8.
5. **Respuesta** con Sonnet: **toda afirmación con cita** `[Ley 603, art. 210]` enlazada al documento; si no hay respaldo → "no encontrado en la biblioteca".
6. **Vigencia**: marcar en rojo si la norma está `vigente = false` o tiene relación `deroga`/`modifica`.

Aislamiento: el chat público (web/WhatsApp) **sólo** puede consultar `coleccion = 'normativa'` (sin libros) y `bufete_knowledge`; jamás C1/C3.

### Evaluación
Set de 50 preguntas reales de la abogada con respuesta esperada → medir recall@8 y fidelidad de citas antes y después de cada cambio (embeddings, chunking). Objetivo: recall@8 ≥ 0.85, 0 citas inventadas.

## 8. UI de la Biblioteca

- Panel izquierdo: árbol (`taxonomia`) con contador por rama; arrastrar documento a rama = reclasificar.
- Pestañas por colección; vista lista/tarjetas; previsualización PDF en panel derecho.
- Barra de búsqueda única: texto → resultados híbridos; pregunta → respuesta RAG con citas.
- Bandeja **"Por clasificar"** con la sugerencia de la IA para aprobar con un clic.
- En plantillas: botón **"Usar en caso…"** → formulario de variables precargado con datos del caso → DOCX.
