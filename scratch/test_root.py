import urllib.request
import json

urls = [
    "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1",
    "https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1/"
]

for url in urls:
    print(f"\nTrying {url}...")
    # Try with both headers
    headers1 = {
        "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT",
        "Authorization": "Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
    }
    req1 = urllib.request.Request(url, headers=headers1)
    try:
        with urllib.request.urlopen(req1) as res:
            print("  Success with both headers!")
            data = json.loads(res.read().decode())
            print("  Keys:", list(data.keys()))
            if "definitions" in data:
                print("  Tables:", list(data["definitions"].keys()))
            continue
    except Exception as e:
        print(f"  Failed with both headers: {e}")

    # Try with apikey only
    headers2 = {
        "apikey": "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT"
    }
    req2 = urllib.request.Request(url, headers=headers2)
    try:
        with urllib.request.urlopen(req2) as res:
            print("  Success with apikey only!")
            data = json.loads(res.read().decode())
            print("  Keys:", list(data.keys()))
            if "definitions" in data:
                print("  Tables:", list(data["definitions"].keys()))
            continue
    except Exception as e:
        print(f"  Failed with apikey only: {e}")
