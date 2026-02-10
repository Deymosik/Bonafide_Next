import requests
import sys

URL = "http://nginx:80/api/products/"

print("\n🗜️ --- GZIP TEST START ---")

try:
    # 1. Without Gzip
    print("Request #1: IDENTITY (No Compression)...")
    resp_raw = requests.get(URL, headers={"Accept-Encoding": "identity"}, timeout=5)
    size_raw = len(resp_raw.content)
    print(f"Size: {size_raw} bytes")
    print(f"Content-Encoding: {resp_raw.headers.get('Content-Encoding', 'None')}")

    # 2. With Gzip
    print("\nRequest #2: GZIP (Compression)...")
    resp_gzip = requests.get(URL, headers={"Accept-Encoding": "gzip"}, timeout=5)
    size_gzip = len(resp_gzip.content)
    encoding = resp_gzip.headers.get('Content-Encoding', 'None')
    
    print(f"Size: {size_gzip} bytes")
    print(f"Content-Encoding: {encoding}")

    if 'gzip' in encoding:
        reduction = (1 - size_gzip / size_raw) * 100
        print(f"\n✅ SUCCESS: Response compressed!")
        print(f"Reduction: {reduction:.1f}% ({size_raw} -> {size_gzip} bytes)")
    else:
        print("\n❌ FAILED: Response NOT compressed.")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
