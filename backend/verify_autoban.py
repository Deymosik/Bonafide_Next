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

# 1. Настройки теста
URL = "http://127.0.0.1:8000/api/products/"
TEST_IP = '127.0.0.1' 
# ВНИМАНИЕ: Внутри контейнера localhost м.б. ::1 или 127.0.0.1, но запросы requests идут как REMOTE_ADDR.
# При запуске из контейнера backend IP будет 127.0.0.1.

print("\n🚀 --- AUTO-BAN TEST START ---")

# 2. Очистка (для чистоты эксперимента)
print("🧹 Cleaning up logs and blacklist...")
SecurityBlockLog.objects.filter(ip_address=TEST_IP).delete()
BlacklistedItem.objects.filter(value=TEST_IP).delete()

# Настраиваем порог пониже для теста, если надо, или используем дефолт (15)
settings = ShopSettings.objects.first()
if not settings:
    ShopSettings.objects.create() # Create default
    settings = ShopSettings.objects.first()

print(f"Threshold: {settings.auto_ban_threshold}")
needed_requests = settings.auto_ban_threshold + 5

# 3. Атака
print(f"🔥 Spamming {needed_requests} requests to trigger 429...")

# Сначала "прогреваем" лимит (60), чтобы начать ловить 429
# Но лимит 60/мин. Чтобы получить 429, нужно > 60.
# И нам нужно получить 429 * Threshold раз.
# Итого нужно: 60 (успешных) + Threashold (блокированных).
# Если Threshold = 15, то нужно 75+ запросов.

total_to_send = 80 
blocked_count = 0

for i in range(1, total_to_send + 1):
    try:
        response = requests.get(URL, timeout=0.5)
        if response.status_code == 429:
            print(f"#{i}: 429 BLOCKED")
            blocked_count += 1
        else:
            # print(f"#{i}: {response.status_code} OK")
            pass
    except:
        pass
    # Быстро долбим
    if i % 10 == 0:
        time.sleep(0.1)

print(f"Finished spamming. Total 429 caught: {blocked_count}")

# 4. Проверка Авто-Бана
print("🕵️ Checking Blacklist...")
# Даем время Celery на обработку (сигнал -> очередь -> воркер)
time.sleep(5) 

is_banned = BlacklistedItem.objects.filter(value=TEST_IP, is_active=True).exists()

if is_banned:
    print("✅ SUCCESS: IP is strictly BANNED in Database!")
    print("Check Telegram for notification!")
else:
    print("❌ FAILED: IP is NOT in Blacklist.")
    count = SecurityBlockLog.objects.filter(ip_address=TEST_IP).count()
    print(f"Logs count in DB: {count}")
