from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SecurityBlockLog
from .tasks import check_and_autoban_task

@receiver(post_save, sender=SecurityBlockLog)
def trigger_security_check(sender, instance, created, **kwargs):
    """
    При каждой записи о нарушении (429) запускаем асинхронную проверку.
    """
    if created:
        # Запускаем Celery-задачу
        # Используем delay() для асинхронности
        check_and_autoban_task.delay(instance.ip_address, instance.telegram_id)
