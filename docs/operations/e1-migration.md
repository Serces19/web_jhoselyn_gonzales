# E1 — Migración de leads y corte

Estado: importador probado offline; ejecución productiva pendiente. La CLI limita apply a `staging-*`, verifica cuenta y no imprime registros. No se ha cambiado ChatLeads de producción ni su formulario público.

## Mapeo verificable

| Origen | Destino / decisión |
|---|---|
| lead_id | Marker MIGRATION#ChatLeads#SHA256, legacy_id y hash del registro completo |
| client_name | Persona independiente si existe nombre concreto; nombres genéricos quedan sin persona |
| client_phone / client_email | Contactos normalizados válidos; valores rechazados permanecen en source_record privado |
| case_details / case_summary | Resumen de oportunidad, máximo 4000 caracteres; fuente íntegra en marker |
| stage | Etapa válida; desconocida o PERDIDO sin motivo → NUEVO y revisión |
| source | Canal existente o procedencia técnica ChatLeads legacy |
| created_at | legacy_created_at conservado; cohort_period corresponde a fecha local de importación, no reconstruye una cohorte histórica |
| budget / importes | Se conservan sólo en origen; no inferir moneda, honorario, pago ni conciliación |

Toda oportunidad importada exige revisión. No fusionar personas por teléfono/correo/nombre. Sin nombre o sin resumen se crea sólo marker UNRESOLVED_REQUIRES_REVIEW. GANADO mantiene significado comercial. Historial inicial identifica importación. Registro >200KB exige revisión separada.

Receipt y marker se escriben con entidades/lookup/historial/auditoría/outbox en la misma transacción. Repetir origen idéntico devuelve IDs anteriores. Origen modificado después del snapshot →409 LEGACY_SOURCE_CHANGED; no sobrescribir silenciosamente la versión importada.

## Procedimiento de operador antes de producción

1. Acordar campos/etapas con la abogada y conservación con responsables. Registrar ventana y responsables de corte. Mantener backend/UI E1 productivos apagados mientras tanto.
2. Respaldo on-demand/PITR de ChatLeads y snapshot privado versionado con manifiesto, fecha, claves y hashes. No guardar PII en docs/Git. Verificar respaldo disponible y restauración aislada conforme a E0.
3. Dry-run con cuentas de filas importables/no resueltas, sin imprimir registros. Revisión humana de ambiguos desde superficie privada. La CLI actual sólo consulta tablas staging; lectura productiva requiere script/runbook aprobado.
4. Importar copia aislada; repetir y verificar mismos IDs/conteos, source_hash y ausencia de pagos inferidos. Resolver diferencias antes de cortar.
5. En ventana de corte, detener sólo nuevas escrituras de leads legacy mediante flag/ruta controlada y publicar destino coordinado; agenda/blog no se interrumpen. Snapshot final y comparación con anterior. Un hash cambiado exige decisión humana.
6. Importación final con identidad de operador limitada. Verificar conteos y relaciones, métricas/rebuild y queue/DLQ. El outbox termina antes de activar UI.
7. Habilitar piloto después de los criterios de E1; convertir ChatLeads a consulta histórica. No operar doble escritura indefinida ni borrar origen automáticamente.

## Rollback

Antes de habilitar escrituras E1: devolver formulario/UI a legacy y conservar Core importado apagado para análisis; no borrar respaldo ni Cognito. Después de escrituras E1: suspender altas nuevas, exportar/reconciliar cambios nuevos con ledger y responsables; no regresar al snapshot perdiendo personas/pagos. El retorno posterior necesita replay probado y conciliación de dinero. No automatizado aún: impide declarar T15 cerrado.

## Comandos staging

Desde raíz, activar `.venv\Scripts\activate` y usar `uv run python scripts/ops/migrate_e1_leads.py --profile Administrador` para dry-run. Agregar `--apply` sólo sobre snapshot/copia staging verificada. Sin fixtures de clientes en la interfaz; los tests de API aislados y el entorno se limpian al terminar.
