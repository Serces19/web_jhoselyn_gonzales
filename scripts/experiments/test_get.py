import requests
url = "https://x4konjc6z6.execute-api.us-east-1.amazonaws.com/api/availability?date=2026-07-31"
response = requests.get(url)
print("Status:", response.status_code)
print("Response:", response.text)
