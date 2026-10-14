# Jhoselyn Gonzales — Web y Despacho Digital

Proyecto del despacho de la Dra. Jhoselyn Gonzales en Cochabamba, Bolivia. React/Vite, API Gateway HTTP API, Lambda Python, Cognito y DynamoDB. Backend E0 desplegado y contrastado en AWS el 2026-10-14; IA desactivada mientras no exista una cuota aprobada.

**Toda la documentación del proyecto está en [docs/](docs/README.md).** E0 sigue abierto por validaciones humanas y operativas; [progreso y pendientes](docs/operations/e0-progress.md). El plan conserva costo fijo mínimo con DynamoDB on-demand y S3 privado. Frontend en publicación coordinada mediante Amplify.

## Mapa

- [Índice documental](docs/README.md) y [reglas de organización](docs/documentation-policy.md).
- [Estado y comandos detallados](docs/current-state.md).
- [Requisitos](docs/specs/despacho-digital-coste-minimo/requirements.md), [arquitectura](docs/specs/despacho-digital-coste-minimo/design.md) y [única checklist de implementación](docs/specs/despacho-digital-coste-minimo/tasks.md).
- [Costos](docs/specs/despacho-digital-coste-minimo/cost-model.md), [trazabilidad](docs/specs/despacho-digital-coste-minimo/traceability.md), [roadmap](docs/global_tasks.md) e [ideas](docs/ideas_creativas.md).
- [Auditorías](docs/audits/README.md). Los [planes anteriores](docs/archive/README.md) están archivados y no son instrucciones de implementación.

## Estructura

```text
frontend/        Aplicación React + Vite
infrastructure/ Terraform y código Lambda
docs/           Documentación completa: estado, specs, auditorías e histórico
refes/          Material gráfico de referencia
```

## Desarrollo en Windows

Frontend, desde `frontend/`:

```bat
npm ci
npm run dev
npm run build
npm run lint
```

Python, desde la raíz, con entorno creado previamente:

```bat
.venv\Scripts\activate
uv run <script.py>
```

Suite aislada: `uv run pytest -q`. Los scripts en `scripts/experiments/` realizan llamadas reales y no pertenecen a la suite. Para infraestructura usar `.tools/terraform/terraform.exe`, perfil `Administrador`, state remoto y plan revisado antes de apply. Un push a main despliega el frontend en Amplify con `amplify.yml`; no aplica Terraform automáticamente.

Repositorio: [Serces19/web_jhoselyn_gonzales](https://github.com/Serces19/web_jhoselyn_gonzales).
