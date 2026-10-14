import requests
import json

API_URL = "https://x4konjc6z6.execute-api.us-east-1.amazonaws.com/api/chat"

payload = {
    "session_id": "test_session_12345",
    "message": "Hola, necesito asesoría. Mi esposo se fue hace 2 años a España y queremos divorciarnos por mutuo acuerdo, tenemos una hija de 8 años en Cochabamba."
}

print(f"Enviando consulta a {API_URL}...")
resp = requests.post(API_URL, json=payload)
print(f"Status code: {resp.status_code}")
try:
    data = resp.json()
    print("Respuesta recibida:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error parsing json: {e}")
    print(resp.text)
