import os
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def optimize_image_file(image_field, output_format='WEBP', quality=85, max_width=1920):
    """
    Принимает поле модели (ImageField) и оптимизирует файл внутри него.
    :param image_field: поле модели (например, product.image)
    :param output_format: формат (WEBP, JPEG)
    :param quality: качество (1-100)
    :param max_width: максимальная ширина (для ресайза огромных фото)
    :return: ContentFile (оптимизированный) или None, если что-то пошло не так
    """
    if not image_field:
        return None

    try:
        # Открываем изображение
        img = Image.open(image_field)
        
        # Если есть альфа-канал и мы конвертируем в JPEG (который его не поддерживает),
        # нужно заменить прозрачность на белый фон (или любой другой).
        # Но для WEBP прозрачность поддерживается, так что RGBA оставляем.
        if output_format.upper() == 'JPEG' and img.mode == 'RGBA':
            img = img.convert('RGB')
        
        # Ресайз (если слишком огромное)
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        # Сохраняем в буфер памяти
        output_io = BytesIO()
        img.save(output_io, format=output_format, quality=quality, optimize=True)
        
        # Создаем имя нового файла
        original_name = os.path.basename(image_field.name)
        name_without_ext = os.path.splitext(original_name)[0]
        new_filename = f"{name_without_ext}.{output_format.lower()}"

        return new_filename, ContentFile(output_io.getvalue())

    except Exception as e:
        logger.error(f"Error optimizing image {image_field.name}: {e}")
        return None
