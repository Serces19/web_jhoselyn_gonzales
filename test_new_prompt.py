import requests
import json

API_URL = "https://x4konjc6z6.execute-api.us-east-1.amazonaws.com/api/chat"
session_id = "test_empathy_flow_v2"

turns = [
    "Tengo un problema con mi esposo, llevamos 3 años separados y él no le pasa pensión a mi hijo de 6 años",
    "Vivimos en Cochabamba. Mi hijo vive conmigo y el papá casi nunca lo ve.",
    "No sé cómo empezar, la verdad es que tengo miedo de que sea muy caro",
    "Me llamo María Luisa y mi WhatsApp es 71234567",
]

print("=== Prueba conversacion con nombre (v2) ===\n")
for i, t in enumerate(turns, 1):
    print(f"--- Turno {i} (Usuario) ---")
    print(t)
    resp = requests.post(API_URL, json={"session_id": session_id, "message": t})
    data = resp.json()
    print(f"Bot:\n{data.get('response')}\n")
    if data.get('lead'):
        lead = data.get('lead')
        print(f"[{'LEAD GUARDADO' if lead.get('status')=='success' else 'LEAD PENDIENTE'}] {lead}\n")
