# Cost model — Costo fijo mínimo y consumo controlado

Actualización: 2026-10-14. Factura del proyecto aún sin atribución completa. Los USD 65–135 del plan anterior no son presupuesto vigente ni factura proyectada. Usuario aprobó aviso mensual USD 20 y prioriza minimizar costos fijos; no es un límite automático de factura.

## Decisiones por recurso

| Componente | Base de cobro / reposo | Configuración propuesta |
|---|---|---|
| Amplify estático existente | Builds, almacenamiento y tráfico; puede haber costo residual de hosting/dominio | Conservar, reducir builds innecesarios, imágenes/bundle; no migrar por céntimos sin medir |
| API Gateway HTTP API | Requests/tráfico | Rutas explícitas, límites y payload acotado |
| Lambda | Requests, duración/memoria/almacenamiento temporal aplicable | Sin provisioned concurrency ni VPC/NAT; sin polling frecuente por usuario |
| DynamoDB on-demand | Lecturas/escrituras, índices, storage y PITR | Sin capacidad provisionada; índices mínimos y paginación |
| S3 | GB-mes, versiones, requests y transferencia | SSE-S3 privado, versioning; lifecycle aprobado, nunca asumir archivo gratuito |
| Cognito | Plan/usuarios activos y funciones utilizadas | Reutilizar pool y TOTP; revisar tier real, no repetir «50,000 gratis» como garantía |
| SQS/Streams/Scheduler | Operaciones/eventos y consumo asociado | Pocas colas, lotes acotados, DLQ y nada de reintentos infinitos |
| CloudWatch/avisos | Logs, métricas, alarmas y envíos | Retención acotada, sin prompts/PII, sólo alarmas útiles |
| Secrets / claves | Según servicio, clave y requests | Sin credenciales BD; SSM estándar SecureString con clave AWS cuando aplique; Secrets Manager sólo si rotación/servicio lo necesita |
| Dominio/DNS | Renovación y posible zona hospedada | Inventariar costo anual y mensualizarlo; no llamarlo cero |
| Antivirus | Worker por archivo + firmas/registro imagen | Medir contenedor Lambda y fallo cerrado; alternativa requiere ADR de costo |
| Bedrock/OCR | Tokens/páginas/rerank/embeddings según modelo/API | Apagado para nuevas funciones hasta cuota/tarifa; extracción textual sin modelo |
| WhatsApp | Meta + proveedor + backend/medios | Manual en E0–E3; comparar directo/EUM antes de E4 |
| RAG | Ingesta, almacenamiento/consulta, generación | Sin vector store en MVP; benchmark antes de añadir |

No provisionar por defecto: Aurora, RDS, Neptune, OpenSearch, Redis, NAT, ALB, EC2, Fargate persistente, VPN gestionada, Bedrock provisionado, KMS CMK por bucket o SaaS mensual. Un recurso serverless puede tener mínimo facturable; verificar SKU, no inferir gratuidad del nombre.

## Fórmula y entradas reales

```text
C_mes = C_fijo + C_almacenamiento_versiones + C_backups
      + C_API_Lambda_Dynamo_indices + C_jobs_notificaciones
      + C_logs_monitorizacion + C_transferencia
      + C_IA_OCR + C_WhatsApp + C_busqueda_opcional
```

Registrar por servicio: región, SKU/plan, moneda, tarifa y fecha efectiva, cantidad medida, crédito/descuento separado, impuesto si aplica y fuente. No restar Free Tier de la estimación base salvo elegibilidad comprobada; mostrar costo bruto y neto por separado. Costo de desarrollo/mantenimiento/soporte no está incluido en factura AWS.

| Entrada | Cómo obtenerla | Si falta |
|---|---|---|
| Gasto mensual real | Billing/Cost Explorer agrupado por servicio y usage type | Mostrar desconocido; no inventar baseline |
| Requests/latencia | Métricas Gateway/Lambda y duración por operación | Medir piloto; no fijar tráfico supuesto como dato real |
| Tokens | usage de cada llamada con modelo/profile y operación | Reserva conservadora; reconciliar respuesta fallida/timeout |
| Páginas OCR | Inventario y clasificación textual/escaneado | No ejecutar lote sin contabilizar |
| Archivos/versiones/GB | Inventario S3 y metadatos | Presupuesto por lote y tamaño máximo |
| WA entrantes/salientes/destino | Eventos proveedor + categoría de mensaje | Mantener manual antes de presupuestar API |
| PITR/logs/exports | Métricas de storage y retención | Incluir explícitamente, no esconder en «otros» |

