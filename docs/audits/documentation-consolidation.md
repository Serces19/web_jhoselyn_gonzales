# Consolidación documental

Motivo: el usuario detectó dos árboles (`.kiro/specs/` y `docs/`) y riesgo de redundancia/contradicciones. Se consolidó el detalle documental en `docs/`, manteniendo el README raíz como entrada breve al repositorio.

## Cambios

- Specs movidas a `docs/specs/despacho-digital-coste-minimo/`, conservando requirements/design/tasks y documentos de costos/trazabilidad.
- Planes anteriores 00–10, roadmap anterior y README genérico de frontend conservados en `docs/archive/` con aviso histórico.
- Auditoría y evidencia local movidas a `docs/audits/`.
- Roadmap e ideas movidos a `docs/`; roadmap actual enlaza a tasks y no repite tareas activas A2/F0–F8.
- Referencia de código/operación existente extraída a `docs/current-state.md`. Modelo Bedrock de su bloque de entorno corregido para coincidir con el Terraform local; comando apply ya no recomienda auto-approve.
- Índice y política documental explican fuentes únicas, estado actual/objetivo y tratamiento del histórico.
- Enlaces relativos recalculados según el origen y destino de cada archivo. Se retiró la carpeta `.kiro/` únicamente tras quedar vacía; no hay segunda copia de las specs.

## Contradicciones resueltas en el plan activo

Aurora/SQL/GraphRAG y F0–F8 se conservan como contexto histórico; el plan vigente usa DynamoDB y T01–T36. El costo USD 65–135 no es presupuesto vigente. La auditoría mantiene evidencia y distingue decisiones pendientes en su fecha de las decisiones adoptadas después. Implementación nueva sigue pendiente.

## Verificación

Verificados 29 archivos Markdown sin enlaces locales rotos; 77 criterios EARS únicos con cobertura completa en 36 tareas canónicas. Se comprobó una sola copia de cada spec, ausencia de `.kiro/`, ubicación de roadmap/ideas en docs, marcado histórico y ausencia de una segunda checklist en el roadmap. `git diff --check` terminó sin errores. Los scripts temporales se retiraron. No se ejecutaron pruebas de aplicación porque no hubo cambios de código/IaC. El estado desplegado AWS no fue consultado.
