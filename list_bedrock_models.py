import boto3
import json

bedrock = boto3.client('bedrock', region_name='us-east-1')

print("--- INFERENCE PROFILES ---")
try:
    profiles = bedrock.list_inference_profiles()
    for p in profiles.get('inferenceProfileSummaries', []):
        print(f"Profile: {p.get('inferenceProfileName')} | ID: {p.get('inferenceProfileId')}")
except Exception as e:
    print(f"Error profiles: {e}")

print("\n--- FOUNDATION MODELS (CLAUDE & NOVA) ---")
try:
    models = bedrock.list_foundation_models()
    for m in models.get('modelSummaries', []):
        m_id = m.get('modelId')
        if 'claude' in m_id.lower() or 'nova' in m_id.lower():
            print(f"Model: {m_id} | Name: {m.get('modelName')} | Status: {m.get('modelLifecycle', {}).get('status')}")
except Exception as e:
    print(f"Error models: {e}")
