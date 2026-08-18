import boto3
import json

bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

SYSTEM_PROMPT = """Eres el Asistente Jurídico Virtual de la Dra. Jhoselyn Gonzales (Cochabamba, Bolivia).
Brinda orientación empática sobre derecho de familia, niñez y civil en Bolivia.
Cuando el usuario proporcione su nombre y cuente su caso, DEBES llamar a la herramienta save_lead_summary para guardar la ficha.
"""

TOOL_DEFINITIONS = [
    {
        "toolSpec": {
            "name": "save_lead_summary",
            "description": "Guarda la ficha de consulta del cliente.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "client_name": {"type": "string"},
                        "client_phone": {"type": "string"},
                        "category": {"type": "string"},
                        "case_summary": {"type": "string"},
                        "urgency": {"type": "string", "enum": ["ALTA", "MEDIA", "NORMAL"]},
                        "payment_preference": {"type": "string"}
                    },
                    "required": ["client_name", "category", "case_summary"]
                }
            }
        }
    }
]

messages = [
    {
        "role": "user",
        "content": [{"text": "Hola, me llamo Carlos Mendez, mi celular es 71234567. Mi esposa y yo queremos divorciarnos por mutuo acuerdo en Cochabamba, tenemos un hijo de 5 años y ya acordamos la asistencia y visitas."}]
    }
]

print("Probando Tool Calling con us.amazon.nova-lite-v1:0...")
try:
    resp = bedrock_runtime.converse(
        modelId='us.amazon.nova-lite-v1:0',
        system=[{"text": SYSTEM_PROMPT}],
        messages=messages,
        toolConfig={
            "tools": TOOL_DEFINITIONS,
            "toolChoice": {"auto": {}}
        }
    )
    msg = resp['output']['message']
    print("Respuesta de Nova Lite:")
    print(json.dumps(msg, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error: {e}")
