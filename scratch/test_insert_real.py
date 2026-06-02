import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

payload = [{
    "name": "Test Student C",
    "sector": "Test Sector",
    "Category": "LP",
    "Program1": "Pencil Drawing",
    "Program2": "Coloring",
    "generals": "General Program 1",
    "url": "http://localhost:5000/registringpage.html?name=Test%20Student%20C",
    "time": "2026-05-22T23:56:20.000Z"
}]

req = urllib.request.Request(f"{base_url}/registred", data=json.dumps(payload).encode(), headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as res:
        print("Status Code:", res.status)
        data = json.loads(res.read().decode())
        print("Inserted record:", json.dumps(data, indent=2))
        
        # Cleanup
        row_id = data[0].get("id")
        if row_id:
            req_del = urllib.request.Request(f"{base_url}/registred?id=eq.{row_id}", headers=headers, method="DELETE")
            urllib.request.urlopen(req_del)
            print("Deleted successfully.")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
