import os
import json
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Supabase credentials not found in env, using hardcoded ones from html if possible. Please provide them.")
    exit(1)

supabase = create_client(url, key)

print("--- REGISTRED TABLE ---")
res = supabase.table('registred').select('*').limit(2).execute()
print(json.dumps(res.data, indent=2))

print("\n--- REGIST TABLE ---")
res2 = supabase.table('regist').select('*').limit(2).execute()
print(json.dumps(res2.data, indent=2))
