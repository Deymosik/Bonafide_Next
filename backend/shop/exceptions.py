from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled
from .models import SecurityBlockLog

def custom_exception_handler(exc, context):
    """
    Перехватываем исключения DRF.
    Если это Throttled (429), логируем инцидент в БД.
    """
    
    # Сначала получаем стандартный ответ DRF
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled) and response is not None:
        try:
            request = context.get('request')
            if request:
                # Извлекаем IP
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip = x_forwarded_for.split(',')[0]
                else:
                    ip = request.META.get('REMOTE_ADDR')

                # Извлекаем Telegram ID (если есть)
                telegram_id = None
                if hasattr(request, 'telegram_user') and request.telegram_user:
                    telegram_id = str(request.telegram_user.get('id'))

                # Определяем тип сработавшего лимита
                # exc.wait может подсказать, но точного названия класса throttle нет в объекте исключения
                # Запишем просто 'Throttled' или попробуем угадать по view
                
                SecurityBlockLog.objects.create(
                    ip_address=ip,
                    telegram_id=telegram_id,
                    request_path=request.path,
                    limit_type="RateLimitExceeded" 
                )
        except Exception as e:
            # Ошибка логирования не должна ломать ответ пользователю
            print(f"SECURITY LOGGING ERROR: {e}")

    return response
