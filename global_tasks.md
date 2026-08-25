# 🗺️ Global Tasks Roadmap — Jhoselyn Gonzales Webpage & AI Assistant

## Estado del Proyecto: Producción v2.1 (Activo)
- **Frontend:** React 19 + Vite (AWS Amplify auto-deploy)
- **Backend API:** AWS API Gateway + Lambda Python 3.11 (`https://x4konjc6z6.execute-api.us-east-1.amazonaws.com`)
- **Motor IA:** Amazon Bedrock — `us.anthropic.claude-haiku-4-5-20251001-v1:0` (Converse API + Tool Calling)
- **Base de Datos:** AWS DynamoDB (Appointments, AvailabilityBlocks, BlogPosts, ProBonoRequests, ChatLeads, ChatSessions)
- **Alertas:** AWS SNS Topic (`jhoselyn_lead_alerts`)

---

## 📋 Tareas Realizadas (Completadas)

- [x] **Diagnóstico arquitectónico integral** de infraestructura, frontend, backend y Bedrock.
- [x] **Instalación de Skills Oficiales de AWS:** `amazon-bedrock` y `agents-get-started`.
- [x] **Actualización de Motor IA:** Migración a Claude Haiku 4.5 en Bedrock con inference profile validado.
- [x] **Método de Escucha y Anclaje Profundo:** Rediseño del System Prompt enfocado en acogida empática y extracción profunda del caso legal.
- [x] **Límite Estricto de 6 Turnos:** Contador `turn_count` por sesión en DynamoDB con mensaje de cierre y CTA a citas / WhatsApp.
- [x] **Base de Conocimiento Jurídico:** Módulo [`bufete_knowledge.py`](infrastructure/lambda_api/bufete_knowledge.py) con datos oficiales y áreas de práctica.
- [x] **Infraestructura de Alertas:** Creación de SNS Topic `jhoselyn_lead_alerts` y permisos `sns:Publish` en Lambda.
- [x] **UX del Chat:** Manejo de límite en [`ChatPage.jsx`](frontend/src/pages/ChatPage.jsx) con banner de acción rápida y bloqueo amigable de input.
- [x] **Formateo Markdown en Chat:** Integración de `ReactMarkdown` en [`ChatPage.jsx`](frontend/src/pages/ChatPage.jsx) y [`ChatWidget.jsx`](frontend/src/components/ChatWidget.jsx) para renderizar correctamente `**negrita**`, viñetas, citas y enlaces sin mostrar caracteres sin procesar.
- [x] **CTA Banner en Servicios:** Añadida tarjeta interactiva y estética *"¿No encuentras tu caso específico? Agenda una consulta"* en [`LandingPage.jsx`](frontend/src/pages/LandingPage.jsx).
- [x] **Nueva Página "Sobre Mí":** Creada [`AboutPage.jsx`](frontend/src/pages/AboutPage.jsx) con biografía, valores, sección de Docencia y testimonios de Google Reviews.
- [x] **Actualización de Tarifas y Métodos de Pago:** 200 Bs (Bolivia) / 20 USD o 20 EUR (Exterior) en [`PagosPage.jsx`](frontend/src/pages/PagosPage.jsx), [`BookingApp.jsx`](frontend/src/pages/BookingApp.jsx) y [`bufete_knowledge.py`](infrastructure/lambda_api/bufete_knowledge.py). Removidas referencias a AirTM y Zelle.
- [x] **Ajuste en FAQ:** Banner actualizado en [`FaqPage.jsx`](frontend/src/pages/FaqPage.jsx) aclarando que no incluye redacción de documentos complejos y recomendando consulta personalizada.
- [x] **Integración Google Reviews (100% Real):** Reseñas reales de Brenda A., Keil Lucas y Fernanda Villarroel integradas con distintivo de verificación y enlace oficial en [`LandingPage.jsx`](frontend/src/pages/LandingPage.jsx) y [`AboutPage.jsx`](frontend/src/pages/AboutPage.jsx).
- [x] **Sección de Docencia con Imagen:** Generada imagen fotorrealista de cátedra universitaria (`docencia.jpg`) e integrada en Sobre Mí y Home.
- [x] **Despliegue Terraform:** `terraform apply` ejecutado exitosamente en AWS us-east-1 actualizando la base de conocimiento de la Lambda.

---

## 🔮 Tareas Futuras / Backlog

- [ ] **Suscripción de Canales SNS:** Conectar suscripción de WhatsApp Business API o Email a `jhoselyn_lead_alerts`.
- [ ] **JWT Authorizer en API Gateway:** Proteger rutas de administración (`/api/appointments`, `/api/chat/leads`) con Cognito JWT.
- [ ] **Subida de Archivos PDF a S3:** Pipeline para adjuntar documentos del cliente en el proceso de cita.
- [ ] **Email Transaccional (AWS SES):** Confirmación automática de citas agendadas por email al cliente y a la abogada.
