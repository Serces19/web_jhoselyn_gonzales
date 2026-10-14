import boto3
import json

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

test_models = [
    'us.openai.gpt-5.6-luna',
    'us.xai.grok-4.6',
    'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    'us.amazon.nova-2-lite-v1:0'
]

messages = [
    {
        "role": "user",
        "content": [{"text": "Hola, soy una madre desesperada. Mi exesposo no me pasa pensión hace 6 meses. ¿Cómo me orientas?"}]
    }
]

for model_id in test_models:
    print(f"\n==========================================")
    print(f"Probando modelo: {model_id}")
    print(f"==========================================")
    try:
        response = bedrock.converse(
            modelId=model_id,
            system=[{"text": "Eres la asistente legal de la Dra. Jhoselyn Gonzales en Bolivia. Sé muy empática y orienta según la Ley 603."}],
            messages=messages,
            inferenceConfig={"temperature": 0.5, "maxTokens": 300}
        )
        text = response['output']['message']['content'][0]['text']
        usage = response.get('usage', {})
        print("RESPUESTA EXITOSA:")
        print(text[:300] + "...")
        print(f"Tokens usados: {usage}")
        print(f"STATUS: FUNCIONA PERFECTO")
    except Exception as e:
        print(f"ERROR: {e}")
