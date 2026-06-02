import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
}

def inspect(table):
    req = urllib.request.Request(f"{base_url}/{urllib.parse.quote(table)}?select=*&limit=1", headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print(f"Table '{table}' columns:")
            if data:
                for k in data[0].keys():
                    print(f"  - {k}: {data[0][k]}")
            else:
                print("  (No records)")
    except urllib.error.HTTPError as e:
        print(f"Failed to inspect '{table}': {e.code} - {e.read().decode()}")

inspect("Schedule Manager")
inspect("shediul")
inspect("valueatedresult")