Escenarios a completar en T01: reposo con datos existentes, actividad real típica y pico observado/prueba acordada. Ningún escenario se representa como métricas del negocio. Comparar ahorro de factura contra horas adicionales de mantenimiento.

## Medición E1

[Benchmark de staging](../../operations/e1-benchmark.json) y [contratos/latencia](../../operations/e1-staging-verification.json). El costo técnico transaccional se distingue del costo de operación completa y de la factura. Catálogo AWS Pricing GetProducts consultado el 2026-10-14 para Standard on-demand us-east-1: USD 0.000000625/WRU y USD 0.000000125/RRU. Transacciones ya reportan sus unidades consumidas: no volver a multiplicarlas por dos. No restar créditos/elegibilidad desconocida. [Modelo de cobro oficial](https://aws.amazon.com/dynamodb/pricing/).

E1 agrega dos alarmas DLQ estándar de una métrica: base bruta USD 0.20/mes si se mantienen todo el mes, antes de Free Tier/créditos; staging fue retirado y se prorratea. [Tarifa CloudWatch](https://aws.amazon.com/cloudwatch/pricing/). Core, índices, PITR, almacenamiento, colas/logs/eventos y Lambda siguen por uso; no hay base reservada ni concurrencia provisionada. Usuario autorizó y se aplicaron 26 recursos E1 productivos para sólo lectura; el aviso general USD 20 permanece y no garantiza un tope de factura.

## Controles de gasto

Decisión del usuario, 2026-10-14: **aviso mensual USD 20 para infraestructura del proyecto**. AWS Budgets por etiqueta Project=jhoselyn-despacho; avisos reales 80%/100% y pronóstico 100%, sin acciones/cortes. No sustituye factura ni fija cuota de IA: ésta permanece apagada. Control de release local sin GitHub Actions. Configuración y límites de atribución: [checks-and-alerts.md](../../operations/checks-and-alerts.md).

1. Cuotas separadas por operación (chat, estructuración, OCR, embeddings, WhatsApp), período y ambiente. Valor por defecto de nuevas funciones: desactivadas hasta configuración; no inventar monto mensual aprobado.
2. Reserva atómica de unidades/costo conservador antes de llamadas; límites de input/output, archivos/páginas y máximo de herramientas. Reintentos consumen presupuesto reservado; no son gratuitos.
3. Circuit breaker de operaciones opcionales si se agota cuota o hay tasa de error alta. CRM/lectura/plazos/pagos manuales continúan.
4. API throttling, tamaños, concurrencia Lambda y capacidad máxima on-demand evaluada si aplica. Limitan tasas, no garantizan tope monetario mensual del conjunto AWS.
5. Alertas AWS Budgets con destinatario real y presupuesto acordado; pueden retrasarse. No destruir tablas, cortar acceso a expedientes ni desactivar backups al recibir una alerta.
6. Reconciliar gasto estimado con factura y detectar jobs atascados, duplicados, indexaciones repetidas, logs verbosos y polling que consume sin valor.

## Evidencia oficial y límites

- [Kiro Feature Specs](https://kiro.dev/docs/specs/feature-specs/): organización requirements/design/tasks y criterios EARS utilizados en esta carpeta.
- [DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/): separar operaciones, almacenamiento, índices y recuperación; no presentar on-demand como completamente gratuito.
- [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html): operaciones atómicas con límites; considerar consumo adicional y diseñar altas acotadas.
- [DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html): expiración no implica eliminación inmediata; filtrar registros expirados en aplicación.
- [S3 SSE-S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html): cifrado con claves administradas por S3; mantener permisos y políticas aparte del cifrado.
- [Gateway JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html): validación de JWT; agregar permiso de grupo/recurso en backend.
- [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html): alertas pueden retrasarse respecto del cargo.
- [AWS EUM pricing](https://aws.amazon.com/end-user-messaging/pricing/): la consulta anterior mostró USD 0.005/saliente y 0.001/entrante globalmente salvo excepciones, además de Meta; revalidar al contratar.
- [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/), [Textract pricing](https://aws.amazon.com/textract/pricing/), [Amplify pricing](https://aws.amazon.com/amplify/pricing/): escoger tarifa por región/operación efectiva, no un promedio sin volumen.

Meta: tarifas Bolivia, política IA y coexistence siguen pendientes de evidencia oficial accesible/onboarding. No se considera verificada la afirmación de agente global gratis de la conversación anterior. Políticas jurídicas de retención y SIAT siguen a cargo de validación profesional antes de automatizarlas.
