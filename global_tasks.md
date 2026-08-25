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
- [x] **Despliegue Terraform:** `terraform apply` ejecutado exitosamente en AWS us-east-1.
- [x] **Pruebas End-to-End en Vivo:** Verificación multi-turno de la API con respuestas jurídicas de alta calidad.

---

## 🔮 Tareas Futuras / Backlog

- [ ] **Suscripción de Canales SNS:** Conectar suscripción de WhatsApp Business API o Email a `jhoselyn_lead_alerts`.
- [ ] **JWT Authorizer en API Gateway:** Proteger rutas de administración (`/api/appointments`, `/api/chat/leads`) con Cognito JWT.
- [ ] **Subida de Archivos PDF a S3:** Pipeline para adjuntar documentos del cliente en el proceso de cita.
- [ ] **Email Transaccional (AWS SES):** Confirmación automática de citas agendadas por email al cliente y a la abogada.
