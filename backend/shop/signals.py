from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from django.conf import settings
import requests
import logging

from .models import ProductImage, PromoBanner, Product
from .tasks import process_image_task

logger = logging.getLogger('shop')

@receiver(post_save, sender=ProductImage)
def trigger_product_image_optimization(sender, instance, created, **kwargs):
    """
    Запускает задачу оптимизации изображения при сохранении.
    """
    if not instance.image:
        return

    # Защита от бесконечного цикла: если файл уже WebP, считаем его оптимизированным
    # (или если это повторное сохранение самой задачей)
    if instance.image.name.lower().endswith('.webp'):
        return

    # Запускаем задачу только после успешной транзакции
    transaction.on_commit(lambda: process_image_task.delay('ProductImage', instance.id))


@receiver(post_save, sender=PromoBanner)
def trigger_banner_optimization(sender, instance, created, **kwargs):
    """
    Аналогично для баннеров.
    """
    if not instance.image:
        return

    if instance.image.name.lower().endswith('.webp'):
        return

    transaction.on_commit(lambda: process_image_task.delay('PromoBanner', instance.id))

# --- REVALIDATION SIGNALS ---

@receiver(post_save, sender=Product)
def trigger_product_revalidation(sender, instance, created, **kwargs):
    """
    При изменении товара (включая сток или цены) триггерим ревалидацию
    страницы товара используя фоновую задачу Celery.
    """
    from .tasks import send_revalidation_webhook_task
    # Используем on_commit, чтобы задача отправилась в брокера только после того,
    # как транзакция успешна сохранена в БД (избегаем race conditions).
    transaction.on_commit(lambda: send_revalidation_webhook_task.delay(instance.slug))
