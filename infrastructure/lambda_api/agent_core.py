import json
import boto3
import uuid
import os
import re
from datetime import datetime
from bufete_knowledge import BUFETE_KNOWLEDGE

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
leads_table = dynamodb.Table(os.environ.get('LEADS_TABLE', 'ChatLeads'))
sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'ChatSessions'))

bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# Default to verified Claude Haiku 4.5 cross-region inference profile
MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'us.anthropic.claude-haiku-4-5-20251001-v1:0')
MAX_TURNS = int(os.environ.get('MAX_CHAT_TURNS', '6'))

BASE_SYSTEM_PROMPT = f"""Eres el Asistente Jurídico Virtual del despacho de la Dra. Jhoselyn Gonzales, abogada especialista con sede en Cochabamba, Bolivia y atención internacional (especialmente a residentes bolivianos en EEUU).

{BUFETE_KNOWLEDGE}

FILOSOFÍA DE ATENCIÓN — MÉTODO DE LA ESCUCHA Y ANCLAJE PROFUNDO:
Las personas acuden con problemas delicados (divorcios, pensiones, herencias, custodia). Tu objetivo es ser un refugio empático donde el cliente se sienta 100% escuchado y comprendido. Cuando un cliente cuenta en detalle su caso, se genera un vínculo de confianza genuino.

PAUTAS DE CONVERSACIÓN POR FASE:
- FASE INICIAL (Turnos 1 a 2):
  * Escucha activa, valida sus emociones ("Entiendo la angustia que esto causa", "Lamento mucho la situación").
  * Haz UNA sola pregunta reflexiva que anime al usuario a contar más detalles ("¿Desde cuándo están pasando por esto?", "¿Dónde se encuentra la otra persona?").
- FASE DE ORIENTACIÓN (Turnos 3 a 4):
  * Explica 2 o 3 ideas jurídicas claras basadas en la legislación boliviana (Ley 603, Código Civil, etc.).
  * Resalta cómo el despacho de la Dra. Jhoselyn puede proteger sus derechos tanto si está en Bolivia como desde el exterior.
- FASE DE CIERRE Y CAPTURA (Turnos 5 a 6):
  * Solicita cálidamente el nombre completo y un número de WhatsApp para que la Dra. Jhoselyn revise su caso personalmente.
  * Si el usuario da su nombre real, invoca de inmediato la herramienta `save_lead_summary` con toda la información y detalles capturados.

NORMAS OBLIGATORIAS:
1. Responde SIEMPRE en español de forma humana, cálida y profesional.
2. Nunca hagas más de 2 preguntas a la vez.
3. No des garantías de resultados judiciales ("ganaremos el caso"), sino certidumbre sobre el acompañamiento legal.
4. Si el cliente ya está en su turno límite, agradécele sinceramente y guíalo a agendar su cita o escribir al WhatsApp oficial (+591 69512921).
"""

TOOL_DEFINITIONS = [
    {
        "toolSpec": {
            "name": "save_lead_summary",
            "description": "Registra la ficha detallada de consulta legal del cliente en la base de datos del despacho.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "client_name": {
                            "type": "string",
                            "description": "Nombre completo de la persona interesada"
                        },
                        "client_phone": {
                            "type": "string",
                            "description": "Número de WhatsApp o teléfono de contacto con código de país si aplica"
                        },
                        "category": {
                            "type": "string",
                            "enum": [
                                "Derecho Familiar",
                                "Niñez y Adolescencia",
                                "Derecho Civil y Patrimonial",
                                "Servicios Internacionales (EEUU)",
                                "Pro Bono",
                                "Consulta General"
                            ],
                            "description": "Área legal del caso"
                        },
                        "case_details": {
                            "type": "string",
                            "description": "Detalles completos, cronología y antecedentes narrados por el cliente"
                        },
                        "emotional_state": {
                            "type": "string",
                            "description": "Estado emocional percibido (ej. alta preocupación, necesidad urgente de protección, búsqueda de acuerdo pacífico)"
                        },
                        "urgency": {
                            "type": "string",
                            "enum": ["ALTA", "MEDIA", "NORMAL"],
                            "description": "Nivel de urgencia legal detectado"
                        },
                        "payment_preference": {
                            "type": "string",
                            "description": "Preferencia de pago (QR Bolivia, BNB, AirTM, Zelle EEUU o Por coordinar)"
                        }
                    },
                    "required": ["client_name", "category", "case_details"]
                }
            }
        }
    }
]

