# Segunda auditoría — sitio y plan de Despacho Digital

> Actualización de planificación: las [specs de costo fijo mínimo](../README.md) son la arquitectura objetivo vigente tras la decisión del usuario. Los hallazgos de esta auditoría siguen abiertos; su alternativa Aurora y secuencia A2 quedan ajustadas por la matriz de trazabilidad.

Fecha: **2026-10-13**, America/La_Paz. Alcance: código local, Terraform, documentos 00–10 y conversación adjunta del agente anterior.

## Dictamen

El proyecto tiene web, agenda, chat y gestión de prospectos. **Todavía no tiene CRM de expedientes, almacenamiento documental, RAG, procedimientos ni integración WhatsApp API.** Los documentos anteriores son una propuesta de arquitectura, no una implementación ni evidencia del estado de AWS.

La separación persona → oportunidad → caso y las cuatro colecciones documentales son adecuadas. Recomiendo conservarlas, pero **no iniciar la ampliación sobre la API actual**: existen fallos de acceso y de integridad reproducidos localmente. Además, el SQL y las estimaciones del plan necesitan corrección antes de convertirse en migraciones o compromisos de entrega.

Este informe conserva los hallazgos de la revisión de los documentos históricos 00–10. En el momento de la auditoría estaban pendientes base de datos, proveedor WhatsApp y reglas jurídicas; posteriormente el usuario eligió costo fijo mínimo y las specs adoptaron DynamoDB como base. Proveedor WhatsApp y reglas jurídicas siguen pendientes. Las decisiones y tareas actuales se consultan en [design.md](../specs/despacho-digital-coste-minimo/design.md) y [tasks.md](../specs/despacho-digital-coste-minimo/tasks.md). No se aplicaron cambios de aplicación o infraestructura, no hubo despliegue ni commit.

## Método y límites

- Lectura de `main.tf`, handler, agente, autenticación, dashboard, reservas, blog, pagos, contacto y planificación.
- Build y lint del frontend con dependencias ya instaladas; análisis sintáctico del backend.
- Ejecución aislada del handler con adaptador de almacenamiento en memoria para comprobar accesos, reservas, publicación y errores. Ningún dato de cliente ni llamada a AWS. Resultados en [12_evidencia_auditoria_local.md](12_evidencia_auditoria_local.md).
- Verificación de documentación oficial AWS y PostgreSQL; Meta devolvió error 429/login y la Gaceta no respondió. Esos fallos impiden dar por verificadas sus tarifas, disponibilidad o condiciones jurídicas.
- No se consultaron recursos desplegados, logs de producción, facturación ni credenciales; tampoco se ejecutaron los scripts `test_*.py` que invocan servicios reales. No se ejecutó SQL en PostgreSQL ni `terraform plan/apply`.

Por tanto, «confirmado» significa confirmado en el repositorio o en una ejecución local. **No se afirma que haya ocurrido una filtración**, ni que AWS tenga exactamente la configuración local.

## 1. Hallazgos del sistema actual

Prioridad: P0 bloquea incorporación de expedientes; P1 bloquea operación fiable o salida de su módulo; P2 mejora de mantenimiento/rendimiento.

### A01 · P0 · API administrativa sin autenticación ni autorización

**Evidencia:** `infrastructure/main.tf:286` declara `ANY /api/{proxy+}` sin authorizer; `handler.py:27` despacha rutas sin validar identidad. La reproducción local de `GET /api/appointments` sin credenciales devuelve 200. CRM y pro bono se leen y modifican por el mismo router. Existe también el alias `/api/chat/leads`, omitido en el resumen anterior.

**Impacto:** la configuración local permite leer teléfonos, relatos y solicitudes; modificar horarios, citas y blog; borrar leads. CORS no corrige esto, porque no impide invocaciones fuera del navegador.

**Corrección:** matriz explícita por método y ruta; JWT válido más permiso de administrador en servidor; sin autorizar «cualquier usuario autenticado». Proteger ambas rutas CRM, pro bono GET/PATCH, citas GET/PATCH, schedule PUT y escrituras blog. Mantener sólo lectura publicada y altas públicas validadas donde corresponde. Al mover a `/api/admin/*`, cerrar rutas antiguas y fallback público; no basta añadir rutas nuevas.

**Aceptación:** sin token → 401; token válido sin grupo autorizado → 403; administrador → operación permitida. Probar token vencido, issuer/audience incorrectos, métodos alternativos, aliases y ruta fallback. Comprobar autorización por caso/documento antes de emitir URLs de descarga.

