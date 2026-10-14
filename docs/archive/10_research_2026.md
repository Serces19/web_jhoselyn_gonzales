# 10 — Research 2026: mejores prácticas y fuentes

> **HISTÓRICO — NO IMPLEMENTAR DESDE ESTE DOCUMENTO.** Conservado como antecedente; consultar el [índice vigente](../README.md) y sus specs.

> **Plan vigente (2026-10-13):** este documento se conserva como antecedente. Las [specs de costo fijo mínimo](../README.md) sustituyen decisiones incompatibles sobre Aurora/SQL, grafo, costos y cronograma. Implementar desde requirements/design/tasks de las specs.

> Investigación realizada el 2026-10-07. Afirmaciones marcadas *(verificar)* provienen de fuentes secundarias y deben confirmarse en la documentación oficial antes de ejecutar la fase correspondiente.
> **Revalidación 2026-10-13:** consultar [segunda auditoría §3](../audits/11_segunda_auditoria_2026-10-13.md). Aurora/Data API, tarifas propias EUM y restricciones SQL se contrastaron con fuentes primarias. Meta Business Agent, precio por tokens, cambios de octubre, política IA y tarifa Bolivia quedan pendientes: páginas oficiales fallaron o exigieron login. No se usan como base de decisión.

---

## 1. Software de gestión de despachos (Legal Practice Management) — estado del arte 2026

Hallazgos:
- Los sistemas líderes ya no son "CRM + documentos" sino un **sistema operativo legal** que integra intake, casos, redacción, facturación, contabilidad, comunicación con el cliente e IA.
- Funciones núcleo comunes: **calendario basado en reglas (plazos)**, automatización de documentos/formularios, gestión de casos, **control de conflictos**, contactos, documentos/email, control de tiempo, facturación y cuentas de clientes.
- El control de conflictos debe ejecutarse **antes** de aceptar un caso, contra clientes actuales y pasados.
- La gestión de plazos debe calcular vencimientos y avisar con antelación para prevenir mala praxis.
- Tendencias 2026: IA ambiental (captura de tiempo, intake, borradores), tablero unificado orientado al negocio, conocimiento que se auto-organiza, transparencia hacia el cliente (portales).

**Aplicación en este proyecto:** control de conflictos (doc 02 §6), motor de plazos (doc 07 S1), finanzas (doc 07 S2), conocimiento vivo (doc 05 §5), portal del cliente (backlog).

## 2. RAG / GraphRAG en AWS

- Bedrock Knowledge Bases soporta como vector store: S3 Vectors, OpenSearch Serverless/Managed, Aurora PostgreSQL (pgvector), Neptune Analytics, Pinecone, Redis, MongoDB Atlas.
- **GraphRAG** está integrado en Bedrock Knowledge Bases usando **Neptune Analytics** (grafo + vectores) y explota relaciones entre entidades para preguntas multi-salto.
- **S3 Vectors** GA desde dic-2025: hasta ~90 % menos costo de almacenamiento/consulta de vectores frente a BDs vectoriales dedicadas.

**Decisión (ADR-02):** GraphRAG-lite en Aurora (pgvector + ltree + tablas de grafo) porque el corpus del despacho es pequeño-medio y Neptune Analytics no escala a cero. Alternativas evaluadas y caminos de migración:
1. Si el corpus normativo crece mucho → mover la colección `normativa` a Bedrock KB + S3 Vectors (manteniendo Aurora para CRM).
2. Si las preguntas multi-salto dominan y el presupuesto lo permite → Bedrock KB GraphRAG con Neptune Analytics.

Buenas prácticas aplicadas: chunking por unidad jurídica (artículo/considerando), *contextual retrieval* (contexto antepuesto al chunk), búsqueda híbrida léxica+semántica con fusión RRF, re-ranking, citas obligatorias, set de evaluación propio.

## 3. WhatsApp Business (2026)

| Tema | Hallazgo |
|---|---|
| Precios | Facturación por mensaje desde 1-jul-2025: marketing siempre; utility/autenticación gratis dentro de la ventana de servicio; servicio gratis dentro de 24 h |
| Cambio oct-2026 | Desde 1-oct-2026 los mensajes de servicio y utility dentro de la ventana pasan a cobrarse por mensaje *(verificar con la tabla oficial de Meta y tarifa de Bolivia)* |
| Meta Business Agent | Disponible globalmente (jun-2026); responde preguntas, agenda citas, califica leads y deriva a humanos; se conecta a Google Calendar, Salesforce, APIs propias. Gratis en la app WhatsApp Business; en la API USD 2 / 1 M tokens desde 1-ago-2026 |
| Política IA | Desde 15-ene-2026 prohibidos los chatbots de IA de **propósito general** en la Business Platform; permitidos los bots específicos del negocio (soporte, reservas, ventas) |
| AWS | **AWS End User Messaging Social**: onboarding de WABA nueva o existente; mensajes entrantes → SNS → Lambda; envío vía API; ejemplos oficiales con Bedrock |

