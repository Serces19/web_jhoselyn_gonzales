# Documentación del proyecto

**Fuente única de documentación: `docs/`.** Las specs tienen una sola copia en `docs/specs/despacho-digital-coste-minimo/`. E0 está en implementación: [avance y evidencia](operations/e0-progress.md), [inventario AWS real](operations/baseline.md) y [rollout/rollback](operations/deploy-rollback.md). No se desplegó todavía el nuevo backend/frontend.

## Qué leer según la necesidad

| Necesidad | Documento canónico |
|---|---|
| Conocer código/operación existentes | [current-state.md](current-state.md) |
| Revisar implementación E0 y requisitos de rollout | [operations/e0-progress.md](operations/e0-progress.md) |
| Revisar inventario AWS real y costos de cuenta | [operations/baseline.md](operations/baseline.md) |
| Coordinar despliegue y recuperación | [operations/deploy-rollback.md](operations/deploy-rollback.md) |
| Entender dolores y alcance: 77 criterios EARS | [requirements.md](specs/despacho-digital-coste-minimo/requirements.md) |
| Implementar arquitectura, datos y contratos | [design.md](specs/despacho-digital-coste-minimo/design.md) |
| Ejecutar/ver estado de trabajo: T01–T36 | [tasks.md](specs/despacho-digital-coste-minimo/tasks.md) |
| Entender costos, cuotas y decisiones económicas | [cost-model.md](specs/despacho-digital-coste-minimo/cost-model.md) |
| Comprobar auditoría → requisito → tarea → evidencia | [traceability.md](specs/despacho-digital-coste-minimo/traceability.md) |
| Ver entregas generales | [global_tasks.md](global_tasks.md) |
| Consultar propuestas aún no comprometidas | [ideas_creativas.md](ideas_creativas.md) |
| Consultar hallazgos y pruebas realizadas | [audits/](audits/README.md) |
| Entender propuestas anteriores sustituidas | [archive/](archive/README.md) |
| Mantener documentación sin duplicarla | [documentation-policy.md](documentation-policy.md) |

## Estructura

```text
docs/
  README.md                 Índice único
  documentation-policy.md   Responsabilidad y mantenimiento de cada documento
  current-state.md          Sistema existente, comandos y limitaciones
  global_tasks.md           Vista de entregas; enlaza a la única checklist
  ideas_creativas.md        Ideas organizadas
  specs/despacho-digital-coste-minimo/
    requirements.md         Dolores y comportamientos requeridos
    design.md               Arquitectura objetivo y ADR
    tasks.md                Única checklist de implementación
    cost-model.md           Costos y controles de consumo
    traceability.md         Cobertura y propiedades verificables
  audits/                   Evidencia fechada
  archive/                  Histórico sin autoridad para implementar
```

## Decisiones vigentes

Núcleo: React/Vite + API Gateway + Cognito + Lambda por eventos + DynamoDB on-demand + S3 privado. CRM, agenda, finanzas, documentos y procedimientos funcionan sin IA. Automatización WhatsApp y RAG se activan por fase, evidencia y presupuesto. Aurora/Neptune/OpenSearch no son dependencias del núcleo.

Minimizar costo fijo no garantiza factura cero: archivos, versiones, backups, dominio y consumo siguen generando cargos según configuración. El rango histórico USD 65–135/mes no es el presupuesto actual.

La separación es por propósito: estado existente, objetivo requerido, tareas y evidencia. Ningún archivo del histórico decide la arquitectura actual. Un requisito se define en requirements, un ADR en design y el estado de tareas sólo en tasks. Los demás documentos enlazan esos IDs.

## Entregas

E0: cerrar seguridad/integridad y establecer recuperación/costos. E1: CRM, alta, agenda, dinero y métricas. E2: biblioteca/plantillas/procedimientos. E3: recordatorios y automatización selectiva. E4: WhatsApp API/RAG bajo decisión económica. Dependencias y criterios exactos: [tasks.md](specs/despacho-digital-coste-minimo/tasks.md).

La auditoría y las specs no han desplegado módulos nuevos. Siguen pendientes inventario/factura AWS, contenido real, reglas jurídicas, retención, SIAT, licencias y condiciones Meta. Esos datos no se sustituyen por ejemplos ficticios.
