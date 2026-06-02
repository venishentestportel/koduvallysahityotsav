import urllib.request
import json
import time

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def make_request(url, method, data=None):
    req_data = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        print(f"HTTP Error {e.code} for {method} {url}: {err_msg}")
        raise e

# 1. Test insertion into 'unit'
unit_payload = [{"unit name": "Test Sector 123"}]
print("Inserting into 'unit'...")
status, res_data = make_request(f"{base_url}/unit", "POST", unit_payload)
print(f"Status: {status}, Response: {res_data}")
unit_id = res_data[0]["id"]

# 2. Test fetching 'unit'
print("Fetching from 'unit'...")
status, res_data = make_request(f"{base_url}/unit?select=%22unit+name%22", "GET")
print(f"Status: {status}, Places: {[u['unit name'] for u in res_data]}")

# 3. Test insertion into 'registred'
reg_payload = [{
    "name": "Test Student 123",
    "Category": "LP",
    "Program": "Pencil Drawing",
    "unit": "Test Sector 123",
    "Stage": None,
    "time": "2026-05-22T23:56:20.000Z"
}]
print("Inserting into 'registred'...")
status, res_data = make_request(f"{base_url}/registred", "POST", reg_payload)
print(f"Status: {status}, Response: {res_data}")
reg_id = res_data[0]["id"]

# 4. Test updating 'registred'
update_payload = {
    "unit": "Test Sector 123 Updated"
}
print("Updating 'registred'...")
status, res_data = make_request(f"{base_url}/registred?id=eq.{reg_id}", "PATCH", update_payload)
print(f"Status: {status}, Response: {res_data}")

# 5. Clean up (delete inserted records)
print("Cleaning up...")
make_request(f"{base_url}/registred?id=eq.{reg_id}", "DELETE")
make_request(f"{base_url}/unit?id=eq.{unit_id}", "DELETE")
print("Cleanup complete!")