## 4. Fuentes jurídicas bolivianas

| Fuente | URL | Uso |
|---|---|---|
| Gaceta Oficial del Estado Plurinacional | gacetaoficialdebolivia.gob.bo | Normas oficiales (fuente de verdad) |
| Tribunal Constitucional Plurinacional | tcpbolivia.bo | SCP, sistematización de jurisprudencia relevante, CPE 2009 en PDF |
| Tribunal Supremo de Justicia | tsj.bo | Revistas jurisprudenciales, resúmenes, Unidad de Sistematización de Jurisprudencia |
| Notificaciones electrónicas / Buzón Judicial | notifica.organojudicial.gob.bo | Registro de domicilio procesal electrónico, presentación de memoriales fuera de horario (vía Ciudadanía Digital) |
| Lexivox | lexivox.org | Normas en HTML estructurado *(verificar licencia/términos)* |
| vLex Bolivia | bolivia.vlex.com | Base comercial (suscripción) — alternativa si se requiere cobertura amplia |
| SIN — SIAT | impuestos.gob.bo | Facturación: Portal Web en Línea (simple, bajo volumen), Computarizada en Línea, Electrónica en Línea (CUF, firma digital, QR) |

## 5. Pendiente de investigar en cada fase

- [ ] F2: límites y latencia de reanudación de Aurora Serverless v2 con auto-pause en `us-east-1`; costo real con Data API.
- [ ] F3: benchmark de embeddings multilingües disponibles en Bedrock sobre texto jurídico boliviano.
- [ ] F3: términos de uso de Gaceta Oficial, Lexivox, TCP para descarga automatizada.
- [ ] F6: tabla oficial de precios de Meta para Bolivia (+591) y disponibilidad de *coexistence* vía AWS EUM Social.
- [ ] F7.1: resolución vigente de vacaciones judiciales y feriados departamentales de Cochabamba.
- [ ] F7.2: requisitos de la modalidad SIAT adecuada al volumen de la abogada; proveedores autorizados.
- [ ] Doc 08: estado legislativo de la ley de protección de datos personales en Bolivia.

## Fuentes consultadas

- [WhatsApp pricing 2026 — service message cost (EngageLab)](https://www.engagelab.com/blog/whatsapp-pricing-2026-service-message-cost)
- [WhatsApp Business API Pricing 2026 (Unipile)](https://www.unipile.com/whatsapp-business-api-pricing/)
- [Meta's AI agent for WhatsApp Business is now available globally (TechCrunch)](https://www.techcrunch.com/2026/06/03/metas-ai-agent-for-whatsapp-business-is-now-available-globally/)
- [Meta Business Agent guide (Chakra)](https://articles.chakrahq.com/article/meta-business-agent-whatsapp-instagram-guide/)
- [WhatsApp general-purpose chatbots ban (respond.io)](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban)
- [WhatsApp + AWS End User Messaging Social (AWS Messaging Blog)](https://aws.amazon.com/blogs/messaging-and-targeting/whatsapp-aws-end-user-messaging-social)
- [Build a knowledge base with graphs from Neptune Analytics (AWS Docs)](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs.html)
- [AWS vector database options (BigData Boutique)](https://bigdataboutique.com/blog/aws-vector-database-options)
- [Bedrock Knowledge Bases GraphRAG GA (Classmethod)](https://dev.classmethod.jp/articles/amazon-bedrock-knowledge-bases-graphrag-generally-available/)
- [Best Legal Practice Management Software 2026 (Dupple)](https://dupple.com/learn/best-legal-practice-management-software)
- [8 Key Features for Legal Practice Management Software (CosmoLex)](https://www.cosmolex.com/blog/back-to-basics-legal-practice-management/)
- [TSJ — Buzón judicial y notificaciones electrónicas](https://tsj.bo/ahora-con-las-notificaciones-electronicas-agilizamos-el-acceso-a-la-justicia/)
- [TSJ — Revistas jurisprudenciales](https://tsj.bo/tipo_publicacion/revistas-jurisprudenciales/)
- [TCP — CPE 2009](https://tcpbolivia.bo/wp-content/uploads/2025/04/CPE_2009.pdf)
- [Facturación profesional independiente SIAT Bolivia (yo-facturo)](https://yo-facturo.com/blog/facturacion-profesional-independiente-siat-bolivia/)
- [vLex Bolivia](https://bolivia.vlex.com/)
