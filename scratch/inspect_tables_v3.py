import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def inspect_table(table_name):
    # Try inserting an empty payload/id to trigger a return of all columns
    payload = [{}]
    req = urllib.request.Request(f"{base_url}/{urllib.parse.quote(table_name)}", data=json.dumps(payload).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print(f"Table '{table_name}' columns:")
            if data:
                for k in data[0].keys():
                    print(f"  - {k}")
                # Clean up if an ID was generated
                row_id = data[0].get("id")
                if row_id:
                    req_del = urllib.request.Request(f"{base_url}/{urllib.parse.quote(table_name)}?id=eq.{row_id}", headers=headers, method="DELETE")
                    urllib.request.urlopen(req_del)
    except urllib.error.HTTPError as e:
        print(f"Failed to inspect '{table_name}': {e.code} - {e.read().decode()}")

inspect_table("valueatedresult")
inspect_table("unit")
inspect_table("GEN")
inspect_table("LP")
