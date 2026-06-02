import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
}

def check_table(table_name):
    req = urllib.request.Request(f"{base_url}/{urllib.parse.quote(table_name)}?select=*&limit=5", headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print(f"\n--- Table '{table_name}' (First 5 records) ---")
            print(json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print(f"Error querying table '{table_name}': {e.code} - {e.reason}")
        try:
            print(e.read().decode())
        except:
            pass

check_table("unit")
check_table("registred")
check_table("whatsapp")