### A02 · P1 · El login no demuestra pertenencia a Admins

**Evidencia:** `Login.jsx:28` guarda un ID token tras cualquier autenticación; `AdminDashboard.jsx:91` sólo comprueba que exista una cadena en localStorage. Sus fetch no envían Authorization. Cognito permite auto-registro (`main.tf:34`) y no configura MFA. El botón «Registrarse» cambia el formulario, pero ejecuta la misma función de login.

**Impacto:** proteger únicamente Gateway rompería el dashboard; validar sólo JWT podría permitir usuarios ajenos al grupo. La protección frontend actual se elude con una cadena arbitraria, aunque la barrera decisiva debe estar en servidor.

**Corrección:** cliente HTTP único con Bearer token, renovación/expiración, manejo 401/403 y validación servidor de Admins o scopes definidos. Configurar alta sólo administrativa y flujo TOTP con enrollment/challenges y recuperación. No habilitar MFA sin implementar esos flujos.

**Aceptación:** admin inicia sesión con TOTP y usa panel; usuario no admin no accede; expiración no conserva datos visibles ni produce confirmaciones de operaciones fallidas.

### A03 · P1 · Citas inválidas, aprobación pública y reservas duplicadas

**Evidencia:** `handler.py:70–86` sólo verifica presencia de campos, acepta `status` del body y escribe un UUID nuevo sin condición de exclusión. Localmente se aceptaron cadenas vacías, fecha/hora inválidas y dos reservas iguales con status APPROVED.

**Corrección:** validar fecha futura en America/La_Paz, horario real, duración, campos y teléfono; fijar estado inicial en servidor. Reservar un slot con clave única y escritura condicional/transacción; gestionar cancelación y reprogramación atómicamente, además de clave de idempotencia para reintentos. La consulta de disponibilidad no asegura exclusión entre dos escrituras.

**Aceptación:** dos solicitudes simultáneas al mismo slot → una reserva y un 409; reintento con la misma clave devuelve la misma reserva; un cliente no puede aprobarse ni reprogramar citas ajenas.

### A04 · P1 · Borradores del blog se devuelven públicamente

**Evidencia:** `handler.py:133` y `:142` no filtran `published`; la lectura por slug también devuelve borradores. Reproducido localmente.

**Corrección:** separar consultas públicas/admin; filtros y acceso publicado en ambos endpoints; slug único, incluyendo normalización de acentos y colisiones.

**Aceptación:** borrador ausente del listado y 404 por slug público; visible sólo a administrador. Probar paginación con páginas sin resultados publicados.

### A05 · P1 · Listados truncados y métricas incompletas

**Evidencia:** handler usa `scan()` y `query()` una vez, sin gestionar LastEvaluatedKey. El adaptador local confirmó que el cursor se descarta. El dashboard calcula sumas sólo sobre leads recibidos.

**Corrección:** paginación con cursor opaco, límites y filtros; índices según patrón de acceso; métricas agregadas en servidor. Separar listado paginado de cálculo del total.

**Aceptación:** inventario completo recuperable entre páginas sin pérdidas; KPI coincide con el total persistido aunque se vea una página. No responder vacíos como si fueran cero cuando la API falla.

### A06 · P1 · Importes decimales y actualizaciones sin control de existencia

**Evidencia:** `handler.py:262–312` carga JSON sin conversión decimal y pasa `deal_value` directo a boto3 DynamoDB; JavaScript usa Number. JSON con fracción produce float, que el serializador DynamoDB no acepta. `update_item` carece de condición de existencia y de versión.

**Corrección:** validar importes, usar Decimal/unidades menores y contrato JSON explícito; serializar decimales como números/cadenas según contrato documentado. Exigir existencia y versión para PATCH; evitar registros parciales creados por un ID inexistente y pérdida de notas por escrituras concurrentes.

**Aceptación:** 123.45 se conserva exactamente; ID inexistente → 404; versión obsoleta → 409; dos notas no se sobrescriben. Hallazgo decimal deducido del código, no ejecutado con boto3 real en esta auditoría.

### A07 · P1 · Chat sin límites globales, sin idempotencia y con errores engañosos

