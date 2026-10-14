# Requirements — Despacho Digital con costo fijo mínimo

Estado: especificación propuesta para implementación. Fecha: 2026-10-13. Idioma: español. Prioridad aprobada por el usuario: mantener costos fijos lo más cerca de cero posible. La creación de specs no implica despliegue ni implementación.

## Contexto y alcance

Producto para una abogada independiente en Cochabamba: web pública, captación, clientes, expedientes, agenda, finanzas, documentos y procedimientos. El sistema actual usa React/Vite, Lambda, API Gateway HTTP API, Cognito y DynamoDB. La [segunda auditoría](../../audits/11_segunda_auditoria_2026-10-13.md) acredita fallos locales de acceso e integridad. AWS desplegado y gasto actual aún no se han inventariado.

Decisión base: conservar DynamoDB on-demand; incorporar S3 privado y ejecución por eventos. Aurora, Neptune, OpenSearch, servidores persistentes y suscripciones de terceros quedan fuera del núcleo inicial. IA y WhatsApp automatizado son capacidades activables por fase y presupuesto. La biblioteca y los procedimientos deben funcionar sin ellas.

Costo fijo mínimo significa evitar capacidad reservada o servicios siempre encendidos; almacenamiento, backups, dominio y consumos pueden seguir generando cargos en reposo. No se promete una factura de cero ni se depende de créditos promocionales.

## Personas y dolores

| ID | Dolor / necesidad | Consecuencia actual | Resultado esperado |
|---|---|---|---|
| P01 | Relatos y datos privados expuestos por API | Riesgo sobre secreto profesional | Acceso servidor por identidad y recurso |
| P02 | Prospecto, cliente y caso mezclados | Seguimiento y métricas confusos | Entidades relacionadas con historial |
| P03 | Documentos dispersos | Tiempo perdido buscando versiones | Árbol por materias, colecciones y expediente |
| P04 | Alta lenta y datos repetidos | Fricción y duplicados | Alta breve, transaccional, con revisión |
| P05 | Procedimientos dependen de memoria | Omisiones y trabajo repetido | Plantillas versionadas y pasos por caso |
| P06 | Consultas repetitivas interrumpen | Menos tiempo de trabajo jurídico | FAQ, intake y handoff con control humano |
| P07 | Citas/plazos sin garantías | Doble reserva o vencimiento omitido | Agenda consistente y alertas verificadas |
| P08 | Pactado/cobrado/facturado mezclados | Cobranza y margen desconocidos | Cuotas, pagos parciales, gastos y conciliación |
| P09 | Escalar parece requerir gasto fijo alto | Dificulta adopción | Pago por uso, medición y límites |
| P10 | Interfaz confirma acciones inexistentes | Cliente cree haber pagado/enviado | Estados basados en acuse real |
| P11 | Sin recuperación ni salida comprobada | Dependencia de sistema/desarrollador | Backup restaurable, exportación y runbooks |
| P12 | Normas/IA sin trazabilidad | Respuestas desactualizadas o infundadas | Fuentes, vigencia y revisión profesional |

Actores: visitante, prospecto, cliente, abogada administradora, mantenedor de infraestructura. Un mantenedor no recibe automáticamente acceso al contenido de expedientes. No hay portal público de expedientes en el MVP.

## Convención de requisitos

Formato EARS adaptado: CUANDO / MIENTRAS / SI / DONDE + condición + EL SISTEMA DEBERÁ + resultado observable. IDs Rxx.y estables. P0 bloquea incorporación de datos sensibles; P1 bloquea salida de su módulo; P2 mejora posterior. Datos sintéticos sólo en pruebas aisladas; interfaces y pilotos usan registros reales autorizados o estados vacíos.

## R01 — Costos y alcance económico · P0 · P09

Historia: como responsable técnico, quiero conocer y limitar los costos para operar sin capacidad fija innecesaria.

