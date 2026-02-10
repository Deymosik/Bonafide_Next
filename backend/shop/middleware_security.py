from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.http import HttpResponseForbidden
from .models import BlacklistedItem

class BlacklistMiddleware(MiddlewareMixin):
    """
    Блокирует запросы от IP или Telegram ID, находящихся в черном списке.
    Для производительности кеширует список блокировок.
    """
    
    CACHE_KEY = 'blacklist_set'
    CACHE_TIMEOUT = 300  # 5 минут (обновлять кеш не чаще)

    def _get_blacklist(self):
        # Пытаемся получить из кеша
        blacklist = cache.get(self.CACHE_KEY)
        if blacklist is None:
            # Если нет - грузим из БД
            # Формат: {'IP:127.0.0.1', 'TG:123456'}
            items = BlacklistedItem.objects.filter(is_active=True).values('item_type', 'value')
            blacklist = {f"{item['item_type']}:{item['value']}" for item in items}
            cache.set(self.CACHE_KEY, blacklist, self.CACHE_TIMEOUT)
        return blacklist

    def process_request(self, request):
        blacklist = self._get_blacklist()

        # 1. Проверяем IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
            
        if f"IP:{ip}" in blacklist:
            return HttpResponseForbidden("Access Denied (IP Blacklisted)")

        # 2. Проверяем Telegram ID (если мы уже прошли AuthMiddleware)
        # AuthMiddleware обычно идет ПОСЛЕ этого middleware?
        # В settings.py Middleware идут сверху вниз для process_request.
        # Если мы поставим этот Middleware ПОСЛЕ SessionAuthMixin (который вообще View), то поздно.
        # Нам нужно достать Telegram ID "вручную" если он не распаршен, или положиться на порядок.
        
        # В views.py SessionAuthMixin - это View Mixin, он не Middleware.
        # Значит request.telegram_user ЕЩЕ НЕ СУЩЕСТВУЕТ на этапе Middleware.
        # Нам нужно парсить хеш самим или (проще) проверять TG ID внутри View.
        
        # НО: Мы можем сделать легкий парсинг заголовка здесь, если критично.
        # Пока ограничимся IP блокировкой на уровне Middleware, 
        # а TG блокировку можно добавить в SmartThrottle (он вернет False если в черном списке).
        
        return None
