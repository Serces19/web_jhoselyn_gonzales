# 07 — Módulos sugeridos (lo que falta para operar el despacho completo)

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Respuesta a: *"¿Algún componente que nos estemos olvidando? ¿Algún módulo importante para el negocio?"*
> Se proponen **dos módulos prioritarios** y una lista corta de complementos.

---

## Sugerencia 1 ⭐ — Motor de plazos procesales y vigilancia judicial (Agenda Procesal)

**Por qué es crítico:** en un despacho unipersonal, el mayor riesgo de negocio no es perder un lead sino **perder un plazo** (apelación, contestación, observación) → mala praxis, pérdida del caso y del cliente, responsabilidad profesional. El CRM y el marco de trabajo sin un motor de plazos quedan cojos. Todo software legal serio (Clio, Actionstep, etc.) lo trae como núcleo ("rules-based calendaring").

**Qué incluye:**
1. **Calculadora de plazos** con calendario judicial boliviano:
   - Tabla `feriados` (nacionales + departamentales de Cochabamba, p.ej. 14 de septiembre) y `vacaciones_judiciales` (descanso judicial colectivo de fin de año e invierno, según resolución anual del Consejo de la Magistratura).
   - Tabla `reglas_plazo` definidas por la abogada: `{acto: 'apelacion_auto_definitivo', norma: 'Ley 439 art. …', dias: N, habiles: true, computo_desde: 'notificacion'}`.
   - Entrada: "fui notificada el 03/10 con la sentencia" → propone vencimiento, ella confirma → `tareas_plazos`.
2. **Alertas escalonadas** (EventBridge Scheduler): 7/3/1 días y el mismo día 08:00 — push en panel + email (SES) + WhatsApp a su número personal. Plazos `critica` no se pueden descartar sin marcar "hecho".
3. **Agenda unificada**: citas (Appointments) + audiencias + plazos + cobros en una sola vista (día/semana) y exportable a Google Calendar (feed ICS privado firmado).
4. **Vigilancia judicial**: registro de NUREJ por caso y enlace directo a los servicios del Órgano Judicial (**Buzón Judicial / Notificaciones electrónicas** vía Ciudadanía Digital). Fase posterior: ingesta de notificaciones recibidas por correo → parser → evento en el caso + plazo propuesto. (No se automatiza scraping de portales con login.)
5. **Tablero "Hoy"**: plazos que vencen hoy/semana, audiencias, conversaciones en espera.

**Tablas:** `feriados(fecha, ambito, descripcion)`, `reglas_plazo(...)`, se reutiliza `tareas_plazos` (doc 02).
**Esfuerzo:** ~2 semanas. **Dependencias:** Fase 2 (CRM).

---

## Sugerencia 2 ⭐ — Finanzas del despacho: honorarios, cobranza y facturación SIAT

**Por qué:** el CRM mide el embudo pero el negocio vive del **cobro**. Hoy no hay registro de cuánto se pactó, cuánto se cobró, qué se debe ni facturación. En Bolivia el ejercicio profesional independiente debe facturar por el **SIAT** del SIN (modalidades: Portal Web en Línea, Computarizada en Línea, Electrónica en Línea), con NIT activo.

**Qué incluye:**
1. **Propuesta de honorarios** desde plantilla (doc 03) con 3 opciones (fijo / por etapas / cuota litis) → PDF + enlace por WhatsApp; aceptación registrada (etapa `ganado`).
2. **Contrato de honorarios** generado con datos del caso; firma: presencial escaneada o firma digital (ADSIB / Ciudadanía Digital — verificar viabilidad para contratos privados).
3. **Plan de cuotas** vinculado a hitos del workflow (`es_hito_cobro`, doc 05): al completar "Presentar demanda" se activa la cuota correspondiente.
4. **Cobranza automática**: recordatorios WhatsApp (plantilla `recordatorio_pago`) 3 días antes y al vencer; aging de cartera en el tablero.
5. **Registro de pagos**: QR (Simple/BNB), transferencia, efectivo, exterior (USD/EUR con tipo de cambio) → `movimientos`, comprobante a S3.
6. **Gastos del caso** (aranceles judiciales, timbres, fotocopias, peritos, pasajes) reembolsables vs. absorbidos → rentabilidad real por caso.
7. **Facturación SIAT**:
   - Fase 1 (simple): la abogada emite en el Portal Web del SIN; el sistema registra número/CUF y adjunta el PDF → `facturas`.
   - Fase 2 (si el volumen lo justifica): integración con un proveedor autorizado o la modalidad Electrónica en Línea vía servicios web del SIN (requiere certificación del sistema y firma digital — evaluar costo/beneficio).
8. **Reportes**: ingresos por mes/área/canal, cartera vencida, rentabilidad por caso, flujo de caja proyectado (cuotas futuras).

**Esfuerzo:** ~2–3 semanas (sin integración SIAT directa). **Dependencias:** Fase 2.

---

## Complementos (backlog priorizado)

| Prioridad | Módulo | Valor |
|---|---|---|
| Alta | **Portal del cliente** (login con código por WhatsApp/OTP): ver estado público del caso, subir documentos, pagar cuotas, descargar facturas | Menos mensajes "¿cómo va mi caso?"; imagen profesional; clave para clientes en EEUU |
| Alta | **Seguridad y cumplimiento** (doc 08): MFA, auditoría, backups, cifrado | Secreto profesional; obligatorio antes de subir expedientes |
| Media | **Marketing de contenidos asistido**: del conocimiento anonimizado → borradores de posts para blog/Instagram/TikTok; UTM por publicación para medir canal en el CRM | Cierra el ciclo captación ↔ métricas |
| Media | **Encuesta de satisfacción / NPS + pedido de reseña Google** al cerrar el caso (WhatsApp) | Reseñas = principal activo de captación local |
| Media | **Asistente de redacción** en el marco de trabajo: borrador de memorial desde plantilla + hechos + normas citadas (revisión obligatoria) | Ahorro de horas |
| Baja | **Control de tiempo** (timer por caso) | Útil si cobra por hora o para medir rentabilidad |
| Baja | **Multi-usuario** (asistente/pasante con permisos por rol) | Cuando el despacho crezca |
