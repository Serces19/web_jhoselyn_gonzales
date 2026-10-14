# 04 — Capa 4: Panel de alta rápida (cliente + caso + relato)

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Meta: registrar un cliente nuevo con su caso **en menos de 90 segundos**, incluso durante una llamada o al salir del juzgado (móvil).

---

## 1. Flujo

```
[+ Nuevo] (botón global, atajo "N")
   │
   ▼
Paso 1 — ¿Quién?   Teléfono o nombre → autocompletar contra `personas` (trigram)
                   ├─ existe → se reutiliza (muestra casos previos)
                   └─ nuevo  → nombres, apellidos, teléfono (+591 por defecto), CI (opcional), país
   │
   ▼
Paso 2 — ¿Qué pasa?  Relato libre: escribir o 🎤 dictar (voz → texto)
                     Contraparte(s): nombre(s)  → control de conflictos en vivo (doc 02 §6)
   │
   ▼  "Estructurar con IA" (Claude Haiku, ~3 s)
Paso 3 — Revisión    La IA propone y la abogada corrige:
                     • Título del caso    • area_path (rama del árbol)   • tipo de trámite
                     • Hechos clave (viñetas)   • Pretensión / objetivo del cliente
                     • Urgencia + motivo   • Plazos detectados ("le notificaron hace 5 días")
                     • Documentos a pedir al cliente (checklist)   • Workflow sugerido (doc 05)
                     • Honorario sugerido (mediana de casos similares ganados)
   │
   ▼
Paso 4 — Guardar como:  ( ) Oportunidad (aún no contrata)   ( ) Caso abierto (ya contrató)
   │
   ▼
Acciones post-guardado (opcionales, 1 clic):
   • Enviar WhatsApp de bienvenida + lista de documentos a traer (plantilla utility)
   • Agendar consulta (abre Booking con datos precargados)
   • Generar contrato de honorarios desde plantilla
   • Abrir Marco de trabajo del caso
```

## 2. Estructuración con IA — contrato de salida

Herramienta (tool use) con esquema JSON estricto:

```json
{
  "titulo": "string",
  "area_path": "familia.asistencia_familiar.incremento",
  "tipo_tramite": "judicial|extrajudicial|administrativo|asesoria|notarial",
  "hechos": ["string"],
  "objetivo_cliente": "string",
  "partes": [{"nombre": "string", "rol": "contraparte|menor_involucrado|..."}],
  "urgencia": "baja|normal|alta|critica",
  "motivo_urgencia": "string|null",
  "plazos_detectados": [{"descripcion": "string", "fecha_referencia": "YYYY-MM-DD|null"}],
  "documentos_requeridos": ["string"],
  "preguntas_pendientes": ["string"],
  "confianza": 0.0
}
```

- `area_path` se valida contra la tabla `taxonomia` (lista cerrada en el prompt).
- `plazos_detectados` **nunca** crea plazos automáticamente: los propone en el marco de trabajo para confirmación (riesgo de mala praxis).
- El relato original se guarda intacto en `casos.descripcion` / `oportunidades.resumen`; la versión estructurada en `detalles_ia`.

## 3. Dictado por voz

Opción recomendada: Web Speech API del navegador (gratis, Chrome/Edge/Android, `lang = 'es-BO'`) para dictado en vivo.
Alternativa para audios largos o notas de voz de WhatsApp: Amazon Transcribe (`es-US`) en batch.

## 4. Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/personas?q=` | Autocompletar |
| GET | `/api/admin/conflictos?nombre=` | Control de conflictos en vivo (debounce 400 ms) |
| POST | `/api/admin/intake/estructurar` | Relato → JSON estructurado (Haiku) |
| POST | `/api/admin/intake` | Transacción: persona + oportunidad **o** cliente + caso + caso_partes + evento inicial |

## 5. Criterios de aceptación

- [ ] Alta completa en ≤ 90 s con relato de 1 párrafo (medido en móvil).
- [ ] No se crean personas duplicadas por mismo teléfono o CI.
- [ ] Conflicto con cliente existente bloquea el guardado hasta confirmar.
- [ ] Si Bedrock falla, el formulario sigue funcionando manualmente (IA es opcional).
- [ ] Todo alta genera evento en `eventos_caso` / `auditoria`.
