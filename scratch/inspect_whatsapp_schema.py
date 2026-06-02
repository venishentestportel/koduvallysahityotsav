import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1/"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
}

req = urllib.request.Request(base_url, headers=headers)
try:
    with urllib.request.urlopen(req) as res:
        spec = json.loads(res.read().decode())
        definitions = spec.get("definitions", {})
        whatsapp_def = definitions.get("whatsapp", {})
        print("Columns for 'whatsapp' table:")
        properties = whatsapp_def.get("properties", {})
        for prop, info in properties.items():
            print(f"  - {prop}: {info.get('type')} ({info.get('description', '')})")
except Exception as e:
    print("Error:", e)