**Evidencia:** `agent_core.py:201` admite sesión nueva, por lo que seis turnos no limita uso por usuario; lectura/modificación/escritura del contador no es atómica. `execute_save_lead` crea UUID en cada tool call; no deduplica por sesión. Guarda conversaciones sin TTL; recorta por número de mensajes, pudiendo cortar pares toolUse/toolResult. La segunda respuesta puede volver a pedir tool use, pero no hay bucle para procesarla. Devuelve toolResult success incluso si la herramienta falló. Ante fallo Bedrock el texto dice «He tomado nota» sin asegurar creación de ficha ni notificación.

**Corrección:** validación de mensaje/tamaño/tipo, cuotas por sesión y origen con budget global, límite de concurrencia, actualización atómica, TTL y retención explícita. Dedupe de acciones con clave estable; persistencia y reintento separados de inferencia. Bucle de herramientas limitado, resultados coherentes y truncado por turnos completos. Fallo → aviso factual y contacto humano, sin afirmar acciones inexistentes.

**Aceptación:** reintento no duplica lead; concurrencia no pierde turno; límite no se evita creando sesiones ilimitadas; tool fallida no comunica éxito; historial enviado a Converse es válido. Pruebas de prompt injection y tool inputs fuera de esquema antes de compartir núcleo con WhatsApp.

### A08 · P1 · Pagos muestra recepción inexistente y QR decorativo

**Evidencia:** `PagosPage.jsx:25` muestra un recuadro «QR Oficial», sin QR bancario; `:124–137` guarda file sólo en estado y abre wa.me con texto. `:301–303` afirma «Comprobante Enviado» y «Hemos recibido tu comprobante» sin upload ni acuse. Seleccionar archivo no lo adjunta a WhatsApp.

**Corrección:** retirar presentación de QR hasta recibir activo bancario real; mensaje «WhatsApp abierto: adjunta y envía el comprobante» para coordinación manual. Para recepción real, upload privado validado y estado pendiente de verificación; nunca contabilizar ingreso por captura ni por abrir WhatsApp. Revisar contacto, que también marca enviado al abrir un enlace.

**Aceptación:** cancelar envío o bloquear popup no muestra recepción; archivo recibido tiene ID y registro; pago confirmado requiere revisión/conciliación. No inventar números de cuenta ni enlaces de cobro.

### A09 · P1 · Recuperación y observabilidad no están definidas en IaC

**Evidencia:** `main.tf` no configura PITR, TTL sesiones, access logs, retención de logs, alarmas, throttling de rutas, backend remoto ni suscripción SNS. Crear un topic no entrega alertas a la abogada. Esto acredita ausencia en IaC, no ausencia absoluta en AWS.

**Corrección:** inventariar primero ajustes manuales/despliegue; PITR y restauración, logs sin contenido sensible, alarmas y entrega real de notificaciones. Estado S3 cifrado/versionado/locking, versiones Terraform/providers y .terraform.lock.hcl versionado (actualmente ignorado). Bootstrap del bucket separado y migración respaldada.

**Aceptación:** restauración verificada y runbook; notificación recibida de punta a punta; presupuesto y alarmas probados; segundo apply sin drift inesperado. RPO/RTO como objetivos a acordar y medir, no garantías del backup mensual.

### A10 · P2 · Mantenimiento y herramientas de prueba

Frontend compila; lint termina con advertencias. Bundle principal 660.23 kB y dashboard monolítico. Los scripts de pruebas llaman a API/Bedrock reales y no forman una suite aislada reproducible. No se identificó pipeline CI en el inventario versionado.

**Corrección:** modularizar por dominio sin multiplicar Lambdas prematuramente; carga diferida de admin/chat; CI de build/lint y pruebas focalizadas de autorización, exclusión de slots, dinero y herramientas. Fijar dependencias y distinguir pruebas offline de integración en staging, con opt-in explícito y limpieza.

## 2. Correcciones al plan anterior

