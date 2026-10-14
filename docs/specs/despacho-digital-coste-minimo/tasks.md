# Tasks — Plan de implementación

E0 en implementación (2026-10-14). Sólo marcar completa una tarea cuando exista su evidencia de salida; código local probado no equivale a rollout. Avance técnico y pendientes: [e0-progress.md](../../operations/e0-progress.md). Ejecutar en orden de dependencia; cada tarea entrega código/IaC, prueba pertinente y docs actualizadas. No usar experimentos live como suite offline.

Requisitos: [requirements.md](requirements.md). Diseño: [design.md](design.md). Criterios de cobertura: [traceability.md](traceability.md). Sustituye la ruta obligatoria Aurora del antiguo F2 y el endurecimiento tardío de F8; no sustituye evidencias de la auditoría.

## E0 — Cerrar fallos actuales y establecer control de costos

- [x] **T01 — Inventario y baseline**
  - Evidencia: [baseline.md](../../operations/baseline.md) y metadatos AWS reales; costo específico del despacho se declara desconocido en ausencia de atribución. Perfil Administrador comprobado.
  - Inspeccionar estado Git y configuración AWS efectiva de Gateway, Lambda, Cognito, DynamoDB, Amplify y notificaciones; contrastar con IaC sin imprimir PII/secretos. Obtener gasto por servicio/uso y volumen real disponible.
  - Salida: `docs/operations/baseline.md`, diferencias, tarifas fechadas y recursos sin propietario. Gasto no disponible se marca desconocido.
  - Dependencias: ninguna. _Requirements: R01.1, R01.5, R16.1_
- [x] **T02 — Respaldo, state y entornos**
  - Evidencia: S3 states separados/versiones/lock, seis backups, restore de cuatro citas idénticas, staging probado y 32 recursos retirados. Rollout sin destrucciones productivas; plan final [sin cambios](../../operations/terraform-stability.json), [restore](../../operations/restore-verification.json) y [limpieza](../../operations/staging-cleanup.json).
  - Resguardar state/datos; bootstrap bucket S3/versioning/lock, migración del state, versiones providers/lock; staging aislado con misma arquitectura por uso. Comprobar que no se recrean recursos persistentes.
  - Salida: plan revisable, `docs/operations/deploy-rollback.md` y restauración inicial. Verificar dos ejecuciones Terraform sin cambio inesperado.
  - Dependencias: T01. _Requirements: R16.1, R16.2_
- [x] **T03 — Contención de rutas privadas**
  - Evidencia: 14 tests offline, JWT/Admins/firma/scope reales en staging y endpoints privados 401 en producción. Ver [staging-verification.json](../../operations/staging-verification.json) y [deployment-verification.json](../../operations/deployment-verification.json).
  - Inventariar método/ruta/alias y cerrar acceso anónimo actual; JWT y permiso Admins; sin fallback público administrativo. Añadir IAM mínimo y matriz de accesos.
  - Salida: tests sin token/vencido/issuer-client incorrectos/no admin/admin en citas, blog write, horario, CRM y pro bono; alias chat/leads incluido.
  - Dependencias: T01 y respaldo inicial T02. _Requirements: R02.1, R02.2, R02.4, R02.5_
- [x] **T04 — Cliente autenticado y MFA**
  - Evidencia: usuario confirmó ingreso con autenticador; job Amplify 22 SUCCEED, refresh/access-token/errores y enrolamiento implementados. Login y usuario sin grupo comprobados con Cognito/Gateway en staging; [recuperación](../../operations/mfa-recovery-verification.json) con pool ON. Política final OPTIONAL por decisión del usuario; no se acredita MFA obligatorio global.
  - Crear cliente API común con access token, refresh, 401/403; login TOTP/enrollment/challenges/recuperación, cierre de auto-registro y eliminación del formulario de registro engañoso.
  - Salida: prueba E2E con admin y usuario sin grupo; logout limpia datos; TOTP/enrollment y recuperación probados con la política aprobada. Usuario decidió mantener MFA OPTIONAL (LC-11); no cambiar a ON. Desplegar coordinado con T03 para evitar ventana pública.
  - Dependencias: T03. _Requirements: R02.3, R02.4_