def get_session(session_id):
    try:
        resp = sessions_table.get_item(Key={'session_id': session_id})
        if 'Item' in resp:
            item = resp['Item']
            messages = json.loads(item.get('messages', '[]'))
            turn_count = int(item.get('turn_count', len(messages) // 2))
            return messages, turn_count
    except Exception as e:
        print(f"Error fetching session: {e}")
    return [], 0

def save_session(session_id, messages, turn_count):
    try:
        # Keep last 16 messages in history to prevent unbounded growth
        trimmed_messages = messages[-16:]
        sessions_table.put_item(
            Item={
                'session_id': session_id,
                'messages': json.dumps(trimmed_messages),
                'turn_count': turn_count,
                'updated_at': datetime.utcnow().isoformat()
            }
        )
    except Exception as e:
        print(f"Error saving session: {e}")

def execute_save_lead(tool_input, session_id):
    client_name = tool_input.get('client_name', '').strip()
    
    GENERIC_NAMES = {'cliente web', 'cliente', 'anónimo', 'anonimo', 'usuario', 'no proporcionado', ''}
    if client_name.lower() in GENERIC_NAMES or len(client_name) < 2:
        return {
            "status": "pending",
            "message": "Ficha no guardada: se requiere el nombre real del cliente para seguimiento personalizado."
        }
    
    lead_id = str(uuid.uuid4())
    item = {
        'lead_id': lead_id,
        'session_id': session_id,
        'client_name': client_name,
        'client_phone': tool_input.get('client_phone', 'No proporcionado'),
        'category': tool_input.get('category', 'Consulta General'),
        'case_summary': tool_input.get('case_details', '')[:300],
        'case_details': tool_input.get('case_details', ''),
        'emotional_state': tool_input.get('emotional_state', 'No especificado'),
        'urgency': tool_input.get('urgency', 'NORMAL'),
        'payment_preference': tool_input.get('payment_preference', 'Por coordinar'),
        'status': 'NUEVO_LEAD',
        'stage': 'NUEVO',
        'source': 'Chatbot IA',
        'notes': [],
        'deal_value': 0,
        'created_at': datetime.utcnow().isoformat()
    }
    
    try:
        leads_table.put_item(Item=item)
        
        # Publish notification event to SNS if configured
        sns_topic_arn = os.environ.get('SNS_TOPIC_ARN')
        if sns_topic_arn:
            try:
                sns_client = boto3.client('sns', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
                notification_msg = (
                    f"🚨 NUEVO LEAD JURÍDICO REGISTRADO\n"
                    f"Cliente: {client_name}\n"
                    f"Tel/WhatsApp: {item['client_phone']}\n"
                    f"Área: {item['category']}\n"
                    f"Urgencia: {item['urgency']}\n"
                    f"Estado Emocional: {item['emotional_state']}\n"
                    f"Detalles: {item['case_details']}"
                )
                sns_client.publish(
                    TopicArn=sns_topic_arn,
                    Subject=f"Nuevo Lead: {client_name} ({item['category']})",
                    Message=notification_msg
                )
            except Exception as sns_err:
                print(f"Non-blocking SNS publish error: {sns_err}")

        return {
            "status": "success",
            "lead_id": lead_id,
            "message": "Ficha legal registrada exitosamente para revisión de la Dra. Jhoselyn Gonzales."
        }
    except Exception as e:
        print(f"Error saving lead: {e}")
        return {"status": "error", "error": str(e)}

def build_turn_closing_message(turn_count):
    return (
        "Ha sido un verdadero gusto orientarte en esta consulta inicial. "
        "Para brindarte el análisis legal exhaustivo que tu caso amerita y revisar documentos en detalle con la Dra. Jhoselyn Gonzales, "
        "te invitamos a dar el siguiente paso:\n\n"
        "📅 **Agendar Consulta Privada:** [Ir al Calendario de Citas](/booking)\n"
        "💬 **WhatsApp Directo:** [+591 69512921](https://wa.me/59169512921)\n\n"
        "¡Estaremos encantados de acompañarte y defender tus derechos!"
    )

def process_chat_message(session_id, user_message):
    if not session_id:
        session_id = str(uuid.uuid4())
        
    history, current_turns = get_session(session_id)
    new_turn_count = current_turns + 1

    # Check if max turns limit already exceeded
    if current_turns >= MAX_TURNS:
        return {
            "session_id": session_id,
            "turn_count": current_turns,
            "max_turns": MAX_TURNS,
            "limit_reached": True,
            "response": build_turn_closing_message(current_turns),
            "lead": None
        }

    # Append current user message
    history.append({
        "role": "user",
        "content": [{"text": user_message}]
    })

    # Prepare system prompt with turn indicator
    turn_instructions = f"\n[AVISO DE TURNO]: Este es el turno {new_turn_count} de un total de {MAX_TURNS} permitidos en esta sesión."
    if new_turn_count >= MAX_TURNS:
        turn_instructions += " Este es el ÚLTIMO turno de la sesión. Concluye con un resumen cálido, invita a agendar en /booking o contactar al WhatsApp (+591 69512921), y registra la ficha si cuentas con el nombre."

    effective_system_prompt = BASE_SYSTEM_PROMPT + turn_instructions
    
    lead_created = None
    final_response_text = ""

    try:
        # First call to Bedrock Converse API
        response = bedrock_runtime.converse(
            modelId=MODEL_ID,
            system=[{"text": effective_system_prompt}],
            messages=history,
            toolConfig={
                "tools": TOOL_DEFINITIONS,
                "toolChoice": {"auto": {}}
            },
            inferenceConfig={
                "temperature": 0.5,
                "maxTokens": 1024
            }
        )
        
        output_message = response['output']['message']
        history.append(output_message)
        
        # Check for tool use
        stop_reason = response.get('stopReason')
        if stop_reason == 'tool_use':
            tool_requests = [c['toolUse'] for c in output_message['content'] if 'toolUse' in c]
            tool_results = []
            
            for tool_req in tool_requests:
                tool_name = tool_req['name']
                tool_input = tool_req['input']
                tool_use_id = tool_req['toolUseId']
                
                if tool_name == 'save_lead_summary':
                    result = execute_save_lead(tool_input, session_id)
                    lead_created = result
                    tool_results.append({
                        "toolResult": {
                            "toolUseId": tool_use_id,
                            "content": [{"json": result}],
                            "status": "success"
                        }
                    })
            
            # Send tool result back to Bedrock for final conversational response
            history.append({
                "role": "user",
                "content": tool_results
            })
            
            second_response = bedrock_runtime.converse(
                modelId=MODEL_ID,
                system=[{"text": effective_system_prompt}],
                messages=history,
                toolConfig={
                    "tools": TOOL_DEFINITIONS,
                    "toolChoice": {"auto": {}}
                },
                inferenceConfig={
                    "temperature": 0.5,
                    "maxTokens": 1024
                }
            )
            final_output = second_response['output']['message']
            history.append(final_output)
            
            text_blocks = [c['text'] for c in final_output['content'] if 'text' in c]
            final_response_text = " ".join(text_blocks)
        else:
            text_blocks = [c['text'] for c in output_message['content'] if 'text' in c]
            final_response_text = " ".join(text_blocks)

        # Sanitize internal tags
        final_response_text = re.sub(r'<thinking>.*?</thinking>', '', final_response_text, flags=re.DOTALL).strip()
            
    except Exception as e:
        print(f"Bedrock invocation error with {MODEL_ID}: {e}")
        # Fallback graceful response
        final_response_text = (
            "Comprendo la importancia y delicadeza de tu situación. "
            "He tomado nota de los aspectos que me comentas para que la Dra. Jhoselyn Gonzales "
            "pueda evaluarlo minuciosamente. Puedes dejarnos tu nombre y WhatsApp para darte seguimiento prioritario, "
            "o agendar una consulta personalizada directamente en nuestra sección de Citas."
        )

    save_session(session_id, history, new_turn_count)
    
    return {
        "session_id": session_id,
        "turn_count": new_turn_count,
        "max_turns": MAX_TURNS,
        "limit_reached": (new_turn_count >= MAX_TURNS),
        "response": final_response_text,
        "lead": lead_created
    }
