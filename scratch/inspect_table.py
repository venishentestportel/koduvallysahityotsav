import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
}

req = urllib.request.Request(f"{base_url}/", headers=headers)
try:
    with urllib.request.urlopen(req) as res:
        schema = json.loads(res.read().decode())
        # Print table names
        print("Available tables in definitions:")
        definitions = schema.get("definitions", {})
        for name in definitions.keys():
            if name.lower() == "registred" or "regist" in name.lower():
                print(f"\nProperties of table '{name}':")
                props = definitions[name].get("properties", {})
                for col_name, col_info in props.items():
                    print(f"  - {col_name}: {col_info.get('type')} ({col_info.get('description', '')})")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