- [x] **T05 — Validación y contrato de errores**
  - Evidencia: [contracts-verification.json](../../operations/contracts-verification.json), errores reales y dinero exacto contra Lambda/DynamoDB aislados, además de suite offline.
  - Schemas por ruta, tamaños/enums, dinero exacto, JSON inválido, existencia/versiones; response envelope/request_id, sin detalles internos.
  - Salida: 400/422/404/409/413 reproducibles; 123.45 conserva valor por contrato; ID inexistente no crea registro.
  - Dependencias: T03. _Requirements: R03.1, R03.3, R11.3_
- [x] **T06 — Reservas atómicas e idempotentes**
  - Evidencia: tres slots reales migrados sin conflictos; concurrencia, replay, reprogramación y cancelación atómicos en [staging-verification.json](../../operations/staging-verification.json); agenda pública 200.
  - Crear locks de slots, versionar horarios, fijar estado inicial, validar zona/fecha y migrar citas existentes detectando duplicados; transacciones cancelar/reprogramar y claves persistidas.
  - Salida: dos solicitudes concurrentes → una reserva; reintento devuelve mismo ID; ningún cambio parcial si falla transacción.
  - Dependencias: T05. _Requirements: R03.2, R05.1, R05.2, R05.3, R05.4_
- [x] **T07 — Blog y paginación**
  - Evidencia: borrador oculto/lista/slug, publicación y unicidad reales en staging; cursor completo/sin duplicados/rechazo inválido en [contracts-verification.json](../../operations/contracts-verification.json); suite offline y frontend desplegado consumen paginación.
  - Separar consulta admin/pública, comprobar published por lista/slug, índice/mapa slug único; cursores de citas/leads/blog y estados error vacíos diferenciados.
  - Salida: borrador público 404; varias páginas completas y sin duplicación; cursor inválido rechazado.
  - Dependencias: T05. _Requirements: R03.4, R04.2_
- [ ] **T08 — Corregir confirmaciones y contenido**
  - Usuario aprobó contenido existente operativamente. Aviso factual `/privacidad` y enlaces en formularios implementados; revisión jurídica/retención de expedientes permanece abierta antes del piloto. Ver [privacy-review.md](../../legal/privacy-review.md).
  - Retirar QR decorativo y recepción de comprobante/contacto no acreditada; inventariar activos/tarifas reales, revisar instrucciones y política de datos; recibir lotes de textos/fotos de la abogada.
  - Salida: popup bloqueado o cancelación no muestra enviado; no aparecen datos bancarios inventados; checklist de contenido aprobado.
  - Dependencias: ninguna para corregir estados; datos reales para publicar lote. _Requirements: R04.1, R04.3, R04.4, R04.5_
- [ ] **T09 — Cuotas, idempotencia y fallos del chat**
  - Implementar controles OperationControl, cuota global y por sesión/origen, max entrada/salida/iteraciones, historial por turnos, lead idempotente y persistencia versionada. Probar errores de herramientas y segunda llamada.
  - Salida: crear sesiones no supera cuota global; fallo no confirma ficha; duplicados y turnos concurrentes no pierden datos. Desactivar inferencia sin cuota/tarifa configurada.
  - Dependencias: T05. _Requirements: R01.3, R01.4, R13.1, R13.2, R13.3, R13.4, R13.5_
- [x] **T10 — Recuperación, alertas y observabilidad mínima**
  - Usuario aprobó un destinatario y USD 20 mensual, confirmó SNS y recepción de prueba. Project activo, avisos 16/20/pronóstico20, sin hard cap. PITR/logs/alarma/restore comprobados; objetivos futuros del piloto no se declaran medidos. [Verificación](../../operations/alerts-budget-verification.json) y [procedimiento](../../operations/checks-and-alerts.md).
  - PITR, retención logs/redacción, flags, métricas de consumo, alarma de cola/error y presupuesto; canal real de notificación con confirmación. Runbook restore y objetivos medidos.
  - Salida: prueba de recuperación, aviso recibido, fallo visible y gasto estimado/facturado distinguido; presupuesto no se anuncia como hard cap.
  - Dependencias: T02, T09. _Requirements: R01.1, R01.2, R01.5, R05.5, R16.2, R16.5_
