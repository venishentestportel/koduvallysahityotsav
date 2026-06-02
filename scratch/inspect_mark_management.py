import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
}

# Try a POST with empty payload to get columns
req = urllib.request.Request(f"{base_url}/Mark%20Management", data=json.dumps([{}]).encode(), headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(f"Mark Management columns:")
        if data:
            for k in data[0].keys():
                print(f"  - {k}")
except urllib.error.HTTPError as e:
    print(f"Failed: {e.code} - {e.read().decode()}")
