import json
import boto3
import uuid
import os
import re
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
leads_table = dynamodb.Table(os.environ.get('LEADS_TABLE', 'ChatLeads'))
sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'ChatSessions'))

bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'us.amazon.nova-lite-v1:0')

SYSTEM_PROMPT = """Eres el Asistente Jurídico Virtual e Inteligente de la Dra. Jhoselyn Gonzales, abogada especialista con despacho en Cochabamba, Bolivia (Heroínas y Oquendo) y atención a residentes bolivianos en el exterior (especialmente en Estados Unidos).

Tu propósito es brindar una atención humana, altamente empática y profesional, realizar un triaje del problema legal del usuario, proporcionar insights generales basados en la legislación boliviana (Código de las Familias Ley 603, Código Civil, Ley 548 de Niñez y Adolescencia) y guiar al usuario a agendar una consulta formal personalizada con la Dra. Jhoselyn.

METODOLOGÍA DE CONVERSACIÓN EN 4 PASOS:
1. ESCUCHA Y EMPATÍA: Saluda con calidez y demuestra comprensión genuina de la situación delicada o preocupación del cliente.
2. INDAGACIÓN GUIADA: Haz 1 o 2 preguntas clave para entender el caso (ej. ¿En qué ciudad o país te encuentras? ¿Hay hijos menores de edad involucrados? ¿Existe mutuo acuerdo o desacuerdo?).
3. ORIENTACIÓN E INSIGHTS CLAVE: Brinda 2 o 3 conceptos orientativos claros y tranquilizadores según la ley boliviana, aclarando sutilmente que cada caso tiene particularidades que requieren revisión documental formal.
4. SÍNTESIS, LEAD Y AGENDAMIENTO:
   - Ofrece generar una Ficha de Consulta resumida para que la Dra. Jhoselyn Gonzales la evalúe directamente.
   - Pide amablemente su Nombre completo y su número de WhatsApp de contacto.
   - Menciona que las consultas formales se pueden coordinar con facilidad de pago: QR Banco Bolivia, Transferencia bancaria local, AirTM o ACH/Zelle si se encuentra en EEUU.
   - TAN PRONTO como el usuario proporcione su nombre, teléfono o descripción suficiente de su caso, DEBES invocar la herramienta `save_lead_summary` para registrar la ficha en el sistema.

NORMAS DE CONDUCTA:
- Sé conciso, claro, humano y muy respetuoso. Evita jerga incomprensible.
- Nunca prometas resultados procesales garantizados ni fijes montos de pensión exactos, ya que dependen de la valoración judicial.
- Responde siempre en español.
"""

TOOL_DEFINITIONS = [
    {
        "toolSpec": {
            "name": "save_lead_summary",
            "description": "Guarda y sintetiza la ficha de consulta del cliente en la base de datos para revisión de la Abogada Jhoselyn Gonzales.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "client_name": {
                            "type": "string",
                            "description": "Nombre completo del cliente o persona interesada"
                        },
                        "client_phone": {
                            "type": "string",
                            "description": "Número de WhatsApp o teléfono de contacto"
                        },
                        "category": {
                            "type": "string",
                            "description": "Área legal: Derecho Familiar, Niñez y Adolescencia, Derecho Civil y Patrimonial, Servicios Internacionales (EEUU), o Pro Bono"
                        },
                        "case_summary": {
                            "type": "string",
                            "description": "Resumen conciso y técnico de la situación, antecedentes y necesidad legal del cliente"
                        },
                        "urgency": {
                            "type": "string",
                            "enum": ["ALTA", "MEDIA", "NORMAL"],
                            "description": "Nivel de urgencia detectado"
                        },
                        "payment_preference": {
                            "type": "string",
                            "description": "Preferencia de pago indicada: QR Bolivia, Banco BNB, AirTM, ACH/Zelle (EEUU) o Pendiente"
                        }
                    },
                    "required": ["client_name", "category", "case_summary"]
                }
            }
        }
    }
]