- [ ] **T11 — Puerta E0 y CI**
  - Separar scripts live, fijar dependencias uv/npm, build/lint/pruebas focalizadas antes del release; documentar despliegue coordinado/rollback. LC-12: control local reproducible en lugar de GitHub Actions por decisión del usuario; no exigir resolver facturación GitHub para publicar.
  - Salida: matriz A01–A09 cerrada o con remanentes explícitos no bloqueantes; no cargar expedientes hasta cerrar P0. Registrar evidencia y pendientes reales.
  - Dependencias: T03–T10. _Requirements: R02.1, R03.1, R16.4, R16.5_

## E1 — CRM, alta, agenda y dinero reales

- [ ] **T12 — Validar modelo DynamoDB y patrones**
  - Implementar contratos/ítems/repositorios y GSI propuestos; medir consultas y transacciones con límites; definir relación múltiple cliente/caso/pagador y referencias de identidad por país/emisor.
  - Salida: ADR LC-01 y `docs/data/access-patterns.md`; ninguna consulta interactiva depende de scan completo; costo por operación capturado.
  - Dependencias: T11. _Requirements: R01.2, R03.4, R06.1, R06.3_
- [ ] **T13 — Primitivas transaccionales y outbox**
  - Versiones, claves idempotentes con payload hash, auditoría, Streams→cola, DLQ y reconciliación de pendientes. IAM público sin lectura core privado.
  - Salida: fallo después de commit no pierde evento; replay no duplica efectos internos; efecto externo ambiguo queda pendiente de revisión.
  - Dependencias: T12. _Requirements: R03.2, R03.3, R03.5, R02.5_
- [ ] **T14 — Personas y conflictos**
  - UI/API contactos, lookup exacto y candidatos por nombre, vínculos históricos; decisión de conflicto auditada; distinguir propietario/titular/pagador/representado.
  - Salida: teléfono familiar compartido mantiene personas distintas; candidatos sensibles sólo admin; caso no se activa sin revisión.
  - Dependencias: T13. _Requirements: R06.1, R06.3, R06.4_
- [ ] **T15 — Oportunidades y migración**
  - Kanban/historial/canales/motivo de pérdida; snapshot ChatLeads, mapeo, dry-run, import idempotente, reconciliación y corte con rollback descrito.
  - Salida: misma migración ejecutada dos veces no duplica; ambiguos en revisión; UI no interpreta ganado como sentencia favorable.
  - Dependencias: T14. _Requirements: R06.2, R06.5, R03.4_
- [ ] **T16 — Casos y alta rápida**
  - Relato original, partes, revisión conflictos, oportunidad/caso, evento inicial; plantilla de formulario móvil sin dependencia IA. Borradores para altas mayores que límite transaccional.
  - Salida: persistencia todo/nada, reintento estable y objetivo de tiempo probado con la abogada.
  - Dependencias: T14, T15. _Requirements: R07.1, R07.2, R07.4, R06.3_
- [ ] **T17 — Agenda interna y tareas**
  - Vincular citas/caso/oportunidad, tareas y vencimientos manuales con evidencia de inicio/confirmación, vistas por día/semana y estado.
  - Salida: zona explícita; audiencia/plazo no se calcula por IA; asociación no altera exclusión de slots.
  - Dependencias: T06, T16. _Requirements: R05.4, R10.1_
- [ ] **T18 — Finanzas básicas**
  - Contratos/honorarios/cuotas, pagos parciales/múltiples asignaciones, gastos/fondos de cliente, monedas, reversión y adjunto SIAT manual. Metadata documental hasta que E2 habilite subida.
  - Salida: concurrencia no sobreasigna; reversión restaura saldo; no mezclar monedas ni marcar cobro desde captura.
  - Dependencias: T13, T16. _Requirements: R11.1, R11.2, R11.3, R11.4, R11.5_
- [ ] **T19 — KPIs iniciales y conciliación**
  - Materializar etapas/casos/pactado/cobrado/vencido por moneda desde eventos, markers de consumo, rebuild paginado, actualizado_en.
  - Salida: varios pagos de una oportunidad no aumentan conversión; replay no duplica; agregados coinciden con reconstrucción.
  - Dependencias: T15, T18. _Requirements: R12.1, R12.2, R12.3, R12.4_
