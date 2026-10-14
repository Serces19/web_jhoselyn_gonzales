import boto3
import json
import uuid

# Test the upgraded Bedrock model and prompt flow directly
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0'

print(f"Testing direct Bedrock invocation with model: {MODEL_ID}...")

system_prompt = (
    "Eres el Asistente Jurídico Virtual de la Dra. Jhoselyn Gonzales en Cochabamba, Bolivia. "
    "Tu filosofía es la escucha empática profunda y acompañar a la persona en su problema."
)

messages = [
    {
        "role": "user",
        "content": [{"text": "Hola, tengo un problema muy grave. Mi exesposo no me pasa la pensión de mis 2 hijos desde hace 6 meses y se fue a vivir a Santa Cruz. Estoy muy angustiada."}]
    }
]

try:
    response = bedrock.converse(
        modelId=MODEL_ID,
        system=[{"text": system_prompt}],
        messages=messages,
        inferenceConfig={"temperature": 0.5, "maxTokens": 500}
    )
    
    output = response['output']['message']['content'][0]['text']
    usage = response.get('usage', {})
    
    print("\n--- RESPUESTA DEL ASISTENTE CLAUDE 3.5 HAIKU ---")
    print(output)
    print("\n--- MÉTRICAS DE TOKENS ---")
    print(json.dumps(usage, indent=2))
    print("\n✅ Conexión con Claude 3.5 Haiku en Bedrock exitosa!")

except Exception as e:
    print(f"\n❌ Error al invocar Bedrock: {e}")