| ID | Problema | Ajuste necesario |
|---|---|---|
| D01 | «DynamoDB impide métricas» | No tiene JOIN SQL, pero se pueden hacer agregaciones, índices, materializaciones y exportación analítica. PostgreSQL facilita relaciones; no es la única alternativa viable. |
| D02 | «Aurora sin VPC» | Data API evita integrar Lambda en VPC; el clúster sigue necesitando subnets/security groups. Reanudación típica ~15 s, y puede superar 30 s tras pausa prolongada: conflicto con Lambda actual de 30 s. |
| D03 | SQL presentado como implementable | Orden de FK incompleto/circular, extensiones/versiones sin validar, unaccent STABLE en índice/columna generada. Hace falta una migración ordenada y ejecutada desde cero. |
| D04 | `v_embudo_canal` cuenta después de JOIN con pagos | Una oportunidad con varios pagos se cuenta varias veces. Preagregar ingresos por caso y contar oportunidades a su propia granularidad; no arreglarlo sólo con SUM DISTINCT. |
| D05 | «BM25 tsvector» | PostgreSQL FTS con ts_rank/ts_rank_cd no es BM25 por defecto. Documentar ranking real y comparar recuperación en corpus del despacho. |
| D06 | Hash global UNIQUE y teléfono único | Archivo idéntico puede pertenecer a varios casos sin compartir permisos; teléfono puede ser compartido por una familia. Blob físico separado de vínculos/ACL; dedupe propone fusión, no fusiona automáticamente. |
| D07 | `vigente boolean` | No resuelve vigencia parcial ni histórica. Versiones por norma/artículo, vigencia desde/hasta, fuente, jurisdicción, reformas y fecha de verificación humana. |
| D08 | C1 excluida sólo con filtro de colección | Autorizar antes de recuperar y antes de expandir grafo, rerank, citar o descargar. El modelo no define ACL ni identidad. Corpus público separado de casos y conocimiento interno. |
| D09 | AWS WhatsApp «sin BSP»/sin costo propio | AWS actúa como proveedor de integración y cobra entrantes/salientes además de Meta. Meta sigue tratando mensajes. |
| D10 | SNS → SQS FIFO sin puente definido | EUM exige SNS estándar; no garantiza orden por teléfono. Especificar adaptador a FIFO si se necesita y manejar mensajes fuera de orden, duplicados y DLQ. |
| D11 | Seguridad del RAG/auditoría/restauración pospuesta a F8 | ACL, cuarentena, auditoría y restauración son criterios de salida de su primera fase; no endurecimiento posterior. |
| D12 | 19 semanas a 20 h/semana para todos los módulos | Es una hipótesis de 380 horas sin desglose ni contingencia. Reestimar por entregables y disponibilidad real; no comprometer fechas hasta spike y piloto. |

### Modelo de datos mínimo por entregas

No elegir un número de tablas como objetivo. La cuenta «16 tablas / 6 dominios» del doc 02 no coincide con su inventario, que enumera 20 tablas y 7 dominios y añade historial en el DDL.

**CRM operativo inicial:** personas/contactos, clientes, oportunidades e historial, canales, casos, partes, eventos, tareas, documentos/vínculos, honorarios, cuotas, pagos y asignaciones a cuotas, gastos y auditoría. Priorizar campos y restricciones antes que IA.

**Integridad a agregar:** persona puede ser representada o pagadora sin ser titular del caso; varios clientes por caso; contactos compartidos; documento de identidad por país/emisor; relación oportunidad↔casos si la contratación origina varios asuntos. `legacy_lead_id` UNIQUE para migración idempotente. No deducir que GANADO en CRM significa sentencia favorable ni que ASESORIA prueba realización de una consulta.

**Finanzas:** un pago puede cubrir varias cuotas y una cuota recibir pagos parciales. Definir asignaciones, moneda, tipo de cambio con fecha/fuente, comprobante, reversión y conciliación. Separar dinero recibido para gastos del cliente de honorarios e ingresos del despacho. Tiempo/costo de trabajo para rentabilidad; «cobrado − gastos» es margen de caja, no rentabilidad total.

**Workflows:** versiones publicadas inmutables y copia de pasos por caso; modificar plantilla no altera expedientes abiertos. Cómputo de plazo incluye norma/artículo/versionado, evento de inicio y fecha acreditada, jurisdicción, horario de corte, suspensión, feriados/vacación aplicables y confirmación humana. Una agenda manual fiable precede a una calculadora jurídica.

**Documentos:** versión física S3, checksum, vínculos, autor/fecha, permisos, estado de cuarentena y extracción; idempotencia por documento/versión/pipeline. Corregir o borrar obliga a retirar chunks, caché y relaciones, conservando auditoría y retenciones aplicables. Disponer un libro no demuestra permiso de digitalización/ingesta; registrar licencia o autorización específica.

### Dos rutas para completar el sistema

