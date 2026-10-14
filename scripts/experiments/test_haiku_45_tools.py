import boto3
import json
import sys

# Configure UTF-8 for windows console
sys.stdout.reconfigure(encoding='utf-8')

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'

print(f"Probando Claude Haiku 4.5 con Tool Use ({MODEL_ID})...")

tool_spec = [{
    "toolSpec": {
        "name": "save_lead_summary",
        "description": "Registra la ficha legal del cliente.",
        "inputSchema": {
            "json": {
                "type": "object",
                "properties": {
                    "client_name": {"type": "string"},
                    "client_phone": {"type": "string"},
                    "category": {"type": "string"},
                    "case_details": {"type": "string"},
                    "emotional_state": {"type": "string"},
                    "urgency": {"type": "string", "enum": ["ALTA", "MEDIA", "NORMAL"]}
                },
                "required": ["client_name", "category", "case_details"]
            }
        }
    }
}]

messages = [
    {
        "role": "user",
        "content": [{"text": "Hola, me llamo Valeria Torrico, mi teléfono es +591 70712345. Necesito asesoría urgente porque mi expareja me está amenazando con quitarme la custodia de mi hijo de 3 años y no me pasa asistencia familiar. ¿Qué puedo hacer?"}]
    }
]

system_prompt = (
    "Eres el Asistente Jurídico Virtual de la Dra. Jhoselyn Gonzales en Bolivia. "
    "El usuario te ha dado su nombre real y datos completos de su caso. "
    "Llama inmediatamente a la herramienta `save_lead_summary` para registrar su ficha y luego dale una respuesta cálida y orientadora."
)

try:
    response = bedrock.converse(
        modelId=MODEL_ID,
        system=[{"text": system_prompt}],
        messages=messages,
        toolConfig={
            "tools": tool_spec,
            "toolChoice": {"auto": {}}
        },
        inferenceConfig={"temperature": 0.5, "maxTokens": 800}
    )
    
    output = response['output']['message']
    stop_reason = response.get('stopReason')
    print(f"\nStop Reason: {stop_reason}")
    
    for c in output['content']:
        if 'toolUse' in c:
            print(f"\n✅ TOOL CALL DETECTADO:")
            print(json.dumps(c['toolUse'], indent=2, ensure_ascii=False))
        if 'text' in c:
            print(f"\nTEXTO:\n{c['text']}")

    print("\n✅ Claude Haiku 4.5 funciona impecablemente con Tool Calling en Bedrock!")
except Exception as e:
    print(f"\n❌ Error: {e}")
