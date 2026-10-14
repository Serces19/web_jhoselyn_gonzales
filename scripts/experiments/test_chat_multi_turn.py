import requests
import json

API_URL = "https://x4konjc6z6.execute-api.us-east-1.amazonaws.com/api/chat"

session_id = "test_lead_simulation_99"

turns = [
    "Hola, vivo en Cochabamba y mi esposo en España. Queremos divorciarnos por mutuo acuerdo, tenemos una hija de 8 años.",
    "Mi nombre es Patricia Alvarez, mi WhatsApp es 77998811. Vivimos en Cochabamba y solo tenemos un departamento en alquiler. Queremos pagar la consulta por QR banco Unión."
]

for i, t in enumerate(turns, 1):
    print(f"\n--- Turno {i}: Usuario ---")
    print(t)
    resp = requests.post(API_URL, json={"session_id": session_id, "message": t})
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Bot:\n{data.get('response')}\n")
    if data.get('lead'):
        print(f"[LEAD REGISTRADO]: {data.get('lead')}")
