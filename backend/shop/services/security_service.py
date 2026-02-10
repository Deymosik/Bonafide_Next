import logging
from django.conf import settings
from ..models import BlacklistedItem, ShopSettings
from ..telegram_notifications import format_security_alert_message, send_telegram_message

logger = logging.getLogger(__name__)

class SecurityService:
    @staticmethod
    def ban_user(ip=None, telegram_id=None, reason="Security Violation", duration_hours=None):
        """
        Банит пользователя (IP или Telegram ID) и отправляет уведомление.
        Возвращает tuple: (BlacklistedItem, was_banned_now: bool)
        """
        subject_type = None
        subject_value = None

        if telegram_id:
            subject_type = BlacklistedItem.ItemType.TELEGRAM_ID
            subject_value = telegram_id
        elif ip:
            subject_type = BlacklistedItem.ItemType.IP
            subject_value = ip
        else:
            return None, False

        # 1. Сначала ищем существование
        # Мы не используем get_or_create сразу, чтобы понять, был ли он active
        obj = BlacklistedItem.objects.filter(item_type=subject_type, value=subject_value).first()
        
        was_banned_now = False

        if not obj:
            # Создаем нового
            obj = BlacklistedItem.objects.create(
                item_type=subject_type, 
                value=subject_value,
                reason=reason,
                is_active=True
            )
            was_banned_now = True
        else:
            # Если уже есть, проверяем активность
            if not obj.is_active:
                obj.is_active = True
                obj.reason = f"{reason} (Reactivated)"
                obj.save(update_fields=['is_active', 'reason'])
                was_banned_now = True
            else:
                # Уже в бане. Можно обновить причину, если она "весомее" (например HoneyPot важнее AutoBan)
                # Но пока оставим как есть.
                pass

        if was_banned_now:
            from django.core.cache import cache
            cache.delete('blacklist_set')
            SecurityService.notify_admin(obj, count=1 if not duration_hours else "MANY", duration_hours=duration_hours or 0)

        return obj, was_banned_now

    @staticmethod
    def notify_admin(obj, count=1, duration_hours=1):
        """
        Отправляет алерт админу.
        """
        settings_obj = ShopSettings.objects.first()
        if not settings_obj or not settings_obj.manager_telegram_chat_id:
            return

        msg = format_security_alert_message(
            ip=obj.value if obj.item_type == BlacklistedItem.ItemType.IP else None,
            telegram_id=obj.value if obj.item_type == BlacklistedItem.ItemType.TELEGRAM_ID else None,
            count=count,
            reason=obj.reason,
            duration_hours=duration_hours,
            blacklist_id=obj.id
        )
        send_telegram_message(settings_obj.manager_telegram_chat_id, msg)
