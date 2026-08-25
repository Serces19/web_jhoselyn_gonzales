import urllib.request
import json
import uuid
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://x4konjc6z6.execute-api.us-east-1.amazonaws.com/api/chat"
session_id = f"test_session_{uuid.uuid4()}"

print(f"Probando API en vivo: {API_URL}")
print(f"ID de Sesión: {session_id}\n")

# Conversación simulada de 3 turnos
test_turns = [
    "Hola, estoy pasando por un momento muy doloroso. Llevo 8 años casada pero mi esposo se fue de la casa y ahora me exige que venda la casa donde vivo con mis 2 hijos pequeños. No sé qué hacer.",
    "Vivimos en Cochabamba. La casa la compramos juntos hace 4 años mediante un crédito bancario. Me llamo Camila Montaño y mi WhatsApp es +591 71799882.",
    "Muchas gracias por la orientación, ¿cómo podemos coordinar una cita privada?"
]

for i, message in enumerate(test_turns, 1):
    print(f"--- TURNO {i} (Usuario) ---")
    print(f"Pregunta: {message}\n")
    
    payload = json.dumps({"session_id": session_id, "message": message}).encode('utf-8')
    req = urllib.request.Request(API_URL, data=payload, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            print(f"--- RESPUESTA (Turno {res_data.get('turn_count')}/{res_data.get('max_turns')}) ---")
            print(res_data.get('response'))
            if res_data.get('lead'):
                print("\n🎉 LEAD CAPTURADO Y REGISTRADO EN DYNAMODB:")
                print(json.dumps(res_data.get('lead'), indent=2, ensure_ascii=False))
            print("\n" + "="*50 + "\n")
    except Exception as e:
        print(f"Error en Turno {i}: {e}")
        break

print("✅ Prueba de API en vivo completada exitosamente.")