- [ ] **T20 — Piloto E1**
  - Jornada con datos reales autorizados: intake→caso→agenda→honorario→pago→KPI; verificar acceso, errores y uso móvil.
  - Salida: acta de aceptación, tiempos/gasto medidos y manual inicial. Funciones ausentes se muestran como pendientes, no con datos simulados.
  - Dependencias: T16–T19. _Requirements: R07.4, R16.4, R16.5_

## E2 — Documentos y marco de trabajo

- [ ] **T21 — Árbol y metadatos de biblioteca**
  - Validar árbol con documentos reales, IDs estables y 4 colecciones; vínculos caso/documento y versiones, filtros/paginación por rama.
  - Salida: búsqueda por título/tags y ramas verificable; mover rama no rompe identidad ni permisos.
  - Dependencias: T20. _Requirements: R08.1, R08.2, R08.5_
- [ ] **T22 — Subida privada y cuarentena**
  - S3 privado SSE-S3/versioning/TLS, presigned upload acotado, finalización/checksum y scanner por job con firmas; cuotas de tamaño/páginas y fallos cerrados.
  - Salida: archivo de prueba antivirus bloqueado, evento repetido no duplica ingesta, archivo sin analizar no descarga/indexa. Medir costo/tiempo de scanner antes de adoptar alternativa.
  - Dependencias: T10, T13, T21. _Requirements: R08.2, R08.3, R01.3_
- [ ] **T23 — Extracción, preview y ACL**
  - Extracción sin IA de PDF textual/DOCX; estados de OCR opcional; URL corta sólo para versión limpia/autorizada, audit de emisión y sanitización de preview.
  - Salida: URL no se emite sin permiso; textos nunca entran al corpus público; errores se muestran recuperables.
  - Dependencias: T22. _Requirements: R08.3, R08.4, R02.5_
- [ ] **T24 — Retención y exportación**
  - Política profesional por colección, hold, retiro de derivados/índices, lifecycle de exports; exportar expediente con manifiesto/versiones y probar restore aislado.
  - Salida: revocar documento impide nuevos accesos; retiro propagado; ZIP/paquete exportado abre fuera del sistema y valida checksums.
  - Dependencias: T23. _Requirements: R08.6, R16.2, R16.3_
- [ ] **T25 — Plantillas y workflows**
  - Editor/versionado/publicación validada, copias por caso, pasos/dependencias y generación DOCX con variables faltantes visibles; lecciones revisadas y anonimizadas.
  - Salida: publicar v2 no altera casos con v1; marcar paso registra evidencia; plantilla no completa datos desconocidos.
  - Dependencias: T21, T23. _Requirements: R09.1, R09.2, R09.3, R09.4, R09.5_
- [ ] **T26 — Piloto E2**
  - Buscar 10 documentos reales, generar plantilla, completar paso y exportar expediente. Recoger fricción de búsqueda antes de decidir RAG.
  - Salida: ≥9/10 encontrados por abogada en ≤30 s por documento como objetivo inicial; documentar fallos y ajustar taxonomía.
  - Dependencias: T24, T25. _Requirements: R08.5, R09.4, R16.4, R16.5_

## E3 — Automatización selectiva

- [ ] **T27 — Recordatorios recuperables**
  - Scheduler→cola con watermark/lookback, dedupe por versión y estado entrega/fallo, canal real probado; tablero de alertas atrasadas.
  - Salida: caída y recuperación no pierden alertas; cambio de plazo invalida recordatorio anterior; presupuesto IA agotado no suspende panel/avisos esenciales.
  - Dependencias: T17, T13. _Requirements: R10.3, R10.4, R05.5, R01.4_
- [ ] **T28 — Reglas procesales verificadas**
  - Recibir reglas/fuentes/calendarios de la abogada; versionar corte, jurisdicción/suspensión y evidencia; generar sólo propuestas confirmables.
  - Salida: casos límite jurídicos acordados pasan y quedan revisados; falta de calendario bloquea fecha definitiva. Puede mantenerse manual indefinidamente.
  - Dependencias: T25, T27 y reglas reales. _Requirements: R10.1, R10.2_
