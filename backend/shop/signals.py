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

def revalidate_product(slug):
    """
    Отправляет запрос в Next.js для ревалидации страницы товара.
    """
    try:
        url = settings.NEXTJS_REVALIDATE_URL
        token = settings.REVALIDATION_TOKEN
        
        # Если мы запускаем тесты или локально без фронтенда, можно добавить проверку
        # Но requests просто кинет исключение, которое мы ловим.

        payload = {
            'secret': token,
            'slug': slug
        }
        
        response = requests.post(url, json=payload, timeout=2) # Таймаут 2 сек, чтобы не висело
        if response.status_code == 200:
            logger.info(f"Successfully triggered revalidation for {slug}")
        else:
            logger.warning(f"Failed to revalidate {slug}. Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        logger.error(f"Error triggering revalidation for {slug}: {str(e)}")

@receiver(post_save, sender=Product)
def trigger_product_revalidation(sender, instance, created, **kwargs):
    """
    При изменении товара (включая сток) триггерим ревалидацию.
    """
    # Используем on_commit, чтобы запрос ушел только после того, как данные реально записались в БД
    transaction.on_commit(lambda: revalidate_product(instance.slug))
