import requests
import sys
import time
import os

# Мы атакуем локальный адрес контейнера
URL = "http://127.0.0.1:8000/api/products/"
limit_per_min = 60
# Делаем с запасом, чтобы точно пробить лимит
TOTAL_REQUESTS = limit_per_min + 15 

print(f"\n🚀 --- НАЧАЛО СИМУЛЯЦИИ АТАКИ ---")
print(f"Цель: {URL}")
print(f"Лимит для анонимов: {limit_per_min}/мин")
print(f"Планируется запросов: {TOTAL_REQUESTS}")
print("-" * 40)

success_count = 0
blocked_count = 0
start_time = time.time()

for i in range(1, TOTAL_REQUESTS + 1):
    try:
        # Отправляем запрос
        response = requests.get(URL, timeout=2)
        
        status = response.status_code
        
        if status == 200:
            # Успех
            print(f"Запрос #{i}: ✅ 200 OK")
            success_count += 1
        elif status == 429:
            # Блокировка
            print(f"Запрос #{i}: ⛔ 429 Too Many Requests (ЗАЩИТА СРАБОТАЛА)")
            blocked_count += 1
        else:
            print(f"Запрос #{i}: ⚠️ {status}")

    except Exception as e:
        print(f"Запрос #{i}: ❌ Ошибка соединения ({e})")

    # Небольшая задержка, чтобы не крашнуть сам скрипт, но достаточно "спамить"
    time.sleep(0.05)

duration = time.time() - start_time
print("-" * 40)
print(f"⏱  Время атаки: {duration:.2f} сек")
print(f"✅ Пропущено: {success_count}")
print(f"⛔ Заблокировано: {blocked_count}")

if blocked_count > 0:
    print("\n🎉 ТЕСТ ПРОЙДЕН: Система successfully отразила атаку!")
    print("Теперь зайдите в Админку -> 'Журнал атак (429)' и убедитесь, что логи появились.")
else:
    print("\n⚠️ ТЕСТ НЕ ПРОЙДЕН: Лимиты не сработали.")
