# 06 — Capa 6: Atención al cliente por WhatsApp con asistente IA y derivación a la abogada

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Objetivo: responder automáticamente lo reconocible (horarios, tarifas, agendar, estado del caso, documentos a traer), y **pasar a la abogada** cuando la intención no es clara, el caso es complejo o la conversación llega naturalmente al punto de intervención humana.
> **Decisión pendiente de la abogada/Sergio:** elegir opción en §3. Recomendación: **Opción C**.
> Revisión 2026-10-13: recomendación condicional; ver [segunda auditoría](../audits/11_segunda_auditoria_2026-10-13.md). Disponibilidad, tarifas y políticas Meta de §1/opción A no están confirmadas por fuente oficial accesible. AWS cobra además USD 0.005/saliente y 0.001/entrante (global salvo excepciones), más Meta: [precios oficiales](https://aws.amazon.com/end-user-messaging/pricing/).

---

## 1. Contexto regulatorio y de precios WhatsApp (2026)

| Hecho | Impacto |
|---|---|
| Desde **15-ene-2026** Meta prohíbe **chatbots de IA de propósito general** en la WhatsApp Business Platform; se permiten bots específicos del negocio (soporte, reservas, ventas) | Nuestro asistente debe estar acotado al despacho (ya lo está). Nada de "pregúntame lo que quieras" |
| Facturación **por mensaje** desde jul-2025: marketing siempre se cobra; utility/autenticación gratis dentro de la ventana de 24 h | Recordatorios de cita = plantilla *utility* |
| Según fuentes secundarias, desde **1-oct-2026** los mensajes de servicio (respuestas dentro de la ventana de 24 h) pasan a cobrarse por mensaje (~USD 0.003 en EEUU; tarifa Bolivia a confirmar en la tabla oficial de Meta) | Costo bajo al volumen del despacho; **verificar en la tabla oficial antes de decidir** |
| **Meta Business Agent** (IA de Meta) disponible globalmente desde jun-2026: gratis en la app WhatsApp Business; en la API cobra USD 2 / 1 M tokens desde 1-ago-2026 | Opción de cero código (Opción A) |
| Ventana de 24 h: fuera de ella sólo se puede escribir con **plantillas aprobadas** | Seguimientos del embudo → plantillas |

## 2. Requisitos funcionales

1. Responder en < 10 s, 24/7, en español cálido (mismo "Método de Escucha" del chat web).
2. Intenciones automatizables: info del despacho, tarifas y pagos, agendar/reprogramar cita, estado de mi caso (cliente verificado), lista de documentos, recibir documentos (fotos/PDF → S3 caso), recordatorios.
3. Derivación a la abogada (handoff) con resumen; el bot **se calla** mientras ella atiende.
4. Todo queda en el CRM: persona (por teléfono), oportunidad, interacciones, documentos.
5. La abogada puede seguir usando WhatsApp desde su teléfono (ver *coexistence* en §3).
6. Nunca dar asesoría jurídica concluyente ni prometer resultados; nunca revelar datos de un caso a un número no verificado.

## 3. Opciones evaluadas

| | **A. Meta Business Agent en la app WhatsApp Business** | **B. WhatsApp Cloud API directa (Meta) + Lambda + Bedrock** | **C. AWS End User Messaging Social + Lambda + Bedrock** ⭐ | **D. BSP / plataforma (respond.io, Twilio, 360dialog, Chatwoot)** |
|---|---|---|---|---|
| Esfuerzo | Mínimo (configurar en la app) | Medio | Medio | Bajo-medio |
| Costo fijo | 0 | 0 | 0 | USD 50–300/mes (planes) + mensajes |
| Integración con nuestro CRM/casos | Limitada (conecta APIs externas, pero lógica y datos fuera de nuestro control) | Total | Total | Media (webhooks) |
| Control del prompt / ética legal | Bajo | Total | Total | Medio |
| Handoff a la abogada | Nativo en la app | Construir | Construir | Nativo (bandeja) |
| Datos sensibles | Procesados por Meta AI | Nuestro AWS + Bedrock | Nuestro AWS + Bedrock | Tercero adicional |
| Webhook / infraestructura | — | Exponer webhook HTTPS, verificar firma, gestionar token de Meta | Eventos ya llegan a **SNS** con IAM; sin webhook público; facturación en la cuenta AWS | Del proveedor |
| Encaje con el stack actual (Lambda, Bedrock, Terraform) | Nulo | Alto | **Máximo** | Bajo |

**Recomendación: C** — misma arquitectura del chat web (reutiliza `agent_core.py`), sin servidor ni webhook público, seguridad IAM, y el CRM es la fuente de verdad.
**Plan B rápido:** si se necesita algo *ya* mientras se construye C, activar **A** temporalmente en la app (gratis) con FAQ básica — sin datos de casos.

**Coexistence:** Meta permite usar el mismo número en la app WhatsApp Business y en la Cloud API simultáneamente (los mensajes se reflejan en ambos). Es lo que permite que la abogada siga contestando desde su teléfono. **Verificar** en la Fase 6.0 que esté disponible para números de Bolivia (+591) y con el onboarding de AWS End User Messaging Social; si no, usar un número nuevo dedicado al bot.

## 4. Arquitectura (Opción C)

```
Cliente WhatsApp
   │
   ▼
Meta Cloud API ──► AWS End User Messaging Social (WABA vinculada)
                         │ evento entrante
                         ▼
                    SNS estándar ──► SQS estándar ──► adaptador ──► SQS FIFO por conversación
                                                 │
                                                 ▼
                                         Lambda wa_inbound
                                          1. Idempotencia (message_id en DynamoDB, TTL 7 d)
                                          2. Resolver persona por teléfono (Aurora)
                                          3. ¿Conversación en modo HUMANO? → sólo registrar y notificar
                                          4. Media (foto/PDF/audio) → S3 _ingesta + Transcribe si audio
                                          5. Router de intención (Haiku, JSON) ─┐
                                          6. Política de escalamiento ◄─────────┘
                                          7. Responder (Haiku + tools) o HANDOFF
                                          8. Registrar interacción + actualizar oportunidad
                                                 │
                                                 ▼
                                   socialmessaging:SendWhatsAppMessage
```

Estado de conversación (DynamoDB `WaConversations`, PK `telefono`):
`modo` (`BOT` | `HUMANO` | `CERRADA`), `ultima_entrante_en` (ventana 24 h), `intencion_actual`, `turnos_bot`, `fallos_comprension`, `oportunidad_id`, `caso_id`, `verificado` (bool), `resumen_rolling`.

EUM no admite SNS FIFO como destino ([onboarding AWS](https://docs.aws.amazon.com/social-messaging/latest/userguide/getting-started-whatsapp.html)). El adaptador publica MessageGroupId por conversación y dedupe por message_id; FIFO no reconstruye el orden original de eventos recibidos fuera de orden. Agregar DLQ, versionado de estado y revisión de HUMANO justo antes del envío. `verificado` necesita método/fecha/expiración y autorización por caso; un teléfono por sí solo no identifica a su titular.

## 5. Router de intenciones

| Intención | Ejemplo | Acción | Auto |
|---|---|---|---|
| `saludo_info` | "Hola, ¿dónde queda la oficina?" | Responder con `bufete_knowledge` | ✅ |
| `tarifas_pagos` | "¿Cuánto cuesta la consulta?" | Tarifas + métodos de pago | ✅ |
| `agendar` | "Quiero una cita el jueves" | Tool `get_availability` / `create_appointment` | ✅ |
| `reprogramar_cancelar` | "No puedo ir mañana" | Tool sobre `Appointments` | ✅ |
| `nuevo_caso` | "Mi ex no paga la pensión" | Escucha empática (método actual) + captura → oportunidad | ✅ hasta calificar, luego handoff |
| `estado_caso` | "¿Cómo va mi trámite?" | Requiere `verificado`; responde con último evento **público** del caso | ✅ si verificado |
| `enviar_documento` | (foto de CI) | Guardar en S3 del caso, confirmar recepción | ✅ |
| `consulta_juridica_especifica` | "¿Puedo quitarle la custodia si…?" | Orientación general + handoff | ⚠️ handoff |
| `urgencia` | "Me detuvieron", "violencia", "audiencia hoy" | Handoff inmediato + alerta push a la abogada + números de emergencia si violencia (Ley 348) | 🚨 handoff |
| `queja_pago_honorarios` | "No estoy conforme con el cobro" | Handoff | 👤 |
| `otro / no_entendido` | — | Una repregunta; al 2º fallo → handoff | ⚠️ |

## 6. Política de escalamiento (handoff)

Se pasa a modo `HUMANO` si se cumple **cualquiera**:
1. Intención en {`urgencia`, `queja_pago_honorarios`, `consulta_juridica_especifica`} o el cliente pide hablar con la abogada.
2. `confianza` del router < 0.6 dos veces seguidas (`fallos_comprension ≥ 2`).
3. Sentimiento muy negativo/angustia alta detectado (de `emotional_state`).
4. Oportunidad calificada (nombre + relato + área) lista para propuesta — **punto natural de intervención**.
5. Cliente con caso activo pregunta algo no cubierto por el estado público del caso.
6. `turnos_bot ≥ 8` en la misma conversación sin resolución.

Al escalar:
- Bot al cliente: *"Gracias por contarme. Le paso su consulta a la Dra. Jhoselyn, que le escribirá personalmente {estimado según horario}."* (sin prometer resultado).
- A la abogada: notificación (push del panel + WhatsApp a su número personal vía plantilla utility o SNS/email) con **resumen de 5 líneas**, intención, urgencia y enlace a la conversación en `/admin/whatsapp`.
- Vuelve a `BOT` sólo cuando ella pulsa "Devolver al asistente" o tras 48 h sin actividad.

## 7. Bandeja `/admin/whatsapp`

- Lista de conversaciones con chips: 🤖 bot / 👤 espera abogada / 🚨 urgente; ordenadas por SLA.
- Vista de chat + panel lateral con la ficha CRM (persona, oportunidad/caso, documentos recibidos).
- Responder desde el panel (dentro de 24 h texto libre; fuera, selector de plantillas aprobadas).
- Botones: Tomar control · Devolver al bot · Crear caso desde la conversación (abre alta rápida precargada, doc 04).

## 8. Plantillas de mensaje (a aprobar por Meta)

| Nombre | Categoría | Uso |
|---|---|---|
| `recordatorio_cita_24h` | utility | Recordatorio con fecha/hora/dirección |
| `confirmacion_cita` | utility | Tras agendar desde la web |
| `docs_pendientes` | utility | Lista de documentos a traer |
| `actualizacion_caso` | utility | "Hay novedades en su caso, escríbanos para detalles" (sin datos sensibles) |
| `recordatorio_pago` | utility | Cuota próxima a vencer |
| `seguimiento_propuesta` | marketing | Seguimiento del embudo (sólo con opt-in) |

## 9. Seguridad y ética (resumen; detalle en doc 08)

- Verificación de identidad para `estado_caso`: teléfono registrado + últimos 3 dígitos del CI o código del caso.
- Primer mensaje de cada conversación nueva: aviso de privacidad breve + "soy un asistente virtual del despacho".
- Datos de menores: nunca se repiten en mensajes salientes.
- Logs con PII redactada; conversación completa sólo en tablas cifradas.

## 10. Costos estimados (orden de magnitud, a validar)

Supuesto: 300 conversaciones/mes, 10 mensajes c/u.
- Mensajes WhatsApp de servicio: ~3 000 × tarifa Bolivia (≤ USD 0.01) → **< USD 30/mes** (si aplica el cobro desde oct-2026).
- Bedrock Haiku: ~3 000 llamadas × ~3 k tokens → **≈ USD 10–15/mes**.
- Lambda/SNS/SQS/DynamoDB: **< USD 2/mes**.
