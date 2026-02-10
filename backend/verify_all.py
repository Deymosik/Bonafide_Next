import requests
import sys

URL = "http://nginx:80/api/products/"

print("\n🔒 --- SECURITY & OPTIMIZATION TEST ---")

try:
    # 1. Gzip Test
    print("\n[Testing Gzip...]")
    resp_raw = requests.get(URL, headers={"Accept-Encoding": "identity"}, timeout=5)
    resp_gzip = requests.get(URL, headers={"Accept-Encoding": "gzip"}, timeout=5)
    
    size_raw = len(resp_raw.content)
    size_gzip = len(resp_gzip.content)
    encoding = resp_gzip.headers.get('Content-Encoding', 'None')
    
    if encoding == 'gzip':
        print(f"✅ Gzip ENABLED (Headers: {encoding})")
        # In requests, content is auto-decompressed, so size check may be misleading unless we check raw socket.
        # But 'Content-Encoding: gzip' header PROVES server sent gzip.
    else:
        print(f"❌ Gzip DISABLED (Headers: {encoding})")

    # 2. Security Headers Test
    print("\n[Testing Security Headers...]")
    headers = resp_gzip.headers
    
    checks = {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
    
    all_passed = True
    for header, expected in checks.items():
        val = headers.get(header)
        if val:
            if expected in val:
                 print(f"✅ {header}: {val}")
            else:
                 print(f"⚠️ {header}: Found '{val}' but expected '{expected}'")
                 all_passed = False
        else:
            print(f"❌ {header}: MISSING")
            all_passed = False
            
    # HSTS check (Only for HTTPS, but good to check if present)
    hsts = headers.get('Strict-Transport-Security')
    if hsts:
        print(f"✅ HSTS: {hsts}")
    else:
        print(f"ℹ️ HSTS: Missing (Normal for HTTP Dev Environment)")

    if all_passed:
        print("\n🎉 ALL CHECKS PASSED!")
    else:
        print("\n⚠️ SOME CHECKS FAILED.")

except Exception as e:
    print(f"\n❌ Error: {e}")
