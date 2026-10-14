# Experimentos live heredados

Los scripts en `scripts/experiments/` llaman API de producción o Bedrock real y pueden crear registros/consumir tokens. No forman parte de pytest ni CI. Fueron movidos desde la raíz sin ejecutarlos. Antes de utilizarlos revisar rutas relativas, cuenta/entorno y propósito; no ejecutarlos como prueba de seguridad E0.

Suite aislada: `tests/`, desde raíz con entorno activado y `uv run pytest -q`. Dependencias fijadas en `uv.lock`; no se utilizan credenciales reales ni requests de cliente en Moto.