- [ ] **T29 — IA de estructuración y OCR por lote**
  - Habilitar únicamente operaciones seleccionadas, registrar modelo/tarifa/uso, reservar cuotas, mostrar sugerencia y conservar original; OCR después de escaneo limpio.
  - Salida: cuota agotada degrada a manual, dos llamadas concurrentes no exceden reservas; ningún plazo/honorario/caso se confirma por modelo.
  - Dependencias: T09, T23, T16. _Requirements: R07.3, R13.1, R01.3, R01.4_
- [ ] **T30 — Métricas por canal y capacidad**
  - Cohortes/conversión, tiempos por etapa, costo atribuible y carga; documentar granularidad/monedas/denominadores.
  - Salida: sin gastos → CAC no disponible; sin tiempo → sólo margen de caja; reconciliación por período.
  - Dependencias: T19. _Requirements: R12.1, R12.2, R12.3, R12.4_

## E4 — WhatsApp API y RAG, activación condicionada

- [ ] **T31 — Decisión de WhatsApp**
  - Comparar API directa y EUM con tarifas/volúmenes reales, mantenimiento, coexistence y bandeja; validar términos/política IA, número, opt-in/plantillas y reversión.
  - Salida: ADR firmado por responsable, costo por escenario y prueba del número. Atención manual permanece operativa mientras no haya decisión.
  - Dependencias: T01, T20. _Requirements: R14.1, R14.2, R01.1_
- [ ] **T32 — Ingreso y medios WhatsApp**
  - Implementar firma/challenge o destino SNS según proveedor, ACK tras persistencia, message_id, cola/DLQ, media con cuarentena y estado por conversación.
  - Salida: firma inválida no procesa; duplicados/fuera de orden y fallo del worker recuperables; adjuntos no saltan scanner.
  - Dependencias: T31, T22. _Requirements: R14.3, R08.3_
- [ ] **T33 — Bandeja y handoff**
  - Tomar/devolver control, lock de envío/versiones, aviso de mensaje en vuelo, identidad por caso, plantillas y estados de entrega.
  - Salida: abogada toma conversación y bot deja de emitir nuevos mensajes; acceso con teléfono compartido no filtra caso; timeout externo ambiguo queda en revisión.
  - Dependencias: T32, T09. _Requirements: R14.4, R14.5, R13.5_
- [ ] **T34 — Corpus normativo y prueba de recuperación**
  - Inventario autorizado, fuentes/licencias/versiones por artículo, extracción e índices; comparar metadata/texto con opción vectorial por costo y calidad. Sin crawler indiscriminado ni libros sin permiso.
  - Salida: informe reproducible con corpus/preguntas reales y decisión tecnológica; no exigir Aurora para CRM.
  - Dependencias: T26, T29 y fuentes autorizadas. _Requirements: R15.1, R15.3, R15.4_
- [ ] **T35 — RAG con citas y aislamiento**
  - Activar corpus público separado, permisos previos, citas por versión/página/artículo, vigencia y abstención; corpus interno sólo tras evaluación de acceso.
  - Salida: conjunto de evaluación separado del ajuste, citas fieles revisadas, pruebas de fuga/inyección; grafo queda apagado si no muestra beneficio medido.
  - Dependencias: T34. _Requirements: R15.2, R15.3, R15.4, R02.5, R01.3_
- [ ] **T36 — Cierre y revisión económica**
  - Piloto de módulos habilitados, coste real por operación/período, exportación/restore, manual de abogada y soporte; cerrar trazabilidad y actualizar backlog.
  - Salida: jornada completa y mantenimiento asumibles, gasto reconciliado, funciones pendientes claramente identificadas; no marcar E4 completo si sigue desactivado.
  - Dependencias: T30; T33/T35 sólo para capacidades que se decida activar. _Requirements: R01.5, R16.3, R16.4, R16.5_

## Planificación y decisiones pendientes

No repetir la promesa de 19 semanas sin medir capacidad. Estimar horas por tarea después de T01/T12 y sumar pruebas, datos de abogada, puesta en marcha y contingencia; registrar por separado espera externa Meta/SIAT. E0 es urgente; E1/E2 entregan valor independientemente de E4.

Responsabilidades: desarrollador implementa y prueba; abogada valida contenido, reglas y flujos; propietario AWS confirma presupuesto, recursos y despliegue. Los pendientes económicos/jurídicos bloquean la activación correspondiente, no la redacción de estas specs ni la corrección de fallos actuales.
