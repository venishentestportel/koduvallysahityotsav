import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
}

req = urllib.request.Request(f"{base_url}/stage%201?select=*&order=id.desc&limit=20", headers=headers)
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(f"Latest 20 rows in stage 1:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
