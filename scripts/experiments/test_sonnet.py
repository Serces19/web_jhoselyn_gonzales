import boto3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

candidates = [
    'us.anthropic.claude-sonnet-4-6',
    'us.anthropic.claude-sonnet-5',
    'us.anthropic.claude-haiku-4-5-20251001-v1:0'
]

messages = [{"role": "user", "content": [{"text": "Hola, necesito orientación jurídica urgente."}]}]

for model_id in candidates:
    print(f"Probando {model_id}...")
    try:
        res = bedrock.converse(
            modelId=model_id,
            messages=messages,
            inferenceConfig={"maxTokens": 100}
        )
        print(f"✅ {model_id} FUNCIONA OK!")
        print("Respuesta:", res['output']['message']['content'][0]['text'][:100])
    except Exception as e:
        print(f"❌ {model_id} Error: {e}")
