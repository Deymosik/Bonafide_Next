from rest_framework.throttling import SimpleRateThrottle

class SmartUserRateThrottle(SimpleRateThrottle):
    """
    Лимиты для 'доверенных' пользователей (Telegram или Session).
    Rate: 'user' (1000/day).
    """
    scope = 'user'

    def get_cache_key(self, request, view):
        # 1. Проверяем Telegram User
        if hasattr(request, 'telegram_user') and request.telegram_user:
            ident = f"tg_{request.telegram_user['id']}"
            return self.cache_format % {'scope': self.scope, 'ident': ident}

        # 2. Проверяем Session Key
        if hasattr(request, 'session_key') and request.session_key:
            ident = f"sess_{request.session_key}"
            return self.cache_format % {'scope': self.scope, 'ident': ident}

        # 3. Проверяем стандартного юзера (Admin)
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
            return self.cache_format % {'scope': self.scope, 'ident': ident}

        # Если никого не нашли - возвращаем None
        # Это значит, что данный Throttle НЕ будет применяться к этому запросу.
        return None


class SmartAnonRateThrottle(SimpleRateThrottle):
    """
    Лимиты для неизвестных (Анонимы по IP).
    Rate: 'anon' (60/min).
    Срабатывает ТОЛЬКО если SmartUserRateThrottle не опознал пользователя.
    """
    scope = 'anon'

    def get_cache_key(self, request, view):
        # Если пользователь опознан, то этот троттлинг пропускаем!
        # (чтобы не списывать и user quota, и anon quota одновременно)
        
        is_identified = (
            (hasattr(request, 'telegram_user') and request.telegram_user) or
            (hasattr(request, 'session_key') and request.session_key) or
            (request.user and request.user.is_authenticated)
        )

        if is_identified:
            return None # Пропускаем, он "свой"

        # Если не опознан - баним по IP
        ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}
