# E1 — Patrones de acceso privados y ADR LC-01

Estado: implementación y pruebas aisladas E1, 2026-10-14. Producción mantiene `despacho_enabled=false`; publicación de 26 recursos pendiente de autorización explícita. La propuesta habilita infraestructura con `PILOT_ENABLED=false`, que bloquea escrituras productivas. No hay expedientes reales ni migración productiva. Entrega de referencia: T12; código en infrastructure/lambda_despacho/ e IaC en infrastructure/despacho.tf. [Evidencia/pendientes](../operations/e1-progress.md).

## Decisión

Mantener DynamoDB PAY_PER_REQUEST. Una tabla DespachoCore privada con PK/SK y dos GSI KEYS_ONLY; Lambda administrativa propia. El rol de la Lambda pública anterior no recibe acceso a Core, sus índices ni su stream. API nueva `/api/admin/despacho/*` con Gateway JWT/scope y Admins validado en servidor. No es multitenant: un despacho y administradores autorizados; portal/pasantes necesitan otra política de recurso antes de activarse.

Recibos de idempotencia privados se guardan en Core (`COMMAND#hash`), no en OperationControl legacy, que está accesible al runtime público. Esto evita que IDs/resultados privados atraviesen esa frontera. No tienen TTL: un cobro no se puede duplicar por expiración de receipt. Actor/ruta/clave y hash de payload impiden reutilizar la clave para otro comando.

## Lecturas

| Uso | Partición/índice | Consistencia y límite |
|---|---|---|
| Persona/caso individual | Get PERSON/CASE#id, META | Fuerte; IDs opacos |
| Directorio de personas | Query LIST#PERSON, pointers por nombre#id | Fuerte; 25 por defecto, hasta 100; hidratación Get fuerte |
| Prefijo de nombre | GSI2 PERSON_NAME#primeros2 / nombre_normalizado#id | Eventual; mínimo dos caracteres; sin fuzzy/FTS; original Unicode conservado |
| Contacto/identidad exactos | Query LOOKUP#tipo#SHA256 / PERSON#id | Fuerte y paginado; contacto compartido devuelve varios candidatos |
| Oportunidades por etapa | Query LIST#OPP#stage / created_at#id | Fuerte; pointers hidratan META actual |
| Casos por estado | Query LIST#CASE#state / created_at#id | Fuerte; estados BORRADOR/ACTIVO/CERRADO/ARCHIVADO |
| Relaciones de una persona | Query PERSON#id, CASE#/OPP# | Fuerte; relaciones inversas transaccionales |
| Expediente y movimientos | Query CASE#id por prefijos de SK | Fuerte; detalle paginado, no array sin límite |
| Tareas por mes | GSI2 DUE_TASK#YYYY-MM | Eventual con hidratación fuerte; horario explícito America/La_Paz |
| Cuotas por vencimiento | GSI2 DUE_INSTALLMENT#YYYY-MM | Mes concreto; no representa saldo global de todos los meses |
| Registros mensuales | GSI1 TYPE#entidad#YYYY-MM | Claves únicamente; no copia relatos en índice |
| Outbox pendiente | GSI1 OUTBOX_PENDING | Cursor durable de conciliación; lectura base revalida estado |
| KPIs | Query METRIC#YYYY-MM | Valores materializados asincrónicos, moneda separada; no derivar de página visible |
| Saldo vencido actual | Query DUE_MONTHS y DUE_BALANCE#YYYY-MM | Job paginado por mes, saldo diario/moneda fuerte; revisión global evita mezclar pagos concurrentes |

No hay Scan en el repositorio ni permiso Scan en roles nuevos. Los cursores se vinculan a índice/partición/prefijo y validan claves; no trasladarlos entre búsquedas. Un GSI puede atrasarse: read-after-write usa Get base. Las listas no certifican ausencia de conflicto; se exige revisión humana. No hay fusión por teléfono.

## Invariantes y transacciones

Alta rápida crea persona nueva, marca cliente, caso BORRADOR, partes/vínculos/evento, receipt, auditoría y outbox en una transacción. Máximo diez partes en alta, diez contactos y cinco identificadores; se rechazan claves repetidas/acciones >100. Partes adicionales se agregan de una en una sólo a BORRADOR, hasta cincuenta; invalidan revisión anterior y escriben vínculos/evento de forma atómica. No se acepta relato mayor a 16000 caracteres ni body mayor a 32KB. IDs/nombres de muestras pertenecen sólo a tests, nunca se cargan como UI del despacho.

