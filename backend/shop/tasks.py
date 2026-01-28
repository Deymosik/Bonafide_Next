from celery import shared_task
from .models import Order
from .telegram_notifications import send_order_notification
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_order_notification_task(order_id):
    """
    Асинхронная задача для отправки уведомления о заказе.
    :param order_id: ID заказа
    """
    try:
        order = Order.objects.get(id=order_id)
        result = send_order_notification(order)
        if result:
            logger.info(f"Notification for Order #{order_id} sent successfully via Celery.")
        else:
            logger.warning(f"Notification for Order #{order_id} failed via Celery.")
        return result
    except Order.DoesNotExist:
        logger.error(f"Order #{order_id} not found in send_order_notification_task.")
        return False
    except Exception as e:
        logger.error(f"Error in send_order_notification_task for Order #{order_id}: {e}")
        return False
@shared_task
def process_image_task(model_name, instance_id):
    """
    Задача для фоновой оптимизации изображений.
    :param model_name: Имя модели ('ProductImage' или 'PromoBanner')
    :param instance_id: ID записи
    """
    from .models import ProductImage, PromoBanner
    from .image_processing import optimize_image_file
    from django.core.files.base import ContentFile

    # Словарь поддерживаемых моделей
    model_map = {
        'ProductImage': ProductImage,
        'PromoBanner': PromoBanner
    }
    
    ModelClass = model_map.get(model_name)
    if not ModelClass:
        logger.error(f"Unknown model for image processing: {model_name}")
        return

    try:
        instance = ModelClass.objects.get(id=instance_id)
        if not instance.image:
            return

        logger.info(f"Starting image optimization for {model_name} #{instance_id}...")

        # Оптимизируем основное изображение
        result = optimize_image_file(instance.image)
        if result:
            new_filename, content = result
            # Сохраняем новый файл поверх старого (или создаем новый, Django разрулит имя)
            instance.image.save(new_filename, content, save=False)
            instance.save(update_fields=['image'])
            
            logger.info(f"Image for {model_name} #{instance_id} optimized successfully.")
        
    except ModelClass.DoesNotExist:
        logger.warning(f"Object {model_name} #{instance_id} not found during image processing.")
    except Exception as e:
        logger.error(f"Failed to process image for {model_name} #{instance_id}: {e}")

@shared_task
def create_backup_task(backup_id):
    """
    Задача создания бэкапа (БД + Медиа) в фоне.
    """
    from django.core.management import call_command
    from django.conf import settings
    from django.core.files.base import ContentFile
    from .models import Backup
    import zipfile
    import os
    from io import BytesIO, StringIO
    from datetime import datetime

    try:
        backup = Backup.objects.get(id=backup_id)
        backup.status = 'processing'
        backup.save(update_fields=['status'])
        
        # 1. Дамп базы данных
        buf = StringIO()
        call_command('dumpdata', exclude=['auth.permission', 'contenttypes', 'admin.logentry', 'sessions', 'shop.backup'], stdout=buf)
        buf.seek(0)
        db_json = buf.read()
        
        # 2. Создаем ZIP
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr('db_dump.json', db_json)
            
            media_root = settings.MEDIA_ROOT
            if os.path.exists(media_root):
                for root, dirs, files in os.walk(media_root):
                    if 'backups' in dirs:
                        dirs.remove('backups')
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, start=os.path.dirname(media_root))
                        zip_file.write(file_path, arcname)
                        
        # 3. Сохраняем файл
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
        filename = f"backup_{timestamp}.zip"
        
        backup.file.save(filename, ContentFile(zip_buffer.getvalue()), save=False)
        backup.status = 'success'
        backup.log = f"Успешно создано {datetime.now()}. Размер: {backup.size}"
        backup.save()
        
        logger.info(f"Backup #{backup_id} completed successfully.")
        
    except Exception as e:
        logger.error(f"Backup #{backup_id} failed: {e}")
        try:
            backup = Backup.objects.get(id=backup_id)
            backup.status = 'failed'
            backup.log = str(e)
            backup.save()
        except:
            pass

@shared_task
def restore_backup_task(backup_id):
    """
    Задача восстановления из бэкапа.
    """
    from django.core.management import call_command
    from django.conf import settings
    from .models import Backup
    import zipfile
    import os
    
    try:
        backup = Backup.objects.get(id=backup_id)
        backup.status = 'processing'
        backup.log = "Начало восстановления..."
        backup.save(update_fields=['status', 'log'])
        
        if not backup.file:
            raise Exception("Файл архива отсутствует.")
            
        with zipfile.ZipFile(backup.file.path, 'r') as zip_file:
            # 1. БД
            if 'db_dump.json' not in zip_file.namelist():
                raise Exception("В архиве нет db_dump.json")
                
            json_data = zip_file.read('db_dump.json').decode('utf-8')
            temp_file_path = os.path.join(settings.MEDIA_ROOT, 'temp_restore.json')
            with open(temp_file_path, 'w') as tmp_file:
                tmp_file.write(json_data)
                
            # Загружаем данные
            call_command('loaddata', temp_file_path)
            
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                
            # 2. Медиа
            media_parent = os.path.dirname(settings.MEDIA_ROOT)
            for member in zip_file.namelist():
                if member.startswith('media/') and 'backups/' not in member:
                    zip_file.extract(member, media_parent)
                    
        backup.status = 'success'
        backup.log += "\nВосстановление успешно завершено."
        backup.save(update_fields=['status', 'log'])
        logger.info(f"Restore from Backup #{backup_id} completed.")
        
    except Exception as e:
        logger.error(f"Restore for Backup #{backup_id} failed: {e}")
        try:
            backup = Backup.objects.get(id=backup_id)
            backup.status = 'failed'
            backup.log = f"Ошибка: {str(e)}"
            backup.save()
        except:
            pass