| Ruta | Entrega | Ventaja | Compromiso |
|---|---|---|---|
| A · Recomendada: MVP AWS por módulos | Cerrar API → CRM/agenda/honorarios → S3 + árbol + búsqueda textual → workflows manuales → WhatsApp → RAG evaluado | Valor operativo temprano; mantiene stack; limita automatización jurídica hasta tener corpus validado | Aurora sigue siendo candidata sujeta a costo/latencia; grafo se posterga hasta demostrar mejora |
| B · Validación de operación antes de ampliar | Cerrar API → piloto del CRM actual mejorado + biblioteca privada y agenda → comparar una solución legal comercial con requisitos reales → integrar o migrar | Comprueba hábitos y necesidades con menor desarrollo inicial | Evaluar exportación, residencia/privacidad, idioma, monedas, Bolivia/SIAT, costos y dependencia del proveedor; no presupone producto elegido |

La ruta B no elimina la corrección de seguridad del sistema actual. La elección depende de presupuesto, tiempo de desarrollo y voluntad de mantener software propio.

Los dos módulos extra del plan —plazos y finanzas— se conservan. Añadir como requisitos transversales **conflictos de interés/intake y contratación** (con revisión humana antes de aceptar), y **continuidad operativa** (recordatorios fallidos, recuperación, responsable suplente y exportación del expediente). Portal del cliente puede esperar; no debe competir con confiabilidad básica.

## 3. Research verificable y asuntos no confirmados

### AWS y PostgreSQL

