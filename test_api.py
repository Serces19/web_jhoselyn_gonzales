import requests
import json

url = "https://x4konjc6z6.execute-api.us-east-1.amazonaws.com/api/appointments"
payload = {
    "name": "Test User",
    "phone": "12345678",
    "date": "2026-07-31",
    "time": "10:00",
    "reason": "Testing API"
}
headers = {'Content-Type': 'application/json'}

print(f"Sending POST to {url}")
try:
    response = requests.post(url, json=payload, headers=headers)
    print("Status:", response.status_code)
    print("Response:", response.text)
    print("Headers:", response.headers)
except Exception as e:
    print("Error:", e)
