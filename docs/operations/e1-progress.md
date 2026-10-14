# E1 — Desarrollo, evidencia y publicación pendiente

2026-10-14. CRM privado implementado y contrastado en staging. **Producción E1 permanece desactivada** (`despacho_enabled=false`); no se cargaron expedientes reales ni se migraron leads productivos. E0 conserva funcionamiento, MFA OPTIONAL y alertas USD 20.

La revisión automática rechazó aplicar la propuesta aditiva de **26 recursos E1 en producción**, al exigir autorización explícita para recursos persistentes aunque el piloto esté bloqueado. No se aplicó esa propuesta. [Plan revisable sin secretos](e1-proposed-release.json). La publicación propuesta usaría `/admin/despacho` en modo revisión, con altas/cambios/jobs deshabilitados en UI y `PILOT_ENABLED=false` comprobado antes de cualquier escritura API. No implica autorizar expedientes reales ni aprobar conservación profesional.

[Checklist canónica](../specs/despacho-digital-coste-minimo/tasks.md), [modelo físico/ADR](../data/access-patterns.md), [migración y corte](e1-migration.md). E2 sigue pendiente: documentos, escaneo, ACL, plantillas y procedimientos.

## Implementación

| Área | Comportamiento real |
|---|---|
| Personas | Contactos familiares compartidos sin fusión; identificadores por país/emisor/tipo; búsqueda paginada y casos/roles históricos |
| Oportunidades | Seis etapas comerciales, historial, canal y motivo obligatorio de pérdida; GANADO significa contrato obtenido; revisión de origen importado explícita |
| Casos / intake | Persona/caso/partes/evento/auditoría/outbox atómicos; relato original inmutable; vínculo de oportunidad; diez partes iniciales y adiciones al borrador hasta cincuenta |
| Conflictos | Coincidencias privadas requieren juicio humano; APROBADO liga IDs/roles/versiones de personas; cambios invalidan revisión, visibles en detalle |
| Agenda | Tareas, audiencias y plazos manuales con fuente/zona; mes/día/siete días con cursor incluso cruzando meses; vínculo de cita existente no modifica slots |
| Finanzas | Honorarios hasta veinte cuotas; importes menores enteros y monedas separadas; pagos conciliados manualmente, asignaciones posteriores, reversión completa, gastos/fondos de cliente |
| SIAT | Referencias externas manuales, sin emisión/validación fiscal automática; adjuntos pendientes E2 |
| KPIs | Etapas/casos por cohorte de alta; movimientos por fecha efectiva y moneda; worker con markers, ledger y rebuild paginado; saldo vencido actual por job de todos los meses, no deuda histórica |
| Operación | Roles API/worker privados; público sin Core/Scan; Streams→FIFO, dos DLQ, alarma por DLQ, conciliación horaria y cursor durable |
| Migración | Dry-run; importación idempotente sin inferir pagos/moneda, origen íntegro privado/hash; ambiguos en revisión y cambios de origen →409 |

## Verificación

- **33 pruebas offline**: acceso, alta/replay, versiones de conflicto, dinero/reversos/fondos, importación, identidad comercial, semanas entre meses, saldo vencido y bloqueo productivo de escrituras.
- **40 controles AWS**: [reporte](e1-staging-verification.json). JWT/grupo/ID token; IAM público/Core; concurrencia de pagos; vínculo de cita; agenda; cuotas vencidas; Streams/FIFO/rebuild; commit con relay detenido y recuperación por reconciliación; duplicado después de rebuild sin doble cómputo.
- Lint/build locales pasan; advertencias heredadas de variables sin uso/bundle principal no se convierten en métricas de funcionamiento. Build adicional `VITE_DESPACHO_ENABLED=true` verifica el módulo completo (producción actual tiene flag apagado).
- Última muestra AWS: 31 llamadas, mediana 1519.66 ms y máximo 3522.14 ms, incluyendo red/cold start. No certifica objetivos p95 calientes ni experiencia móvil; pendientes del piloto.
- [Benchmark](e1-benchmark.json): 31 transacciones observadas, 9–30 unidades agregadas. AWS no devolvió desglose WRU/RRU en estas respuestas: costo exacto transaccional no disponible. Se conserva cota del componente reportado y tarifas oficiales, sin presentar monto facturado ni costo total de operación.
- Dry-run productivo sólo lectura: 3 leads, 3 importables, 3 requieren revisión; ninguna escritura. La conservación/corte real y rollback posterior necesitan validación.
- Terraform productivo con E1 apagado: No changes. Propuesta activada: 26 creaciones, 0 cambios existentes, 0 eliminaciones; bloqueada por revisión automática. Staging: **59 recursos retirados**, datos/usuarios sintéticos eliminados antes del retiro; [inventario y state vacíos](e1-cleanup.json).

## Operación reproducible

Activar `.venv\Scripts\activate`, usar `uv run python scripts/ops/check_local.py`. Es local, sin GitHub Actions; check_docs valida enlaces/requisitos/sintaxis y espacios tanto de cambios preparados en Git como sin preparar. Los scripts live están separados de pytest y exigen `--profile Administrador`.

`scripts/ops/e1_staging.py prepare/plan/apply` usa exclusivamente prefix `staging-e1-` y state remoto `staging/e1/terraform.tfstate`; revisa plan sin eliminaciones antes de apply. `test_staging_e1.py` limpia fixtures/usuarios y desactiva consumidores; `destroy-plan/destroy` valida sólo eliminaciones de ese estado. No dejar entorno temporal para uso diario ni mostrar fixtures en interfaces.

Para revisión productiva, después de autorización explícita: regenerar plan con `despacho_enabled=true`, conservar `PILOT_ENABLED=false`, aplicar mediante `release_e1_review.py` (sólo creaciones E1, guarda respaldo privado del state), verificar acceso/grupo/bloqueo sin escribir datos, publicar frontend con `VITE_DESPACHO_ENABLED=true`. Cognito/API deben pertenecer al mismo entorno. Un push a main no aplica Terraform. No reutilizar ciegamente un plan antiguo después de nuevos cambios.

## Pendientes antes del piloto y cierre E1

1. Autorización de publicación productiva de los 26 recursos y UI en modo revisión; coste incremental de dos alarmas: base bruta USD 0.20/mes antes de créditos, más consumo/almacenamiento.
2. Recibir criterios profesionales de conservación/acceso y flujo aceptado por la abogada. Aprobación operativa previa no se declara certificación jurídica. No habilitar escrituras reales hasta resolverlo.
3. Revisar en móvil/escritorio con la abogada: campos, roles, agenda, cuotas y comprobantes; medir alta y jornada completa. UI no ha recibido aceptación humana ni verificación visual autenticada de extremo a extremo.
4. Snapshot privado y reconciliación/corte de los tres leads reales, con rollback posterior ensayado. Importador probado no equivale a migración productiva concluida.
5. Medir costo completo por comando (lecturas previas, worker, colas, storage/logs) y p95 caliente separado de cold start. Atribución de canal/margen/CAC completa pertenece a E3; no fabricar gasto/tiempo faltante.
6. Acta T20 y manual acordado. Recordatorios automáticos E3, documentos E2 y WhatsApp/RAG E4 siguen pendientes y no se anuncian implementados.
