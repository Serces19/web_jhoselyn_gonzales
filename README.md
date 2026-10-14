# Jhoselyn Gonzales — Web y Despacho Digital

Proyecto del despacho de la Dra. Jhoselyn Gonzales en Cochabamba, Bolivia. React/Vite, API Gateway HTTP API, Lambda Python, Cognito y DynamoDB. Backend E0 desplegado y contrastado en AWS el 2026-10-14; IA desactivada mientras no exista una cuota aprobada.

**Toda la documentación del proyecto está en [docs/](docs/README.md).** Backend/frontend E0 publicados; [progreso y pendientes](docs/operations/e0-progress.md). Costo fijo mínimo con DynamoDB on-demand y S3 privado. Controles de release locales sin GitHub Actions; avisos de costo mensual USD 20 por proyecto. MFA OPTIONAL por decisión del usuario; cuenta actual con TOTP confirmado. Confirmación de avisos y criterios jurídicos de retención siguen siendo condiciones operativas antes del piloto con expedientes.

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

Control completo previo al release: `uv run python scripts/ops/check_local.py` (documentos, suite offline, lint, build). No usa GitHub Actions ni AWS. Los scripts en `scripts/experiments/` realizan llamadas reales y no pertenecen a la suite. Infraestructura: `.tools/terraform/terraform.exe`, perfil `Administrador`, state remoto y plan revisado. Destinatarios privados: `infrastructure/zz-alerts.private.auto.tfvars`, ignorado en Git. Un push a main despliega frontend en Amplify con `amplify.yml`; no aplica Terraform.

Repositorio: [Serces19/web_jhoselyn_gonzales](https://github.com/Serces19/web_jhoselyn_gonzales).