def get_session_history(session_id):
    try:
        resp = sessions_table.get_item(Key={'session_id': session_id})
        if 'Item' in resp and 'messages' in resp['Item']:
            return json.loads(resp['Item']['messages'])
    except Exception as e:
        print(f"Error fetching session history: {e}")
    return []

def save_session_history(session_id, messages):
    try:
        # Keep last 16 turns to avoid unbounded context expansion
        trimmed_messages = messages[-16:]
        sessions_table.put_item(
            Item={
                'session_id': session_id,
                'messages': json.dumps(trimmed_messages),
                'updated_at': datetime.utcnow().isoformat()
            }
        )
    except Exception as e:
        print(f"Error saving session history: {e}")

def execute_save_lead(tool_input, session_id):
    lead_id = str(uuid.uuid4())
    item = {
        'lead_id': lead_id,
        'session_id': session_id,
        'client_name': tool_input.get('client_name', 'Cliente Web'),
        'client_phone': tool_input.get('client_phone', 'No proporcionado'),
        'category': tool_input.get('category', 'Consulta General'),
        'case_summary': tool_input.get('case_summary', ''),
        'urgency': tool_input.get('urgency', 'NORMAL'),
        'payment_preference': tool_input.get('payment_preference', 'Por coordinar'),
        'status': 'NUEVO_LEAD',
        'created_at': datetime.utcnow().isoformat()
    }
    try:
        leads_table.put_item(Item=item)
        return {
            "status": "success",
            "lead_id": lead_id,
            "message": "Ficha de consulta registrada con éxito en el despacho."
        }
    except Exception as e:
        print(f"Error saving lead: {e}")
        return {"status": "error", "error": str(e)}

def process_chat_message(session_id, user_message):
    if not session_id:
        session_id = str(uuid.uuid4())
        
    history = get_session_history(session_id)
    
    # Append current user message
    history.append({
        "role": "user",
        "content": [{"text": user_message}]
    })
    
    lead_created = None
    final_response_text = ""

    try:
        # First call to Bedrock Converse
        response = bedrock_runtime.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=history,
            toolConfig={
                "tools": TOOL_DEFINITIONS,
                "toolChoice": {"auto": {}}
            },
            inferenceConfig={
                "temperature": 0.3,
                "maxTokens": 1000
            }
        )
        
        output_message = response['output']['message']
        history.append(output_message)
        
        # Check if the model wants to call tools
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
            
            # Send tool results back to Bedrock for final conversational response
            history.append({
                "role": "user",
                "content": tool_results
            })
            
            second_response = bedrock_runtime.converse(
                modelId=MODEL_ID,
                system=[{"text": SYSTEM_PROMPT}],
                messages=history,
                toolConfig={
                    "tools": TOOL_DEFINITIONS,
                    "toolChoice": {"auto": {}}
                },
                inferenceConfig={
                    "temperature": 0.3,
                    "maxTokens": 1000
                }
            )
            final_output = second_response['output']['message']
            history.append(final_output)
            
            text_blocks = [c['text'] for c in final_output['content'] if 'text' in c]
            final_response_text = " ".join(text_blocks)
        else:
            text_blocks = [c['text'] for c in output_message['content'] if 'text' in c]
            final_response_text = " ".join(text_blocks)

        # Remove internal thinking tags if present
        final_response_text = re.sub(r'<thinking>.*?</thinking>', '', final_response_text, flags=re.DOTALL).strip()
            
    except Exception as e:
        print(f"Bedrock execution error: {e}")
        # Graceful fallback in case of model throttling or initialization
        final_response_text = (
            "Comprendo perfectamente tu consulta. Para darte la mejor orientación adaptada a tu caso específico, "
            "he tomado nota de tus antecedentes. Puedes dejarnos tu nombre y WhatsApp para que la Dra. Jhoselyn "
            "evalúe tu situación, o si prefieres, puedes agendar directamente una cita en nuestra sección de Citas."
        )

    save_session_history(session_id, history)
    
    return {
        "session_id": session_id,
        "response": final_response_text,
        "lead": lead_created
    }