- **R01.1:** CUANDO se proponga un recurso, EL SISTEMA DEBERÁ documentar tarifa fija, consumo, costo en reposo y motivo antes de incluirlo en Terraform.
- **R01.2:** MIENTRAS opere el núcleo, EL SISTEMA DEBERÁ funcionar sin Aurora, NAT Gateway, balanceador, VM, contenedor persistente, búsqueda con capacidad mínima o concurrencia Lambda provisionada.
- **R01.3:** CUANDO una operación invoque IA/OCR/automatización externa, EL SISTEMA DEBERÁ reservar cuota antes del consumo y registrar unidades, resultado y estimación reconciliable.
- **R01.4:** SI se agota cuota o falta configuración tarifaria vigente, EL SISTEMA DEBERÁ suspender nuevas operaciones opcionales y conservar CRM, lectura documental, agenda y registro manual de pagos.
- **R01.5:** CUANDO se consulte el gasto, EL SISTEMA DEBERÁ distinguir factura AWS, estimación interna, período y fecha de actualización; ningún presupuesto será presentado como tope garantizado de factura.

## R02 — Identidad, permisos y datos privados · P0 · P01

Historia: como abogada, quiero que mis expedientes sólo sean accesibles a personas autorizadas.

- **R02.1:** CUANDO una ruta privada reciba una solicitud sin token válido, EL SISTEMA DEBERÁ responder 401 sin datos privados.
- **R02.2:** CUANDO exista identidad válida sin permiso, EL SISTEMA DEBERÁ responder 403; para IDs privados ajenos podrá responder 404 para evitar enumeración.
- **R02.3:** MIENTRAS una administradora use el panel, EL SISTEMA DEBERÁ exigir membresía Admins validada en servidor, MFA TOTP y sesiones con expiración/renovación manejadas.
- **R02.4:** CUANDO se retiren rutas antiguas, EL SISTEMA DEBERÁ impedir que `/api/chat/leads`, `/api/crm/leads` o el proxy genérico eludan el control; auto-registro estará cerrado.
- **R02.5:** CUANDO se acceda a un expediente, archivo, resultado de búsqueda o exportación, EL SISTEMA DEBERÁ verificar autorización sobre el recurso y registrar acceso sin copiar contenido sensible a logs.

## R03 — Contratos API e integridad · P1 · P02/P07/P08

- **R03.1:** CUANDO el JSON, tipos, longitudes, enums o campos sean inválidos, EL SISTEMA DEBERÁ responder 400/422 con errores de campo y request_id, sin stack ni detalles internos.
- **R03.2:** CUANDO se repita una creación con misma clave y contenido, EL SISTEMA DEBERÁ devolver el resultado original; misma clave con contenido diferente deberá producir 409.
- **R03.3:** CUANDO se actualice un ID inexistente o versión obsoleta, EL SISTEMA DEBERÁ responder 404 o 409 respectivamente, sin crear registros parciales.
- **R03.4:** CUANDO una consulta exceda una página, EL SISTEMA DEBERÁ devolver cursor y límite explícitos; fallos de API no deberán mostrarse como listas vacías o ceros.
- **R03.5:** CUANDO se complete una mutación crítica, EL SISTEMA DEBERÁ persistir atómicamente entidad, versión, evento de auditoría e intención de efectos posteriores.

## R04 — Web y publicación honesta · P1 · P10

- **R04.1:** CUANDO se publique contenido/fotos/tarifas, EL SISTEMA DEBERÁ usar activos y datos aprobados por la abogada; si faltan, deberá mostrar ausencia o coordinación manual.
- **R04.2:** CUANDO el visitante consulte blog por lista o slug, EL SISTEMA DEBERÁ devolver únicamente contenido publicado; slugs únicos y normalizados.
- **R04.3:** CUANDO se abra WhatsApp desde contacto/pagos, EL SISTEMA DEBERÁ informar que falta enviar/adjuntar; sólo un acuse persistido podrá marcar recepción.
- **R04.4:** SI no hay QR bancario real o proveedor de pago configurado, EL SISTEMA DEBERÁ omitir la instrucción de escanear/pagar por ese medio.
- **R04.5:** CUANDO se soliciten datos personales, EL SISTEMA DEBERÁ mostrar finalidad y política aprobadas y registrar versión del aviso cuando corresponda.

## R05 — Agenda y reservas · P1 · P07

