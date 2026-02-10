import requests
import time
import sys

# Настройки
import requests
import time
import sys

# Настройки
# Используем имя сервиса (nginx) и порт 80, так как backend в той же сети
URL = "http://nginx:80/api/products/"

print("\n🚄 --- NGINX CACHE TEST START ---")

try:
    # 1. First Hit (MISS or EXPIRED)
    print("Request #1: Warming up cache...")
    start_time = time.perf_counter()
    response1 = requests.get(URL, timeout=5)
    duration1 = (time.perf_counter() - start_time) * 1000
    
    status1 = response1.headers.get('X-Cache-Status', 'UNKNOWN')
    print(f"Status: {response1.status_code}")
    print(f"X-Cache-Status: {status1}")
    print(f"Time: {duration1:.2f} ms")

    if response1.status_code != 200:
        print("❌ Error: API returned non-200")
        sys.exit(1)

    time.sleep(1)

    # 2. Second Hit (Should be HIT)
    print("\nRequest #2: Checking cache HIT...")
    start_time = time.perf_counter()
    response2 = requests.get(URL, timeout=5)
    duration2 = (time.perf_counter() - start_time) * 1000
    
    status2 = response2.headers.get('X-Cache-Status', 'UNKNOWN')
    print(f"Status: {response2.status_code}")
    print(f"X-Cache-Status: {status2}")
    print(f"Time: {duration2:.2f} ms")

    if status2 == 'HIT':
        print("\n✅ SUCCESS: Cache HIT confirmed!")
        print(f"Speedup: {duration1/duration2:.1f}x faster")
    else:
        print(f"\n❌ FAILED: Expected HIT, got {status2}")
        print("Check if Nginx is running and config is correct.")

    # --- Test 2: Settings (Static Data) ---
    URL_SETTINGS = "http://nginx:80/api/settings/"
    print("\n🚄 --- TESTING SETTINGS CACHE ---")
    requests.get(URL_SETTINGS) # Warmup
    time.sleep(0.5)
    
    start_time = time.perf_counter()
    resp_s = requests.get(URL_SETTINGS)
    dur_s = (time.perf_counter() - start_time) * 1000
    stat_s = resp_s.headers.get('X-Cache-Status', 'UNKNOWN')
    
    print(f"Settings Status: {stat_s}")
    print(f"Time: {dur_s:.2f} ms")
    
    if stat_s == 'HIT':
         print("✅ SUCCESS: Settings endpoint is cached!")
    else:
         print("❌ FAILED: Settings endpoint NOT cached.")

except Exception as e:
    print(f"\n❌ Connection Error: {e}")
    print("Ensure Nginx container is running on port 8080.")
