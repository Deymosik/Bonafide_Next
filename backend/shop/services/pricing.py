from decimal import Decimal
from typing import List, Optional, Dict, Any, Union
from dataclasses import dataclass
from django.db.models import Prefetch
from shop.models import Product, DiscountRule, Category, CartItem

@dataclass
class PricingItem:
    """
    Универсальное представление товара для расчета цены.
    Изолирует логику от конкретных моделей Django (CartItem/OrderItem/FakeItem).
    """
    id: Optional[int]  # ID записи в корзине (если есть)
    product: Product
    quantity: int

    @property
    def price(self) -> Decimal:
        return self.product.current_price

    @property
    def subtotal(self) -> Decimal:
        return self.price * self.quantity


@dataclass
class CalculationResult:
    """Результат расчета корзины."""
    items: List[Dict[str, Any]]  # Список товаров с ценами (original/discounted)
    subtotal: Decimal
    discount_amount: Decimal
    final_total: Decimal
    applied_rule: Optional[str]
    upsell_hint: Optional[str]


class CartPricingService:
    """
    Сервис для расчета стоимости корзины, скидок и подсказок (Upsell).
    Реализует паттерн 'Strategy' для разных типов скидок через диспетчеризацию методов.
    """

    def calculate(self, items: List[Union[CartItem, Any]]) -> Dict[str, Any]:
        """
        Главный метод входа.
        Принимает список объектов (CartItem или Mock Objects), возвращает словарь для API.
        """
        if not items:
            return self._empty_result()

        # 1. Нормализация входных данных
        pricing_items = self._normalize_items(items)

        # 2. Сбор статистики (промежуточные агрегаты)
        stats = self._gather_stats(pricing_items)

        # 3. Загрузка правил (кеширование можно добавить здесь)
        active_rules = self._get_active_rules()

        # 4. Поиск лучшей скидки
        best_rule, discount_amount = self._find_best_rule(pricing_items, stats, active_rules)

        # 5. Применение цен к товарам (Finalize items)
        final_items = self._apply_pricing_to_items(pricing_items, best_rule)

        # 6. Генерация подсказки (Upsell)
        upsell_hint = self._generate_upsell_hint(stats, active_rules, best_rule)

        # 7. Финальные цифры
        final_total = stats['subtotal'] - discount_amount

        return {
            'items': final_items,
            'subtotal': stats['subtotal'].quantize(Decimal("0.01")),
            'discount_amount': discount_amount.quantize(Decimal("0.01")),
            'final_total': final_total.quantize(Decimal("0.01")),
            'applied_rule': best_rule.name if best_rule else None,
            'upsell_hint': upsell_hint,
        }

    def _normalize_items(self, raw_items: List[Any]) -> List[PricingItem]:
        """Превращает входные данные (QuerySet или список) в список PricingItem."""
        normalized = []
        for item in raw_items:
            # Поддержка как объекта CartItem, так и словаря или Mock-объекта
            product = getattr(item, 'product', None)
            quantity = getattr(item, 'quantity', 0)
            item_id = getattr(item, 'id', None)
            
            if product and quantity > 0:
                normalized.append(PricingItem(id=item_id, product=product, quantity=quantity))
        return normalized

    def _empty_result(self) -> Dict[str, Any]:
        return {
            'items': [],
            'subtotal': Decimal('0.00'),
            'discount_amount': Decimal('0.00'),
            'final_total': Decimal('0.00'),
            'applied_rule': None,
            'upsell_hint': None
        }

    def _gather_stats(self, items: List[PricingItem]) -> Dict[str, Any]:
        """Собирает агрегированные данные для быстрого расчета правил."""
        subtotal = Decimal('0')
        total_quantity = 0
        product_quantities = {}
        category_quantities = {}

        for item in items:
            subtotal += item.subtotal
            total_quantity += item.quantity
            
            # Product Stats
            pid = item.product.id
            product_quantities[pid] = product_quantities.get(pid, 0) + item.quantity

            # Category Stats (Recursive)
            current_category = item.product.category
            while current_category:
                cid = current_category.id
                category_quantities[cid] = category_quantities.get(cid, 0) + item.quantity
                current_category = current_category.parent

        return {
            'subtotal': subtotal,
            'total_quantity': total_quantity,
            'product_quantities': product_quantities,
            'category_quantities': category_quantities
        }

    def _get_active_rules(self):
        """Получает активные правила из БД (можно добавить кеширование)."""
        return DiscountRule.objects.filter(is_active=True).select_related('product_target', 'category_target')

    def _find_best_rule(self, items: List[PricingItem], stats: Dict, rules) -> tuple[Optional[DiscountRule], Decimal]:
        """Перебирает все правила и находит самое выгодное для клиента."""
        best_rule = None
        best_discount_amount = Decimal('0')

        for rule in rules:
            current_discount = Decimal('0')
            
            # Диспетчеризация по типу правила
            if rule.discount_type == DiscountRule.DiscountType.TOTAL_QUANTITY:
                current_discount = self._calculate_total_qty_discount(stats, rule)
            elif rule.discount_type == DiscountRule.DiscountType.PRODUCT_QUANTITY:
                current_discount = self._calculate_product_qty_discount(items, stats, rule)
            elif rule.discount_type == DiscountRule.DiscountType.CATEGORY_QUANTITY:
                current_discount = self._calculate_category_qty_discount(items, stats, rule)

            if current_discount > best_discount_amount:
                best_discount_amount = current_discount
                best_rule = rule

        return best_rule, best_discount_amount

    # --- СТРАТЕГИИ РАСЧЕТА (STRATEGIES) ---

    def _calculate_total_qty_discount(self, stats: Dict, rule: DiscountRule) -> Decimal:
        """Скидка на общее количество товаров."""
        if stats['total_quantity'] >= rule.min_quantity:
            return stats['subtotal'] * (rule.discount_percentage / Decimal('100'))
        return Decimal('0')

    def _calculate_product_qty_discount(self, items: List[PricingItem], stats: Dict, rule: DiscountRule) -> Decimal:
        """Скидка при покупке N штук конкретного товара."""
        target_id = rule.product_target_id
        if not target_id:
            return Decimal('0')
            
        qty = stats['product_quantities'].get(target_id, 0)
        
        if qty >= rule.min_quantity:
            # Считаем сумму только этих товаров
            target_subtotal = sum(item.subtotal for item in items if item.product.id == target_id)
            return target_subtotal * (rule.discount_percentage / Decimal('100'))
        return Decimal('0')

    def _calculate_category_qty_discount(self, items: List[PricingItem], stats: Dict, rule: DiscountRule) -> Decimal:
        """Скидка при покупке N штук товаров из категории."""
        target_id = rule.category_target_id
        if not target_id:
            return Decimal('0')
            
        qty = stats['category_quantities'].get(target_id, 0)
        
        if qty >= rule.min_quantity:
            # Сумма товаров, входящих в эту категорию (или подкатегории)
            target_subtotal = Decimal('0')
            for item in items:
                if self._is_product_in_category(item.product, target_id):
                    target_subtotal += item.subtotal
            
            return target_subtotal * (rule.discount_percentage / Decimal('100'))
        return Decimal('0')

    # --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---

    def _is_product_in_category(self, product: Product, category_id: int) -> bool:
        """Рекурсивная проверка принадлежности товара к категории."""
        current = product.category
        while current:
            if current.id == category_id:
                return True
            current = current.parent
        return False

    def _apply_pricing_to_items(self, items: List[PricingItem], rule: Optional[DiscountRule]) -> List[Dict]:
        """
        Формирует список товаров для ответа frontend-у.
        Рассчитывает 'discounted_price' для каждого товара, если правило к нему применимо.
        """
        result_items = []
        for item in items:
            product = item.product
            original_price = item.price
            discounted_price = None

            is_applicable = False
            
            if rule:
                if rule.discount_type == DiscountRule.DiscountType.TOTAL_QUANTITY:
                    is_applicable = True
                elif rule.discount_type == DiscountRule.DiscountType.PRODUCT_QUANTITY:
                    if rule.product_target_id == product.id:
                        is_applicable = True
                elif rule.discount_type == DiscountRule.DiscountType.CATEGORY_QUANTITY:
                    if self._is_product_in_category(product, rule.category_target_id):
                        is_applicable = True

            if is_applicable:
                # Рассчитываем цену со скидкой
                multiplier = (Decimal('100') - rule.discount_percentage) / Decimal('100')
                discounted_price = original_price * multiplier
                # Округляем до копеек
                discounted_price = discounted_price.quantize(Decimal("0.01"))

            result_items.append({
                'id': item.id,
                'product': product,
                'quantity': item.quantity,
                'original_price': original_price,
                'discounted_price': discounted_price
            })
        return result_items

    def _generate_upsell_hint(self, stats: Dict, rules, applied_rule: Optional[DiscountRule]) -> Optional[str]:
        """
        Генерирует подсказку "Купи ещё X, получи скидку Y".
        Работает, если скидка ЕЩЕ НЕ применена.
        """
        if applied_rule:
             return None # Скидка уже есть, не жадничаем (или можно предлагать следующую ступень, но в ТЗ этого нет)

        best_hint = None
        min_needed = float('inf')

        for rule in rules:
            needed = 0
            current_hint = ""

            if rule.discount_type == DiscountRule.DiscountType.TOTAL_QUANTITY:
                needed = rule.min_quantity - stats['total_quantity']
                if needed > 0:
                    current_hint = f"Добавьте еще {needed} шт. любого товара, чтобы получить скидку {rule.discount_percentage}%!"

            elif rule.discount_type == DiscountRule.DiscountType.PRODUCT_QUANTITY and rule.product_target:
                current_qty = stats['product_quantities'].get(rule.product_target_id, 0)
                needed = rule.min_quantity - current_qty
                if needed > 0:
                     current_hint = f"Добавьте еще {needed} шт. товара «{rule.product_target.name}», чтобы получить скидку {rule.discount_percentage}%!"

            elif rule.discount_type == DiscountRule.DiscountType.CATEGORY_QUANTITY and rule.category_target:
                current_qty = stats['category_quantities'].get(rule.category_target_id, 0)
                needed = rule.min_quantity - current_qty
                if needed > 0:
                    current_hint = f"Добавьте еще {needed} шт. из категории «{rule.category_target.name}», чтобы получить скидку {rule.discount_percentage}%!"

            # Выбираем подсказку, которую легче всего выполнить (меньше докупать)
            if current_hint and needed < min_needed:
                min_needed = needed
                best_hint = current_hint

        return best_hint
