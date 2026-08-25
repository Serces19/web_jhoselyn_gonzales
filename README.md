# Jhoselyn Gonzales — Sitio Web Profesional

Sitio web completo para el bufete de la **Dra. Jhoselyn Gonzales, Abogada** (Cochabamba, Bolivia).  
Incluye landing page, blog, sistema de citas, asistente legal IA, panel administrativo y múltiples opciones de pago.

> **Repositorio:** `https://github.com/Serces19/web_jhoselyn_gonzales`  
> **Deploy (Amplify):** auto-deploy en push a `main`  
> **API Backend:** `https://x4konjc6z6.execute-api.us-east-1.amazonaws.com`

---

## Índice

- [Stack tecnológico](#stack)
- [Estructura del proyecto](#estructura)
- [Páginas y rutas](#páginas)
- [API — Endpoints](#api)
- [Infraestructura AWS](#infraestructura-aws)
- [Asistente IA](#asistente-ia)
- [Panel Administrativo](#panel-administrativo)
- [Comandos](#comandos)
- [Datos de contacto reales](#datos-de-contacto)
- [Pendientes](#pendientes)

---

| **Stack** | **Tecnología** |
|---|---|
| **Frontend** | React 19 + Vite 8, React Router v7 |
| **Estilos** | CSS Variables custom, inline styles |
| **Deploy frontend** | AWS Amplify (auto-deploy en push a `main`) |
| **Backend** | AWS Lambda Python 3.11 |
| **API** | AWS API Gateway HTTP API v2 |
| **Base de datos** | AWS DynamoDB (PAY_PER_REQUEST) |
| **Auth admin** | AWS Cognito User Pool |
| **IA / Chat** | Amazon Bedrock — `us.anthropic.claude-haiku-4-5-20251001-v1:0` (Converse API + Tool Calling) |
| **Notificaciones** | AWS SNS (`jhoselyn_lead_alerts`) |
| **IaC** | Terraform (state local) |
| **Iconos** | lucide-react |

---

## Estructura

```
jhoselyn_gonzales_webpage/
├── frontend/
│   ├── public/              # Assets: logo.jpg, fotos de perfil
│   └── src/
│       ├── App.jsx          # Router principal con todas las rutas
│       ├── pages/
│       │   ├── LandingPage.jsx      # Home — hero, areas de practica, CTA
│       │   ├── ChatPage.jsx         # Pagina dedicada del asistente IA
│       │   ├── BookingApp.jsx       # Sistema de agendamiento de citas
│       │   ├── BlogPage.jsx         # Listado de articulos
│       │   ├── BlogPost.jsx         # Vista detalle de articulo
│       │   ├── ContactPage.jsx      # Contacto + redes sociales + mapa
│       │   ├── FaqPage.jsx          # FAQ freemium (click -> pago AirTM)
│       │   ├── PagosPage.jsx        # Metodos de pago (QR/Banco/AirTM/ACH)
│       │   ├── ProBonoPage.jsx      # Solicitud de servicio pro bono
│       │   ├── AdminDashboard.jsx   # Panel admin (citas, blog, leads, horarios)
│       │   └── Login.jsx            # Login con Cognito
│       └── components/
│           └── ChatWidget.jsx  # Legacy — desactivado (no montado en App.jsx)
│
├── infrastructure/
│   ├── main.tf              # Todos los recursos AWS (Terraform)
│   └── lambda_api/
│       ├── handler.py       # Router HTTP de la Lambda
│       └── agent_core.py    # Logica del asistente IA (Bedrock Converse)
│
├── create_admin.py          # Script para crear usuario admin en Cognito
└── generate_qr.py           # Script auxiliar para generar QR de pago
```

---

## Páginas

| Ruta | Componente | Descripcion |
|---|---|---|
| `/` | `LandingPage` | Hero, areas interactivas, banner internacional EEUU, CTA |
| `/chat` | `ChatPage` | Asistente legal IA — pagina conversacional completa |
| `/booking` | `BookingApp` | Calendario de citas — fecha, hora y datos del cliente |
| `/blog` | `BlogPage` | Listado de articulos (desde DynamoDB) |
| `/blog/:slug` | `BlogPost` | Articulo individual con markdown renderizado |
| `/contacto` | `ContactPage` | Info de contacto, 5 redes sociales, mapa Google, formulario |
| `/faq` | `FaqPage` | FAQ freemium — click en pregunta redirige a AirTM |
| `/pagos` | `PagosPage` | QR Bolivia, Transferencia BNB, AirTM, ACH/Zelle EEUU |
| `/probono` | `ProBonoPage` | Solicitud de servicio legal gratuito |
| `/admin/*` | `AdminDashboard` | Panel privado: citas, blog, leads IA, horarios |
| `/login` | `Login` | Autenticacion admin con AWS Cognito |

---

## API

Base URL: `https://x4konjc6z6.execute-api.us-east-1.amazonaws.com`

### Disponibilidad y Citas
| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/availability?date=YYYY-MM-DD` | Horas libres para una fecha |
| `GET` | `/api/appointments` | Lista todas las citas |
| `POST` | `/api/appointments` | Crea una cita nueva |
| `PATCH` | `/api/appointments/{id}` | Actualiza estado o datos |

### Horarios semanales
| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/schedule` | Horario semanal activo |
| `PUT` | `/api/schedule` | Guarda horario semanal (admin) |

### Blog
| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/blog` | Todos los articulos publicados |
| `POST` | `/api/blog` | Crea articulo nuevo (admin) |
| `GET` | `/api/blog/{id}` | Articulo por ID |
| `PUT` | `/api/blog/{id}` | Edita articulo (admin) |
| `DELETE` | `/api/blog/{id}` | Elimina articulo (admin) |

### Chat / Asistente IA
| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/chat` | Envia mensaje, recibe respuesta del asistente |
| `GET` | `/api/chat/leads` | Lista todos los leads capturados |
| `PATCH` | `/api/chat/leads/{id}` | Actualiza estado de un lead |

### Pro Bono
| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/probono` | Envia solicitud pro bono a DynamoDB |

---

## Infraestructura AWS

### Recursos Terraform (`infrastructure/main.tf`)

| Recurso | Nombre AWS | Proposito |
|---|---|---|
| `aws_cognito_user_pool` | `jhoselyn_web_pool` | Autenticacion del admin |
| `aws_cognito_user_pool_client` | `jhoselyn_web_app_client` | Client del frontend |
| `aws_cognito_user_group` | `Admins` | Grupo de administradores |
| `aws_dynamodb_table` | `Appointments` | Citas de clientes |
| `aws_dynamodb_table` | `AvailabilityBlocks` | Horarios semanales configurables |
| `aws_dynamodb_table` | `BlogPosts` | Articulos del blog |
| `aws_dynamodb_table` | `ProBonoRequests` | Solicitudes pro bono |
| `aws_dynamodb_table` | `ChatLeads` | Leads del asistente IA |
| `aws_dynamodb_table` | `ChatSessions` | Historial de conversaciones |
| `aws_lambda_function` | `jhoselyn_web_api` | Backend (Python 3.11, 30s timeout) |
| `aws_apigatewayv2_api` | `jhoselyn_web_http_api` | HTTP API Gateway |
| `aws_iam_role` | `serverless_lambda_exec_role` | Permisos: DynamoDB + Bedrock + CloudWatch |

### Variables de entorno Lambda

```
APPOINTMENTS_TABLE = Appointments
BLOCKS_TABLE       = AvailabilityBlocks
BLOG_TABLE         = BlogPosts
PROBONO_TABLE      = ProBonoRequests
LEADS_TABLE        = ChatLeads
SESSIONS_TABLE     = ChatSessions
BEDROCK_MODEL_ID   = us.amazon.nova-lite-v1:0
```

### Variables de entorno Frontend (Amplify)

```
VITE_API_ENDPOINT         = https://x4konjc6z6.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID = us-east-1_WIEGYaEgn
VITE_COGNITO_CLIENT_ID    = 7bnjmrjftms9vgrjksg2shc48b
```

---

## Asistente IA
 
Implementado en `infrastructure/lambda_api/agent_core.py`.

**Modelo:** Claude Haiku 4.5 (`us.anthropic.claude-haiku-4-5-20251001-v1:0`) via Bedrock Converse API  
**Historial y Turnos:** Guardado en DynamoDB `ChatSessions` (límite estricto de 6 turnos por sesión)  
**Temperatura:** 0.5 | **Max tokens:** 1024  
**Base de Conocimiento:** Contexto verificado en `infrastructure/lambda_api/bufete_knowledge.py`  
**Tool calling:** `save_lead_summary` con extracción profunda (`case_details`, `emotional_state`, `urgency`)  
**Alertas:** Publicación de evento `LeadCreated` en SNS Topic `jhoselyn_lead_alerts`  

### Flujo de la Conversación (Método de la Escucha y Anclaje Profundo)

1. **Turnos 1 a 2 — Escucha y Acogida:** Validación de emociones, contención humana, una sola pregunta de profundización.
2. **Turnos 3 a 4 — Orientación Jurídica:** Fundamentos basados en Ley 603 (Familias), Código Civil y Ley 548 (Niñez).
3. **Turnos 5 a 6 — Captura y Cierre:** Solicitud de Nombre + WhatsApp y registro de ficha técnica.
4. **Turno 6 — Límite y CTA:** Mensaje de cierre cálido invitando a agendar en `/booking` o contactar al WhatsApp oficial.

### Entrada al chat

El CTA principal en el landing ("Cuentame tu problema") y el boton flotante redirigen a `/chat`. No hay widget flotante superpuesto sobre otras paginas.

---

## Panel Administrativo

**Acceso:** `/admin` → login en `/login` con cuenta Cognito del grupo `Admins`

**Crear usuario admin:**
```bash
uv run create_admin.py
```

### Tabs del dashboard

| Tab | Funcion |
|---|---|
| **Gestion de Citas** | Ver, aprobar/cancelar, notificar WhatsApp, editar, crear manual |
| **Horarios Semanales** | Configurar horas disponibles por dia de la semana |
| **Blog & Noticias** | Crear/editar/eliminar articulos en Markdown |
| **Consultas IA / Leads** | Ver leads con resumen del caso, contactar por WhatsApp, cambiar estado |

---

## Comandos

### Desarrollo

```bash
# Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173

# .env.local para apuntar a la API de produccion en dev:
echo "VITE_API_ENDPOINT=https://x4konjc6z6.execute-api.us-east-1.amazonaws.com" > frontend/.env.local
```

### Deploy

```bash
# Backend (Lambda + infra)
cd infrastructure
terraform apply -auto-approve

# Frontend — automatico al hacer push a main
git push origin main
```

### Utilidades

```bash
# Ver leads en DynamoDB
aws dynamodb scan --table-name ChatLeads --region us-east-1 --output json

# Ver citas
aws dynamodb scan --table-name Appointments --region us-east-1 --output json

# Crear usuario admin
uv run create_admin.py
```

---

## Datos de Contacto

| Canal | Dato |
|---|---|
| **WhatsApp** | +591 69512921 |
| **Correo** | scope.estudio@gmail.com |
| **Oficina** | Heroinas y Oquendo, Cochabamba, Bolivia |
| **Instagram** | [@jhoselyn.gonzales.abogada](https://www.instagram.com/jhoselyn.gonzales.abogada) |
| **Facebook** | [jhoselyn.gonzales.abogada](https://www.facebook.com/jhoselyn.gonzales.abogada) |
| **TikTok** | [@jhos.gonzales.abogada](https://tiktok.com/@jhos.gonzales.abogada) |
| **LinkedIn** | [jhoselyn-gonzales-abogada](https://www.linkedin.com/in/jhoselyn-gonzales-abogada) |
| **AirTM (pagos)** | [airtm.me/sergio4hny2enm](https://airtm.me/sergio4hny2enm) |

---

## Pendientes

### Datos faltantes (para completar cuando esten disponibles)
- [ ] **QR bancario** — imagen real. Subir a `frontend/public/qr-pago.png` y reemplazar placeholder en `PagosPage.jsx` (linea ~25)
- [ ] **N° cuenta BNB + CI/NIT** — para transferencias Bolivia (`PagosPage.jsx` linea ~54)
- [ ] **Datos ACH/Zelle EEUU** — para clientes en Estados Unidos (`PagosPage.jsx` linea ~110)

### Mejoras tecnicas futuras
- [ ] Autenticacion JWT en endpoints del API Gateway (actualmente sin auth en backend)
- [ ] Email transaccional (AWS SES) para confirmaciones de citas
- [ ] Paginacion en blog y lista de citas en el admin
- [ ] Notificacion al admin (email/WhatsApp) cuando llega un lead nuevo
- [ ] Separar `ChatWidget.jsx` (legacy) o eliminarlo definitivamente del repo