1. Aurora soporta auto-pause con versiones compatibles; cómputo pausado no elimina storage ni otros cargos. La latencia de reanudación exige pruebas con timeouts y reintentos. [AWS: auto-pause](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html).
2. Data API ofrece acceso HTTP y secretos en Secrets Manager; evita VPC para Lambda, no para el clúster. Límites de resultados obligan a paginar y no almacenar PDFs en SQL. [AWS: Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html), [límites y errores](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.troubleshooting.html).
3. AWS EUM publica en SNS; no admite SNS FIFO como destino. [AWS: onboarding](https://docs.aws.amazon.com/social-messaging/latest/userguide/getting-started-whatsapp.html).
4. Tarifas propias AWS observadas: USD 0.005 por saliente y 0.001 por entrante globalmente, con excepciones en India; Meta añade su tarifa. [AWS: precios](https://aws.amazon.com/end-user-messaging/pricing/).
5. `unaccent` es STABLE en PostgreSQL 16; los índices de expresión y columnas generadas exigen funciones IMMUTABLE. Usar columnas normalizadas mantenidas por aplicación/trigger o configuración de búsqueda validada; no etiquetar una función como immutable sólo para ocultar el problema. [Código oficial](https://raw.githubusercontent.com/postgres/postgres/REL_16_STABLE/contrib/unaccent/unaccent--1.1.sql), [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html), [columnas generadas](https://www.postgresql.org/docs/current/ddl-generated-columns.html).
6. Ranking FTS nativo: ts_rank/ts_rank_cd; BM25 requiere implementación adicional. [PostgreSQL: búsqueda](https://www.postgresql.org/docs/current/textsearch-controls.html).
7. Los controles de IAM/logs/datos siguen siendo responsabilidad del proyecto aunque use Bedrock. Validar retención, logging e inference profile específico; no asumir que «AWS» implica anonimización. [AWS: protección de datos](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html).

### WhatsApp y fuentes bolivianas

- **Meta Business Agent global/gratis, USD 2/M tokens, prohibición y alcance exacto de IA, cobro desde octubre y tarifa Bolivia:** pendientes de evidencia oficial accesible. No se declara falsa la conversación anterior; se retira su uso como hecho confirmado. La página [Meta: precios](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) devolvió error; términos redirigieron a login. Guardar fecha efectiva y rate card cuando se obtengan.
- **Coexistence del número actual por AWS:** validar en cuenta/onboarding y soporte del proveedor antes de migrar. Probar historial, mensajes enviados por la abogada, pausa del bot y reversibilidad; «HUMANO» en DynamoDB no se sincroniza solo con el teléfono.
- **Fuentes:** Lexivox declara acceso libre y formatos HTML/PDF/texto en su [portal](https://www.lexivox.org/). Eso no confirma permisos de crawleo masivo ni vigencia jurídica. Gaceta falló al abrirse; priorizar carga manual de documentos oficiales con provenance verificable, y automatizar sólo tras revisar condiciones.
- **Retención de 10 años, vigencia de ley de datos, feriados/vacaciones judiciales y modalidad SIAT:** requieren verificación jurídica/fiscal por la abogada y fuentes oficiales vigentes. No son parámetros listos para producción. No cargar semillas de feriados o plazos inventadas.

### Presupuesto corregido

El rango anterior USD 65–135/mes no es una cotización validada. La suma de sus rubros ni siquiera establece ese mínimo como piso. Costear escenario de reposo, uso esperado y pico con métricas reales:

```text
Aurora = suma(ACU × horas activas × tarifa regional) + almacenamiento + I/O/backups aplicables
WhatsApp = 0.005 × salientes + 0.001 × entrantes + tarifas Meta vigentes por destino/categoría
IA = tokens entrada/salida por modelo + embeddings + rerank + OCR por páginas reales
Operación = Amplify + S3/versiones + KMS + Secrets + logs + colas + copias + monitorización
```

Añadir ingesta inicial, entornos, restauraciones y mantenimiento humano. Los volúmenes deben salir de inventario/costos reales; no mostrar KPIs ni estimaciones como si fueran transacciones del negocio.

## 4. Plan de remediación verificable

Estas tareas A2 amplían/sustituyen los criterios incompletos de F0–F8. No se marcan implementadas por haber escrito el informe.

| Orden / IDs | Entregable | Dependencia | Criterio para avanzar |
|---|---|---|---|
| 0 · A2-01 | Inventario de despliegue, rutas, grupos y datos; respaldo y rollback | Acceso AWS cuando se ejecute | Configuración efectiva contrastada con IaC; datos sensibles no se imprimen |
| 1 · A2-02/03 | JWT + permisos + aliases cerrados + cliente HTTP + TOTP | Inventario | Matriz 401/403/admin pasa y abogada usa panel |
| 2 · A2-04/05 | Reservas atómicas, validación, blog publicado, decimales, versiones | API protegida | Concurrencia/reintentos y publicación aprobados |
| 3 · A2-06/07 | Cuotas chat, tools idempotentes, errores factuales, pagos/QR honestos | Validación y políticas | Sin duplicados ni afirmaciones de entrega inexistente |
| 4 · A2-08 | PITR, state remoto, logs, alertas, presupuesto y restore | Inventario | Restauración y notificación verificadas; locking funciona |
| 5 · A2-09 | Spike PostgreSQL/Data API, migración ejecutable, KPI correcto | Elección arquitectura | DDL desde cero; FK/importe/ACL; latencia tras pausa y costo medidos |
| 6 · A2-10 | CRM operativo y alta rápida transaccional | Modelo validado | Un caso real piloto con conflictos, honorarios y agenda manual; rollback y dedupe |
| 7 · A2-11 | S3 privado + árbol + vínculos/versiones + búsqueda textual | CRM y restore | Subida/cuarentena, permisos y descarga auditada desde primera entrega |
| 8 · A2-12 | Workflows versionados y plazos revisados | Procedimientos reales | Casos de cómputo revisados por abogada; cambio de plantilla no altera casos abiertos |
| 9 · A2-13 | WhatsApp operativo con handoff, reintentos/DLQ y prueba de coexistence | Tarifas/condiciones y CRM | Tomar control silencia bot incluso con mensajes en vuelo; destinatario verificado |
| 10 · A2-14 | RAG normativo piloto, luego interno por permisos | Corpus autorizado | Recuperación/citas/vigencia evaluadas; pruebas de fuga e inyección; abstención |
| 11 · A2-15 | Piloto de adopción, exportación y soporte | Flujo completo | La abogada resuelve una jornada sin ayuda; respaldo/exportación utilizable |

Para RAG, 50 preguntas reales son un arranque de evaluación, no prueba universal de ausencia de alucinaciones. Separar conjunto de ajuste y evaluación; medir exactitud jurídica revisada, cobertura, cita fiel, abstención y fuga de datos. No activar expansión grafo hasta demostrar mejora frente a búsqueda híbrida sin grafo.

## 5. Decisiones necesarias antes de implementar

1. Presupuesto mensual máximo y horas de mantenimiento; comparar costo medido de opciones, no aprobación ciega de Aurora.
2. Política de aceptación/conflictos, titular del caso, pagador y datos mínimos que necesita la abogada.
3. Carpeta documental real y plantillas autorizadas; taxonomía validada con búsqueda de documentos reales.
4. Número y operación diaria de WhatsApp: teléfono, bandeja, horario humano y responsable de urgencias.
5. Reglas procesales/retención y facturación vigentes aprobadas por la abogada; no permitir que el modelo las invente.

La auditoría y su documentación están completas. Todas las remediaciones de código/infraestructura permanecen pendientes y visibles en [global_tasks.md](../global_tasks.md).