- **R05.1:** CUANDO se cree una cita pública, EL SISTEMA DEBERÁ validar fecha futura, horario configurado y datos de contacto, fijando PENDING_APPROVAL en servidor.
- **R05.2:** CUANDO dos solicitudes compitan por un mismo slot, EL SISTEMA DEBERÁ confirmar como máximo una; la otra recibirá 409.
- **R05.3:** CUANDO se cancele o reprograme, EL SISTEMA DEBERÁ liberar/reservar slots y actualizar cita en una transacción con auditoría.
- **R05.4:** CUANDO se presente una fecha, EL SISTEMA DEBERÁ usar America/La_Paz explícitamente; visitantes internacionales verán zona y equivalencia local cuando sea posible.
- **R05.5:** SI falla una notificación, EL SISTEMA DEBERÁ mantener la cita persistida y mostrar alerta pendiente/fallida, sin afirmar entrega.

## R06 — CRM y conflictos · P1 · P02/P04

Historia: como abogada, quiero separar captación y trabajo contratado, conservando relaciones entre personas.

- **R06.1:** CUANDO se registre una persona, EL SISTEMA DEBERÁ permitir varios contactos/roles; un teléfono compartido no fusionará automáticamente personas.
- **R06.2:** CUANDO cambie una oportunidad, EL SISTEMA DEBERÁ guardar etapa anterior/nueva, fecha, actor y motivo si se pierde; ganado comercial no equivale a resultado judicial.
- **R06.3:** CUANDO se acepte un asunto, EL SISTEMA DEBERÁ vincular clientes, representados, pagadores y contrapartes al caso, con revisión de posibles conflictos previa a su activación.
- **R06.4:** SI la búsqueda encuentra coincidencias o datos insuficientes, EL SISTEMA DEBERÁ pedir revisión humana y guardar su decisión; ausencia de coincidencias no certifica ausencia de conflicto.
- **R06.5:** CUANDO se migren leads, EL SISTEMA DEBERÁ preservar ID/origen, evitar duplicados por ejecución repetida y marcar estados/contactos ambiguos para revisión.

## R07 — Alta rápida · P1 · P04

- **R07.1:** CUANDO se abra alta rápida, EL SISTEMA DEBERÁ permitir buscar/reutilizar persona, capturar relato y partes y elegir oportunidad o caso, sin requerir IA.
- **R07.2:** CUANDO se guarde un caso, EL SISTEMA DEBERÁ crear vínculos y evento inicial atómicamente, conservando relato original y estado de revisión de conflictos.
- **R07.3:** DONDE esté habilitada la IA, CUANDO se estructure un relato, EL SISTEMA DEBERÁ mostrar sugerencia editable con procedencia; fechas, honorarios y aceptación del asunto no se confirmarán automáticamente.
- **R07.4:** CUANDO la abogada pruebe el flujo con un párrafo y datos disponibles, EL SISTEMA DEBERÁ permitir completarlo en ≤90 s en 4 de 5 intentos; lectura jurídica/decisión sobre conflictos se medirá aparte.

## R08 — Biblioteca y documentos · P1 · P03

- **R08.1:** CUANDO se clasifique un documento, EL SISTEMA DEBERÁ relacionarlo con materia y colección: caso, plantilla, conocimiento o normativa; el árbol será editable con IDs estables.
- **R08.2:** CUANDO se suba una versión, EL SISTEMA DEBERÁ registrar autor, checksum, tamaño, MIME, vínculos y versión física; contenido repetido no compartirá permisos automáticamente.
- **R08.3:** MIENTRAS un archivo esté sin validar o en cuarentena, EL SISTEMA DEBERÁ bloquear descarga normal, extracción e indexado; error de antivirus no significa archivo limpio.
- **R08.4:** CUANDO un usuario autorizado descargue, EL SISTEMA DEBERÁ emitir una URL de corta duración y auditar la emisión, diferenciándola de evidencia de descarga efectiva.
- **R08.5:** CUANDO se busque en MVP, EL SISTEMA DEBERÁ ofrecer árbol, filtros, título/etiquetas; deberá explicar que búsqueda integral de contenido y semántica pertenecen a una ampliación.
- **R08.6:** CUANDO se cambie/revoque/elimine un documento, EL SISTEMA DEBERÁ actualizar vínculos, permisos, derivados e índices; retenciones/hold podrán impedir borrado físico según política aprobada.

## R09 — Procedimientos y plantillas · P1 · P05

