# 01 — Capa 1: Correcciones de contenido de la web pública

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Alcance: sólo textos, fotos y datos visibles. Sin cambios de arquitectura.
> Las correcciones concretas las irá detallando la abogada; este documento define **dónde vive cada contenido** y el **proceso** para aplicarlas sin romper nada.

---

## 1. Inventario: dónde está cada contenido

| Página / Ruta | Archivo | Contenido editable |
|---|---|---|
| `/` Landing | `frontend/src/pages/LandingPage.jsx` | Hero, áreas de práctica, banner EEUU, reseñas Google, CTA |
| `/sobre-mi` | `frontend/src/pages/AboutPage.jsx` | Biografía, valores, docencia (`public/docencia.jpg`), reseñas |
| `/contacto` | `frontend/src/pages/ContactPage.jsx` | Teléfono, correo, dirección, redes, mapa |
| `/faq` | `frontend/src/pages/FaqPage.jsx` | Preguntas/respuestas, banner de alcance |
| `/pagos` | `frontend/src/pages/PagosPage.jsx` | Tarifas (200 Bs / 20 USD / 20 EUR), QR, cuentas |
| `/booking` | `frontend/src/pages/BookingApp.jsx` | Textos del flujo de cita, tarifa |
| `/probono` | `frontend/src/pages/ProBonoPage.jsx` | Requisitos y texto pro bono |
| `/blog` | DynamoDB `BlogPosts` (panel admin) | Artículos — se editan desde `/admin`, no en código |
| Chat IA | `infrastructure/lambda_api/bufete_knowledge.py` | Datos del despacho que usa el asistente (deben coincidir con la web) |
| Imágenes | `frontend/public/` | `logo.jpg`, `profile photo 1x1*.png`, `docencia.jpg`, favicons |
| SEO | `frontend/index.html` | `<title>`, meta description, Open Graph |

## 2. Regla de consistencia (fuente única)

Los datos que aparecen en varias páginas (teléfono, correo, dirección, tarifas, áreas de práctica) hoy están duplicados en varios `.jsx` **y** en `bufete_knowledge.py`.

**Tarea:** crear `frontend/src/content/despacho.js` (un único objeto con datos de contacto, tarifas, áreas) e importarlo en todas las páginas. `bufete_knowledge.py` se mantiene sincronizado manualmente (checklist abajo) hasta la Fase 2, cuando ambos leerán de la tabla `configuracion_despacho`.

## 3. Proceso para cada lote de correcciones

1. La abogada envía el lote (texto o captura con la indicación).
2. Registrar el lote en la tabla de abajo (ID, página, cambio).
3. Aplicar cambios; fotos nuevas optimizadas a WebP ≤ 200 KB, ancho máx. 1200 px, con `alt` descriptivo.
4. `npm run build` + `npm run lint` sin errores; revisión visual en móvil (375 px) y escritorio.
5. Si el cambio toca datos del despacho → actualizar `bufete_knowledge.py` y `terraform apply`.
6. Push a `main` → Amplify despliega. Verificar en producción.

## 4. Registro de lotes de corrección

| Lote | Fecha | Página | Cambio solicitado | Estado |
|---|---|---|---|---|
| L-01 | _pendiente_ | _a definir por la abogada_ | — | Esperando contenido |

## 5. Pendientes de contenido ya conocidos (README)

- [ ] QR bancario real → `frontend/public/qr-pago.png` (`PagosPage.jsx`).
- [ ] N° de cuenta BNB + CI/NIT.
- [ ] Datos de pago para EEUU (ACH u otro) — fueron retirados AirTM/Zelle.
- [ ] Revisar que el correo `scope.estudio@gmail.com` sea el definitivo.

## 6. Checklist de calidad por página

- [ ] Ortografía y tildes (revisión con corrector).
- [ ] No prometer resultados judiciales (coherente con la ética profesional y con el prompt del asistente).
- [ ] Datos de contacto idénticos en todas las páginas y en el asistente.
- [ ] Imágenes con `alt`, tamaño optimizado.
- [ ] Meta description única por página.
