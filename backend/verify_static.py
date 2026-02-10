import requests

URL = "http://nginx:80/django-static/admin/css/base.css"

print("\n--- STATIC FILE HEADERS ---")
try:
    resp = requests.get(URL, timeout=5)
    print(f"Status: {resp.status_code}")
    
    headers = resp.headers
    print(f"Permissions-Policy: {headers.get('Permissions-Policy', 'MISSING')}")
    print(f"X-Frame-Options: {headers.get('X-Frame-Options', 'MISSING')}")
    
except Exception as e:
    print(f"Error: {e}")
