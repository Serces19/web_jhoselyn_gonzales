# Organización y fuente única de documentación

## Dónde empezar

[README.md](README.md) es el índice de toda la documentación. El README de la raíz contiene contexto breve, comandos y un enlace a este índice. Todo el detalle de producto, arquitectura, auditoría y planificación reside en `docs/`.

## Responsabilidad de cada archivo

| Tipo de información | Fuente única | Regla |
|---|---|---|
| Funciones y código existentes | [current-state.md](current-state.md) | Describir evidencia actual; distinguir lo que no se verificó en AWS |
| Dolores y comportamientos requeridos | [requirements.md](specs/despacho-digital-coste-minimo/requirements.md) | Los IDs Rxx.y y criterios sólo se definen aquí |
| Arquitectura objetivo y decisiones | [design.md](specs/despacho-digital-coste-minimo/design.md) | Los ADR LC-xx y contratos sólo se definen aquí |
| Tareas y estado de implementación | [tasks.md](specs/despacho-digital-coste-minimo/tasks.md) | Única checklist activa T01–T36 |
| Supuestos/tarifas y controles económicos | [cost-model.md](specs/despacho-digital-coste-minimo/cost-model.md) | Una estimación no es factura ni presupuesto aprobado |
| Relación entre requisitos y verificación | [traceability.md](specs/despacho-digital-coste-minimo/traceability.md) | Referenciar IDs; no copiar requisitos/tareas completos |
| Orden general de entregas | [global_tasks.md](global_tasks.md) | Vista de fases con enlaces; no duplicar checkboxes de tasks |
| Ideas no comprometidas | [ideas_creativas.md](ideas_creativas.md) | No son requisitos hasta incorporarse a las specs |
| Hallazgos y resultados observados | [audits/](audits/README.md) | Evidencia fechada; auditoría no equivale a decisión arquitectónica vigente |
| Planes y material anteriores | [archive/](archive/README.md) | Históricos, sin autoridad para implementar |

## Cómo evitar contradicciones

El estado actual y el objetivo pueden diferir: DynamoDB del sistema existente se describe en current-state, su modelo futuro en design. Eso no significa que el modelo nuevo esté implementado. Toda función nueva conserva estado pendiente hasta tener evidencia.

Arquitectura vigente: DynamoDB on-demand, Lambda por eventos, S3 privado; núcleo sin Aurora/Neptune/OpenSearch. IA/OCR/WhatsApp API/RAG se activan por fases y costo. El rango histórico USD 65–135/mes no es presupuesto del plan actual. SSE-S3 y claves propiedad AWS son la configuración inicial de cifrado; las CMK dedicadas necesitan una decisión justificada.

Ante una diferencia dentro de documentos vigentes, corregir primero la fuente de la tabla anterior y actualizar sus referencias en la misma tarea. No escribir una segunda propuesta con frases de precedencia para dejar dos planes activos. Un cambio de decisión se registra en el ADR correspondiente con motivo y fecha.

Las instrucciones humanas vigentes prevalecen. Los documentos de archive son consultables para entender contexto, no para elegir recursos, ejecutar SQL o reactivar tareas descartadas.

## Cambio y mantenimiento

1. Editar el requisito o ADR canónico afectado.
2. Actualizar tareas y trazabilidad por IDs; mantener una sola checklist.
3. Actualizar current-state sólo cuando cambie la implementación, y anotar la evidencia/limitación de despliegue.
4. Actualizar el índice si se añade una nueva área y verificar enlaces relativos tras movimientos.
5. Archivar decisiones sustituidas cuando sea necesario conservar contexto; no copiar specs activas en `.kiro/` ni mantener sincronización manual entre dos árboles.

El formato `requirements.md`, `design.md`, `tasks.md` sigue el estilo de specs solicitado. Su ubicación en `docs/specs/` responde a la preferencia de una carpeta documental única; no se afirma descubrimiento automático por Kiro en `.kiro/specs/`.
