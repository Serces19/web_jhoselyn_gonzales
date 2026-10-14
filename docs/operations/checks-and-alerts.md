# Controles locales, alertas y presupuesto

Decisiones del usuario (2026-10-14): no pagar GitHub Actions; un destinatario de alertas con dirección completa confirmada; aviso mensual USD 20; conservar MFA OPTIONAL e IA apagada. No versionar el correo personal en el repositorio público.

## Verificación local de publicación

Se retiró `.github/workflows/checks.yml`; no se ejecutan runners de GitHub para este proyecto. El bloqueo histórico de facturación no implica contratar un plan ni limita Git/push o Amplify. Actions se usaba para ejecutar pruebas, lint y build automáticamente. La alternativa implementada es local, reproducible y sin llamadas AWS:

```bat
.venv\Scripts\activate
uv run python scripts/ops/check_local.py
```

Corre documentos, 14 tests offline, lint y build. Evidencia en `local-checks.json`, logs ignorados en `.local-backups/`. Ejecutar antes de cada release y no publicar si falla. Amplify continúa hospedando/compilando la web y conserva sus costos AWS; retirar GitHub Actions no retira Amplify ni las pruebas.

## Destinatarios

`infrastructure/zz-alerts.private.auto.tfvars` (ignorado) contiene `alerts_emails`, una lista ampliable. Orden lexical posterior a production.auto.tfvars.json permite cargar la lista privada sin publicarla. `for_each` crea una suscripción por correo y conserva las existentes al agregar otras. `alerts_email` sigue como compatibilidad antigua, null. La precondición del presupuesto rechaza planificar sin destinatarios y evita eliminar suscripciones por omitir la configuración privada en otro equipo. Cada destinatario debe confirmar SNS; crear la suscripción o aceptar Publish no demuestra recepción humana. No compartir tokens por chat ni docs. Al trabajar desde otro equipo, cargar los valores privados autorizados; no copiar estados locales antiguos.

El topic existente recibe alarma de errores Lambda y avisos de presupuesto. Las notificaciones no incluyen nombres, teléfonos, relatos ni expedientes. SNS entrega por email tras confirmación; no enviar alertas de prueba hasta confirmar el destinatario.

Verificado el 2026-10-14: suscripción confirmada y usuario confirmó recepción de una prueba técnica, sin PII. [Evidencia](alerts-budget-verification.json). El presupuesto quedó creado; el plan final no muestra drift. La primera aplicación rechazó el comodín SNS del statement propietario; se sustituyó por acciones SNS válidas y se completó la aplicación sin recrear datos ni suscripción. Confirmar un aviso técnico no simula ni acredita que se haya superado el presupuesto.

## Presupuesto

AWS Budgets COST, MONTHLY, USD 20, filtrado por `Project=jhoselyn-despacho`; avisos de gasto real al superar 80% (USD 16) y 100% (USD 20), y pronóstico al superar USD 20. No hay acciones automáticas, cortes de servicio ni reportes periódicos de pago. Los presupuestos sólo de monitorización son [gratuitos según AWS](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/); SNS/email y servicios del proyecto conservan sus propias tarifas.

El provider añade etiquetas a recursos gestionados; bootstrap etiqueta su bucket; Amplify existente se etiquetó mediante API porque aún no está gestionado en Terraform. La clave Project de asignación de costos, antes Inactive, se activó. El presupuesto mide gastos atribuibles a etiquetas, no la cuenta completa ni garantiza cobertura de cargos sin soporte de etiqueta, impuestos, dominio compartido o inferencia futura. Créditos/reembolsos no reducen la medida del presupuesto.

La atribución no es retroactiva automáticamente y los datos de facturación tienen demora. No interpretar una cifra vacía/cero inicial como factura cero. Referencias: [activación de etiquetas](https://docs.aws.amazon.com/us_en/awsaccountbilling/latest/aboutv2/activating-tags.html), [SNS para Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html). IA apagada evita inferencia del chat; no se asignó al modelo un presupuesto de USD 20, que pertenece al aviso de infraestructura.
