import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
}

def query_table(table):
    req = urllib.request.Request(f"{base_url}/{urllib.parse.quote(table)}?select=*&limit=5", headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print(f"\n--- {table} ---")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error {table}: {e}")

query_table("Mark Management")
query_table("Schedule Manager")
