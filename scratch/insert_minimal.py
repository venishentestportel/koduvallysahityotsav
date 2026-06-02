import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

payload = [{"name": "Schema Test Student"}]
req = urllib.request.Request(f"{base_url}/registred", data=json.dumps(payload).encode(), headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print("Insert Success!")
        print(json.dumps(data, indent=2))
        
        # Clean up
        if data:
            row_id = data[0].get("id")
            if row_id:
                req_del = urllib.request.Request(f"{base_url}/registred?id=eq.{row_id}", headers=headers, method="DELETE")
                with urllib.request.urlopen(req_del) as res_del:
                    print(f"Cleanup status: {res_del.status}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