- **R09.1:** CUANDO se publique un workflow, EL SISTEMA DEBERÁ fijar una versión y responsable de validación.
- **R09.2:** CUANDO se aplique a un caso, EL SISTEMA DEBERÁ copiar pasos/instrucciones y conservar versión de origen; cambios posteriores no alterarán casos abiertos.
- **R09.3:** CUANDO se complete u omita un paso, EL SISTEMA DEBERÁ registrar actor, fecha, evidencia y motivo cuando corresponda.
- **R09.4:** CUANDO se genere un documento desde plantilla, EL SISTEMA DEBERÁ usar datos reales, señalar variables faltantes y guardar resultado como nueva versión revisable.
- **R09.5:** CUANDO se incorpore una lección a conocimiento común, EL SISTEMA DEBERÁ exigir revisión y anonimización antes de compartirla fuera de su caso.

## R10 — Plazos y alertas · P1 · P07

- **R10.1:** CUANDO se registre un vencimiento, EL SISTEMA DEBERÁ conservar evento de inicio, evidencia, zona, responsable y confirmación humana.
- **R10.2:** DONDE exista cálculo automático, EL SISTEMA DEBERÁ usar reglas versionadas con fuente, jurisdicción, días aplicables, corte, suspensiones y calendario verificado; datos insuficientes impedirán cálculo definitivo.
- **R10.3:** CUANDO venza una alerta configurada, EL SISTEMA DEBERÁ generar un intento deduplicado y mostrar entrega/fallo; un reintento no creará un plazo nuevo.
- **R10.4:** SI un plazo cambia, EL SISTEMA DEBERÁ invalidar recordatorios anteriores y mostrar alertas atrasadas hasta su resolución, incluso tras una caída del worker.

## R11 — Honorarios, pagos y gastos · P1 · P08

- **R11.1:** CUANDO se pacte un honorario, EL SISTEMA DEBERÁ guardar monto/moneda, modalidad, cuotas y contrato, diferenciando pactado, cobrado y facturado.
- **R11.2:** CUANDO se confirme un pago, EL SISTEMA DEBERÁ permitir asignarlo a varias cuotas, impedir sobreasignación y conservar comprobante y conciliador.
- **R11.3:** CUANDO se maneje dinero, EL SISTEMA DEBERÁ usar unidades menores enteras/Decimal y moneda explícita; no sumará monedas sin tipo de cambio documentado.
- **R11.4:** CUANDO se corrija un pago, EL SISTEMA DEBERÁ registrar reversión o ajuste trazable; recibos no se borrarán para cambiar saldos.
- **R11.5:** CUANDO se registren gastos, EL SISTEMA DEBERÁ distinguir reembolsables, fondos del cliente y gasto propio; facturas SIAT se adjuntarán manualmente hasta validar integración fiscal.

## R12 — Métricas y embudo · P1 · P02/P08

- **R12.1:** CUANDO se calcule conversión, EL SISTEMA DEBERÁ contar oportunidades únicas por cohorte y canal, independientemente del número de pagos.
- **R12.2:** CUANDO se calcule cartera, EL SISTEMA DEBERÁ usar cuotas menos asignaciones/reversiones válidas y distinguir vencimiento y moneda.
- **R12.3:** CUANDO se muestre una métrica materializada, EL SISTEMA DEBERÁ informar período y actualizado_en; ausencia de gasto/tiempo no se convertirá en CAC/rentabilidad cero.
- **R12.4:** CUANDO se reconstruyan métricas desde registros, EL SISTEMA DEBERÁ obtener resultados reproducibles y detectar divergencias con agregados.

## R13 — Chat e IA bajo demanda · P1 · P06/P09/P12

- **R13.1:** CUANDO el usuario consulte horarios/tarifas/disponibilidad, EL SISTEMA DEBERÁ preferir datos estructurados y herramientas deterministas; Bedrock sólo se invocará si aporta una capacidad habilitada.
- **R13.2:** CUANDO se invoque modelo, EL SISTEMA DEBERÁ limitar entrada/salida, turnos, herramientas y concurrencia; crear nuevas sesiones no eludirá la cuota global.
- **R13.3:** CUANDO una herramienta guarde un lead, EL SISTEMA DEBERÁ validar argumentos y deduplicar la acción; éxito al usuario exige persistencia confirmada.
- **R13.4:** SI falla inferencia/persistencia, EL SISTEMA DEBERÁ conservar estado recuperable y ofrecer contacto humano sin afirmar que se notificó o guardó cuando no ocurrió.
- **R13.5:** CUANDO se detecte solicitud humana, urgencia o consulta jurídica específica, EL SISTEMA DEBERÁ activar derivación según política revisada, sin crear plazos ni prometer resultado judicial.

