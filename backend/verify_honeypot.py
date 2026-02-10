import requests
import time
import os
import django
import sys

# Настройка Django окружения
sys.path.append('/app')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from shop.models import BlacklistedItem, SecurityBlockLog, ShopSettings

# 1. Настройки
URL_TRAP = "http://127.0.0.1:8000/api/admin-secret-debug/"
URL_NORMAL = "http://127.0.0.1:8000/api/products/"
TEST_IP = '127.0.0.1' 

print("\n🍯 --- HONEYPOT TEST START ---")

# 2. Очистка
print("🧹 Cleaning up blacklist...")
BlacklistedItem.objects.filter(value=TEST_IP).delete()

# 3. Атака (касание ловушки)
print(f"👻 Touching the trap: {URL_TRAP}")
try:
    response = requests.get(URL_TRAP, timeout=2)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 403:
         print("✅ Received 403 Forbidden (Trap worked)")
    else:
         print(f"⚠️ Unexpected status: {response.status_code}")

except Exception as e:
    print(f"❌ Error hitting trap: {e}")

# 4. Проверка бана
time.sleep(1)
is_banned = BlacklistedItem.objects.filter(value=TEST_IP, is_active=True).exists()

if is_banned:
    print("✅ SUCCESS: IP is INSTANTLY BANNED in Database!")
else:
    print("❌ FAILED: IP is NOT in Blacklist.")

# 5. Проверка доступа к нормальным ресурсам
print("🕵️ Verifying access blocked to normal resources...")
try:
    response = requests.get(URL_NORMAL, timeout=1)
    if response.status_code == 403:
         print(f"✅ Normal URL {URL_NORMAL} is also 403 Forbidden.")
    else:
         print(f"❌ Normal URL returned {response.status_code} (Should be 403). check middleware.")

except Exception as e:
    print(f"Request error: {e}")
