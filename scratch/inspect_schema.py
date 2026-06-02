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
        schema = json.loads(res.read().decode())
        definitions = schema.get("definitions", {})
        for table_name, table_info in definitions.items():
            if table_name in ["registred", "unit", "valueatedresult", "GEN", "JR", "SR"]:
                print(f"\nTable: {table_name}")
                properties = table_info.get("properties", {})
                for prop_name, prop_info in properties.items():
                    print(f"  - {prop_name}: {prop_info.get('type')} ({prop_info.get('description', '')})")
except Exception as e:
    print(f"Error fetching schema: {e}")
