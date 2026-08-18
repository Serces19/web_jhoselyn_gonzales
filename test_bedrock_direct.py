import boto3

bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

candidates = [
    'amazon.nova-micro-v1:0',
    'us.amazon.nova-lite-v1:0',
    'us.amazon.nova-micro-v1:0',
    'us.anthropic.claude-3-5-haiku-20241022-v1:0'
]

for c in candidates:
    print(f"Probando inference profile: {c}")
    try:
        resp = bedrock_runtime.converse(
            modelId=c,
            messages=[{"role": "user", "content": [{"text": "Hola, confirma en una sola palabra si funcionas."}]}]
        )
        print(f"  >>> EXITO! {resp['output']['message']['content'][0]['text']}\n")
    except Exception as e:
        print(f"  >>> Error: {e}\n")
