# Roadmap del proyecto

## Fuente única de estado

La checklist activa está exclusivamente en [specs/tasks.md](specs/despacho-digital-coste-minimo/tasks.md). Este archivo es el mapa de entregas y dependencias; no duplica sus checkboxes. Requisitos/arquitectura y evidencia se consultan desde el [índice](README.md).

| Entrega | Tareas | Resultado | Estado |
|---|---|---|---|
| E0 | T01–T11 | Acceso, integridad, recuperación, cuotas y control de release | Backend/frontend publicados, agenda/staging/recuperación probados. TOTP OPTIONAL, IA apagada, controles locales sin Actions. Aviso USD 20 configurado, SNS/prueba recibidos; contenido aprobado operativamente y aviso de datos publicado. Criterios jurídicos de expedientes pendientes antes del piloto |
| E1 | T12–T20 | Modelo DynamoDB, CRM, intake, agenda, dinero, KPIs y piloto | Pendiente |
| E2 | T21–T26 | Documentos privados, cuarentena, biblioteca, plantillas y exportación | Pendiente |
| E3 | T27–T30 | Recordatorios, reglas verificadas, IA/OCR opcionales y métricas | Pendiente |
| E4 | T31–T36 | Decisión WhatsApp, integración, handoff, corpus, RAG y cierre | Pendiente de implementación y decisiones de activación |

## Trabajo documental realizado

Se completaron auditoría local, preparación de specs y consolidación documental. Estas entregas no cierran hallazgos de aplicación ni marcan módulos implementados. Resultados técnicos anteriores en [audits/](audits/README.md); validación de la consolidación en [documentation-consolidation.md](audits/documentation-consolidation.md).

## Relación con planes anteriores

La [matriz](specs/despacho-digital-coste-minimo/traceability.md) mapea A2 a T01–T36. Aurora del antiguo F2/A2-09 fue sustituida por patrones DynamoDB T12; endurecimiento se adelanta a E0/primera entrega con datos. F0–F8 y checklists anteriores permanecen únicamente en [archivo histórico](archive/global_tasks_previous.md).

No hay fecha final comprometida. Umbral mensual de aviso de infraestructura aprobado: USD 20; no es tope de factura ni cuota de IA. Actualizar tasks con evidencia; costo fijo mínimo sigue vigente. E1 puede avanzar en desarrollo aislado; calendario de conservación y obligaciones del despacho se resuelven antes del piloto con expedientes.
