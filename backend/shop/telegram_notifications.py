# shop/telegram_notifications.py
"""
Модуль для отправки уведомлений о заказах в Telegram.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"
REQUEST_TIMEOUT = 10  # секунды


def get_shop_settings():
    """Получает настройки магазина (синглтон)."""
    from .models import ShopSettings
    return ShopSettings.objects.first()


def format_order_message(order):
    """
    Форматирует сообщение о заказе для отправки в Telegram.
    Использует HTML-разметку для красивого отображения.
    """
    # Собираем список товаров
    items_text = ""
    for i, item in enumerate(order.items.all(), start=1):
        items_text += f"{i}. {item.product.name} × {item.quantity} шт. — {item.price_at_purchase:,.0f} ₽\n"

    # Формируем адрес в зависимости от способа доставки
    if order.delivery_method == "СДЭК":
        address = f"📍 ПВЗ СДЭК: {order.cdek_office_address}"
    else:
        address_parts = [order.city]
        if order.street:
            address_parts.append(f"ул. {order.street}")
        if order.house:
            address_parts.append(f"д. {order.house}")
        if order.apartment:
            address_parts.append(f"кв. {order.apartment}")
        if order.postcode:
            address_parts.append(f"(индекс: {order.postcode})")
        address = f"📍 {', '.join(address_parts)}"

    # Определяем статус бесплатной доставки
    delivery_status_suffix = ""
    settings_obj = get_shop_settings()
    if settings_obj and settings_obj.free_shipping_threshold:
        threshold = settings_obj.free_shipping_threshold
        # Если порог > 0, проверяем сумму
        if threshold > 0:
            if order.final_total >= threshold:
                delivery_status_suffix = " (Бесплатно)"
            else:
                delivery_status_suffix = " (Платная)"

    # Формируем текст скидки
    discount_text = ""
    if order.discount_amount and order.discount_amount > 0:
        discount_text = f"🎁 <b>Скидка:</b> -{order.discount_amount:,.0f} ₽"
        if order.applied_rule:
            discount_text += f" ({order.applied_rule})"
        discount_text += "\n"

    # Telegram ID клиента (если есть)
    client_tg = ""
    if order.telegram_id:
        client_tg = f"\n🆔 Telegram ID: <code>{order.telegram_id}</code>"

    # Ссылка на заказ в админке
    admin_url = ""
    site_url = getattr(settings, 'SITE_URL', '')
    admin_path = getattr(settings, 'ADMIN_URL', 'admin/')
    if site_url:
        admin_url = f"\n\n🔗 <a href=\"{site_url}/{admin_path}shop/order/{order.id}/change/\">Открыть в админке</a>"

    message = f"""🛒 <b>НОВЫЙ ЗАКАЗ #{order.id}</b>

👤 <b>Клиент:</b> {order.get_full_name()}
📱 <b>Телефон:</b> {order.phone}{client_tg}

📦 <b>Доставка:</b> {order.delivery_method}{delivery_status_suffix}
{address}

━━━━━━━━━━━━━━━━━━━━
📋 <b>ТОВАРЫ:</b>

{items_text}
━━━━━━━━━━━━━━━━━━━━
💰 <b>Сумма:</b> {order.subtotal:,.0f} ₽
{discount_text}💵 <b>К оплате:</b> {order.final_total:,.0f} ₽{admin_url}"""

    return message


def send_telegram_message(chat_id, text, parse_mode="HTML"):
    """
    Отправляет сообщение через Telegram Bot API.
    
    :param chat_id: ID чата получателя
    :param text: Текст сообщения
    :param parse_mode: Режим парсинга (HTML или Markdown)
    :return: True если успешно, False если ошибка
    """
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN не настроен. Уведомление не отправлено.")
        return False
    
    url = TELEGRAM_API_URL.format(token=token)
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 200:
            logger.info(f"Telegram уведомление успешно отправлено в чат {chat_id}")
            return True
        else:
            logger.error(f"Ошибка Telegram API: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        logger.error(f"Таймаут при отправке в Telegram (chat_id={chat_id})")
        return False
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка при отправке в Telegram: {e}")
        return False


def send_order_notification(order):
    """
    Главная функция: отправляет уведомление о новом заказе менеджеру.
    
    Эта функция НЕ выбрасывает исключения - все ошибки логируются,
    чтобы не влиять на процесс создания заказа.
    
    :param order: Объект Order
    :return: True если отправлено успешно, False если ошибка или не настроено
    """
    try:
        shop_settings = get_shop_settings()
        
        if not shop_settings:
            logger.warning("ShopSettings не найдены. Уведомление не отправлено.")
            return False
        
        chat_id = shop_settings.manager_telegram_chat_id
        
        if not chat_id:
            logger.warning("manager_telegram_chat_id не указан. Уведомление не отправлено.")
            return False
        
        message = format_order_message(order)
        return send_telegram_message(chat_id, message)
        
    except Exception as e:
        logger.error(f"Неожиданная ошибка при отправке уведомления о заказе #{order.id}: {e}")
        return False