## R14 — WhatsApp por fases · P1 al activarse · P06

- **R14.1:** MIENTRAS no exista integración habilitada, EL SISTEMA DEBERÁ permitir coordinación manual por wa.me y registro de interacción, sin afirmar sincronización automática.
- **R14.2:** ANTES de habilitar API, EL SISTEMA DEBERÁ documentar proveedor, tarifa vigente por destino, opt-in/plantillas, número, coexistence y procedimiento de reversión probado.
- **R14.3:** CUANDO llegue un evento firmado válido, EL SISTEMA DEBERÁ persistirlo/deduplicarlo antes de procesarlo y resolver errores mediante reintentos limitados y DLQ.
- **R14.4:** MIENTRAS una conversación esté en modo HUMANO, EL SISTEMA DEBERÁ impedir nuevos envíos del bot, comprobar estado justo antes de enviar y registrar cualquier envío ya en vuelo.
- **R14.5:** CUANDO se solicite información de un caso, EL SISTEMA DEBERÁ comprobar identidad y autorización específica; teléfono coincidente o booleano verificado sin vigencia no bastará.

## R15 — Corpus y RAG opcional · P1 al activarse · P12

- **R15.1:** CUANDO se ingeste normativa/doctrina, EL SISTEMA DEBERÁ guardar fuente, permiso/licencia, fecha, jurisdicción y versión; posesión de un libro no acreditará permiso de ingesta.
- **R15.2:** CUANDO se responda con RAG, EL SISTEMA DEBERÁ autorizar corpus antes de recuperación, citar versión/unidad y abstenerse si no existe respaldo suficiente.
- **R15.3:** SI una norma se modifica parcialmente, EL SISTEMA DEBERÁ conservar vigencia por artículo y fecha de verificación, sin reducirlo a un booleano de documento.
- **R15.4:** ANTES de activar RAG/grafo, EL SISTEMA DEBERÁ superar evaluación con preguntas reales autorizadas, citas, vigencia, abstención y pruebas de fuga/inyección; grafo necesita mejora medida sobre alternativa sencilla.

## R16 — Continuidad, privacidad y entrega · P0/P1 · P11

- **R16.1:** CUANDO se despliegue, EL SISTEMA DEBERÁ usar state remoto protegido/locking, versiones fijadas y plan revisable con rollback.
- **R16.2:** MIENTRAS almacene expedientes, EL SISTEMA DEBERÁ disponer de PITR/versiones, políticas de conservación aprobadas y restauración probada; TTL no será garantía de borrado inmediato.
- **R16.3:** CUANDO la abogada exporte un caso, EL SISTEMA DEBERÁ entregar originales, metadatos, versiones pertinentes e historial con manifiesto de integridad y descarga autorizada.
- **R16.4:** CUANDO se libere una fase, EL SISTEMA DEBERÁ demostrar sus criterios con pruebas aisladas/staging; pruebas que escriben en producción requerirán una ejecución expresamente planificada.
- **R16.5:** CUANDO se prepare una entrega, EL SISTEMA DEBERÁ actualizar README, docs, roadmap y evidencia; objetivos de recuperación y rendimiento se medirán antes de declararlos cumplidos.

## Prioridades de producto y límites

Entrega E0: seguridad y confiabilidad actual. E1: CRM, alta, agenda y finanzas básicas. E2: biblioteca/plantillas/workflows manuales. E3: automatización selectiva, métricas avanzadas y reglas de plazos validadas. E4: WhatsApp API y RAG bajo decisión económica. E4 forma parte del plan completo, no del gasto base.

No se crean automáticamente normas, reglas procesales, testimonios, tarifas del despacho, datos bancarios ni métricas. Pendientes de la abogada: textos/fotos, árbol, procedimientos, fuentes autorizadas, retención y facturación. Pendientes técnicos: inventario AWS, volumen real, presupuesto numérico, tarifas/región y número WhatsApp. Estos pendientes no impiden implementar permisos, validación o formularios manuales.
