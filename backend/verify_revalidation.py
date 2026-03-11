import os
import sys
import django
import requests

# Инициализируем Django окружение
sys.path.append('/Users/vadimstepanov/WebstormProjects/BonaFide55_Next/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.conf import settings

def test_revalidation(slug="test-product"):
    print(f"--- Тестирование Webhook'а Ревалидации для '{slug}' ---")
    
    url = getattr(settings, 'NEXTJS_REVALIDATE_URL', 'http://localhost:3000/webhook/revalidate')
    token = getattr(settings, 'REVALIDATION_TOKEN', None)
    
    if not token:
        print("❌ ОШИБКА: REVALIDATION_TOKEN не найден в .env или настроен неверно.")
        return
        
    print(f"🔗 Отправка POST запроса на: {url}")
    print(f"🔑 Используемый токен: {token[:5]}... (скрыто)")
    
    payload = {
        'secret': token,
        'slug': slug
    }
    
    try:
        response = requests.post(url, json=payload, timeout=15)
        print(f"📥 Статус ответа: {response.status_code}")
        print(f"📄 Тело ответа: {response.json()}")
        
        if response.status_code == 200:
            print("✅ УСПЕХ: Next.js подтвердил ревалидацию кэша.")
        elif response.status_code == 401:
            print("❌ ОШИБКА: Next.js отклонил запрос (Неверный токен).")
        else:
            print("⚠️ ПРЕДУПРЕЖДЕНИЕ: Неожиданный ответ от Next.js.")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ СЕТЕВАЯ ОШИБКА: Не удалось достучаться до Next.js сервера: {e}")
        print("💡 Убедитесь, что Next.js запущен на порту 3000.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Test Next.js Revalidation Webhook")
    parser.add_argument('--slug', default="test-product", help="Product slug to revalidate")
    args = parser.parse_args()
    
    test_revalidation(args.slug)
