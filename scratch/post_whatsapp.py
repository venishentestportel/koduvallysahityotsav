import urllib.request
import json

url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1/whatsapp"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

data = {"conname": "Test Contact", "label": "test_sector"}
req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode(), method="POST")

try:
    with urllib.request.urlopen(req) as res:
        print("Success:", res.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("Error:", e)
