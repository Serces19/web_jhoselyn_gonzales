# Evidencia local de la segunda auditoría

Fecha: 2026-10-13 (America/La_Paz).

Se importó el handler con un adaptador DynamoDB exclusivamente en memoria. No hubo llamadas a AWS ni datos personales. Estos resultados demuestran el comportamiento del código local; no acreditan el estado desplegado.

| Comprobación | Resultado observado |
|---|---|
| Lectura administrativa sin credenciales | Confirmado |
| Campos vacíos/fecha inválida aceptados | Confirmado |
| Estado elegido por cliente aceptado | Confirmado |
| Dos reservas idénticas aceptadas | Confirmado |
| Borrador devuelto en lista pública | Confirmado |
| Borrador devuelto por slug público | Confirmado |
| Cursor DynamoDB descartado | Confirmado |
| JSON inválido produce 500 con detalles | Confirmado |
| Sintaxis Python del backend válida | Confirmado |

Los comportamientos inseguros confirmados son hallazgos abiertos, no pruebas de seguridad aprobadas.

Frontend: `npm run build` completado; bundle principal 660.23 kB (182.19 kB gzip), aviso >500 kB. `npm run lint`: salida 0, advertencias de variables sin usar y dependencia de useEffect.

Scripts que requieren especial atención por invocar servicios o escribir en API: `test_agent_v2.py`, `test_api.py`, `test_bedrock_direct.py`, `test_chat_api.py`, `test_chat_multi_turn.py`, `test_haiku_45_tools.py`, `test_nova_agent.py`, `test_sonnet.py`, `test_tool_roundtrip.py`, `test_vanguard_models.py`. No ejecutados.

SQL: revisión estática y documental; no se ejecutaron migraciones contra PostgreSQL. Terraform: lectura estática; no se ejecutaron plan/apply ni consulta del estado AWS.

Documentación: 16 archivos Markdown revisados; sin enlaces locales rotos. `git diff --check` terminó con salida 0. Se conservaron los cambios previos del usuario; los scripts temporales de auditoría se retiraron. El entorno local `.venv` queda ignorado por Git.
