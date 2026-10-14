import boto3
import json

bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

SYSTEM_PROMPT = """Eres el Asistente Jurídico de la Dra. Jhoselyn Gonzales.
Cuando tengas el nombre y teléfono del cliente, llama a save_lead_summary.
"""

TOOL_DEFINITIONS = [
    {
        "toolSpec": {
            "name": "save_lead_summary",
            "description": "Guarda la ficha del cliente.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "client_name": {"type": "string"},
                        "client_phone": {"type": "string"},
                        "case_summary": {"type": "string"},
                        "category": {"type": "string"}
                    },
                    "required": ["client_name", "case_summary"]
                }
            }
        }
    }
]

history = [
    {"role": "user", "content": [{"text": "Hola, soy Patricia Alvarez (77998811) y necesito divorcio por mutuo acuerdo en Cochabamba."}]}
]

resp = bedrock_runtime.converse(
    modelId='us.amazon.nova-lite-v1:0',
    system=[{"text": SYSTEM_PROMPT}],
    messages=history,
    toolConfig={"tools": TOOL_DEFINITIONS, "toolChoice": {"auto": {}}}
)

out_msg = resp['output']['message']
print("Turn 1 output:")
print(json.dumps(out_msg, indent=2))

tool_requests = [c['toolUse'] for c in out_msg['content'] if 'toolUse' in c]
if tool_requests:
    t = tool_requests[0]
    history.append(out_msg)
    history.append({
        "role": "user",
        "content": [{
            "toolResult": {
                "toolUseId": t['toolUseId'],
                "content": [{"json": {"status": "success", "lead_id": "12345"}}],
                "status": "success"
            }
        }]
    })
    
    print("\nSending tool result to Converse...")
    try:
        resp2 = bedrock_runtime.converse(
            modelId='us.amazon.nova-lite-v1:0',
            system=[{"text": SYSTEM_PROMPT}],
            messages=history
        )
        print("Turn 2 output:")
        print(json.dumps(resp2['output']['message'], indent=2))
    except Exception as e:
        print(f"Error in turn 2: {e}")
