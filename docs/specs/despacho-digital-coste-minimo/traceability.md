# Trazabilidad y propiedades verificables

Cada grupo R tiene criterios en [requirements.md](requirements.md), mecanismo en [design.md](design.md) y tareas en [tasks.md](tasks.md). E0 tiene código y pruebas locales y un inventario AWS real: [avance](../../operations/e0-progress.md). La evidencia local no cierra controles que necesitan despliegue, IAM real, MFA o restauración.

| Requisito | Diseño principal | Tareas | Evidencia de salida |
|---|---|---|---|
| R01 | ADR LC-01/03/05/09, cuotas §9, cost-model | T01,T09,T10,T12,T29,T31,T36 | Gasto/units trazables; cuota suspendida conserva núcleo |
| R02 | Límites §2, identidad/rutas §3, ACL §7 | T03,T04,T13,T23,T35 | Matriz 401/403/IDs ajenos; público sin corpus privado |
| R03 | Contratos §6, transacciones §5 | T05,T06,T07,T13 | Replay estable, versión obsoleta rechazada, auditoría atómica |
| R04 | Rutas §3 y UI §6 | T07,T08 | Sólo publicados/activos reales; confirmaciones con acuse |
| R05 | Slot transaccional §5, agenda §8 | T06,T10,T17,T27 | Concurrencia, zona y reprogramación sin doble reserva |
| R06 | Personas/relaciones §4, alta §5 | T12,T14,T15,T16 | Contacto compartido, conflictos revisados, migración idempotente |
| R07 | Alta §5/UI §6/IA §9 | T16,T20,T29 | Alta sin IA en tiempo objetivo y sin escrituras parciales |
| R08 | Índices §4 y biblioteca §7 | T21,T22,T23,T24,T26 | Archivo bloqueado en cuarentena, ACL/versions/lifecycle |
| R09 | Procedimientos §8 | T25,T26 | Workflow v2 no muta instancia v1; generación con datos reales |
| R10 | Plazos/recordatorios §8 | T17,T27,T28 | Cambio de fecha, caída/replay y revisión jurídica |
| R11 | Dinero §4/5 | T05,T18 | Asignación/reversión exacta, no sobreasignación |
| R12 | Agregados §8 | T19,T30 | Rebuild = agregados; múltiples pagos no inflan conversión |
| R13 | Agente/cuotas §9 | T09,T29,T33 | Tools validadas, sin falsa confirmación ni bypass de cuota |
| R14 | WhatsApp §9 | T31,T32,T33 | Firma, dedupe, humano controla, identidad por caso |
| R15 | Corpus/RAG §9 | T34,T35 | Citas verificables, vigencia, abstención y aislamiento |
| R16 | Migración/operación §10 | T02,T10,T11,T20,T24,T26,T36 | Restore/exportación/CI/runbook y docs vigentes |

## Auditoría → solución

| Hallazgo / tareas anteriores | Tratamiento nuevo |
|---|---|
| A01–A02 / A2-01..03 | T01–T04: rutas/JWT/grupo/UI/MFA coordinados |
| A03 / A2-04 | T05–T06: validación y slots atómicos |
| A04–A06 / A2-05 | T05,T07,T18,T19: publicación, cursores, dinero y granularidad |
| A07 / A2-06 | T09: idempotencia, cuotas, tools y fallos factuales |
| A08 / A2-07 | T08: QR/acuse reales |
| A09 / A2-08 | T02,T10,T24: state, recuperación y entrega notificaciones |
| A10 | T11 y modularización incremental; sin tests live por defecto |
| A2-09 | T12: spike DynamoDB por access patterns; Aurora deja de ser dependencia |
| A2-10 | T14–T20: CRM/alta/agenda/finanzas y piloto |
| A2-11 | T21–T24: documentos privados, búsqueda metadata y exportación |
| A2-12 | T25,T27,T28: workflow/versiones/plazos |
| A2-13 | T31–T33: WhatsApp manual primero; API condicionada |
| A2-14 | T34–T35: RAG después de corpus y benchmark |
| A2-15 | T20,T26,T36: adopción, operación y gasto real |

## Propiedades de corrección

| ID | Invariante | Prueba significativa |
|---|---|---|
| C01 | Ningún actor público obtiene datos privados por ruta, alias o URL nueva | Matriz de acceso a todas las rutas/recursos; firma no equivale a ACL |
| C02 | Por slot sólo existe una reserva activa | Concurrencia real staging + cancelación/reprogramación con fallo |
| C03 | Repetir comando no duplica entidad ni movimiento | Reintento tras timeout/post-commit y misma key con otro body |
| C04 | Dinero conservado: asignado ≤pago; saldo = cuota −asignaciones +reversiones | Secuencias de pagos parciales, monedas, ajustes y concurrencia |
| C05 | Ningún archivo sin resultado limpio se publica/indexa | Scanner falla, evento duplicado, MIME falso y objeto reemplazado |
| C06 | Nueva plantilla no cambia casos previos | Instanciar v1, publicar v2, comparar contenido/versiones |
| C07 | Cuota agotada bloquea opcional, conserva operación esencial | Reservas concurrentes al límite, timeout y CRM aún funcional |
| C08 | Métrica no depende de página ni cantidad de pagos por oportunidad | Comparar paginación/replay/rebuild y múltiples pagos |
| C09 | Handoff impide nuevos envíos del bot después de adquirir control | Carrera entre respuesta modelo, send y tomar control; registrar vuelo previo |
| C10 | Revocación de acceso afecta recuperación, referencias y exportación nuevas | Documento/caso revocado antes de búsqueda y firma de descarga |
| C11 | Restore recupera vínculos/documentos y exportación abre fuera del sistema | Restauración aislada y verificación checksums/inventario |
| C12 | Alerta de fecha anterior no se envía tras cambio de plazo | Reintento atrasado, nueva versión y caída del worker |

Las propiedades no certifican seguridad absoluta ni exactitud jurídica universal. Registrar evidencia observada, entorno, commit/versión, fecha y límites; no completar checkboxes por la mera existencia de un test.
