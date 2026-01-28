from .models import Order

def order_badge_callback(request):
    """
    Возвращает количество новых заказов для отображения бэйджа в меню админки.
    """
    return Order.objects.filter(status=Order.OrderStatus.NEW).count()
