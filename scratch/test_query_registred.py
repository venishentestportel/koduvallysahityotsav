import urllib.request
import json

base_url = "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
    "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
}

def try_query(query_str):
    req = urllib.request.Request(f"{base_url}/registred?{query_str}", headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            print(f"Query '{query_str}': Status {res.status} (Success)")
    except urllib.error.HTTPError as e:
        print(f"Query '{query_str}': Status {e.code} - {e.read().decode().strip()}")

try_query("select=*")
try_query("select=id,name,Category")
try_query("select=Program")
try_query("select=unit")
try_query("select=Stage")
try_query("select=Program1")
try_query("select=sector")
try_query("select=generals")