Revisión de conflicto se liga a IDs/roles/versiones de personas. Activación ACTIVO exige APROBADO con nota/actor/fecha y verifica las mismas versiones atómicamente. Cambiar identidad invalida revisión para la siguiente activación; no se infiere decisión de la búsqueda.

Dinero: unidades menores enteras, BOB/USD/EUR separadas. Cuotas suman honorarios. Pago exige confirmación humana, pagador vinculado y referencia comercial duradera; asignaciones iniciales/posteriores no exceden pago ni saldo. Reversión completa restaura cuotas y saldo, no transfiere/reembolsa dinero; se bloquea si los fondos del cliente ya fueron utilizados. Fondos de cliente se separan de ingresos; gasto de esos fondos no genera margen del despacho. Referencias de factura/CUF son metadata manual, sin emisión SIAT, verificación fiscal automática ni almacenamiento de comprobantes (E2).

Outbox nace con el negocio; stream→SQS FIFO→worker aplica deltas y marker APPLIED en una transacción. Duplicados de stream/cola no duplican contadores. Jobs FIFO fallidos no confirman los siguientes mensajes. DLQ y conciliación horaria recuperan pendientes; no hay envíos de clientes ni inferencia.

## Costo y verificación

Sin cómputo de base reservado, NAT, VM, containers persistentes, Aurora u OpenSearch. Core/GSI/PITR/colas/logs tienen tarifas por uso/almacenamiento; no prometer factura cero. Roles/funciones sin concurrencia provisionada, memoria 256 MiB, retención logs 30 días, SQS SSE gestionada y PITR. Recursos etiquetados Project=jhoselyn-despacho para el aviso USD 20, con límites de cobertura de Billing ya documentados.

Transacciones devuelven ReturnConsumedCapacity=INDEXES y sólo registran conteo de acciones/unidades, sin cuerpos ni identidad. Las respuestas observadas omiten desglose WRU/RRU; logger guarda null, no cero. Las pruebas Moto verifican corrección; IAM/concurrencia/latencia se contrastan en staging. [Benchmark](../operations/e1-benchmark.json) conserva capacidad agregada, tarifas oficiales y cota del componente transaccional usando la mayor tarifa de unidad. No incluye lecturas previas/worker/colas/logs/storage ni equivale a factura o costo completo por operación. Fórmula exacta futura: WRU × tarifa WRU + RRU × tarifa RRU, más Lambda/cola/storage; no asignar CAC a fixtures.

Ledger inmutable por período permite rebuild paginado fuerte sin Scan. Job conserva revisión de origen; si entra otro movimiento devuelve SOURCE_CHANGED para reiniciar. Espera markers APPLIED antes de avanzar, guarda cursor/totales/version y en el cierre comprueba revisión de ledger y counters. Así una entrega repetida después de reconstruir no vuelve a sumar. Métricas de oportunidades/casos usan cohorte local de alta; cobros/acuerdos/gastos usan fecha efectiva. Reversos/asignaciones corrigen cohorte del pago original y conservan fecha real del ajuste. Atribución de conversión/canal completa corresponde a E3.

Vencido usa saldo impago **actual** de cuotas cuya fecha es anterior al corte, no fotografía histórica de deuda. Acuerdo/asignación/reversión mantienen buckets diarios por moneda y revisión REV#FINANCE/DUE en la misma transacción. Job recorre un mes por step; máximo 93 buckets/mes (31 días × 3 monedas). Detecta cambios de saldo y exige reiniciar; no publica un total parcial como definitivo. No necesita Scheduler diario ni extrapola de una página. Agenda día/siete días usa rangos UTC y particiones del mes local, con cursor ligado al rango; una semana cruzando de mes pagina ambas particiones.

Fuentes oficiales revisadas el 2026-10-14: [transacciones (100 acciones/4MB, token AWS válido 10 minutos)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), [Query y consistencia](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html), [Streams al menos una vez](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html), [respuesta parcial FIFO](https://docs.aws.amazon.com/prescriptive-guidance/latest/lambda-event-filtering-partial-batch-responses-for-sqs/best-practices-partial-batch-responses.html), [tarifas DynamoDB](https://aws.amazon.com/dynamodb/pricing/).
