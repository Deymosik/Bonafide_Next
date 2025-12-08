# backend/shop/tests.py

from decimal import Decimal
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Category, Product, DiscountRule

class CalculateCartAPITestCase(APITestCase):
    """
    Тесты для API-endpoint'а /api/calculate-cart/.
    """

    @classmethod
    def setUpTestData(cls):
        """Создаем тестовые данные один раз для всего набора тестов."""
        # --- Категории ---
        cls.cat_phones = Category.objects.create(name='Телефоны')
        cls.cat_iphones = Category.objects.create(name='iPhone', parent=cls.cat_phones) # <- Дочерняя категория
        cls.cat_cases = Category.objects.create(name='Чехлы')

        # --- Товары ---
        cls.product_phone = Product.objects.create(
            name='СуперФон 15',
            category=cls.cat_phones,
            regular_price=Decimal('1000.00')
        )
        cls.product_iphone = Product.objects.create( # <- Товар в дочерней категории
            name='iPhone 20 Pro',
            category=cls.cat_iphones,
            regular_price=Decimal('1200.00')
        )
        cls.product_case = Product.objects.create(
            name='Простой Чехол',
            category=cls.cat_cases,
            regular_price=Decimal('500.00')
        )
        cls.product_deal = Product.objects.create(
            name='Товар Дня Наушники',
            category=cls.cat_phones,
            regular_price=Decimal('2000.00'),
            is_deal_of_the_day=True,
            deal_price=Decimal('1500.00'),
            deal_ends_at=timezone.now() + timedelta(days=1)
        )

        # --- Правила скидок ---
        cls.rule_total_qty = DiscountRule.objects.create(
            name='Скидка 10% от 3-х штук',
            discount_type=DiscountRule.DiscountType.TOTAL_QUANTITY,
            min_quantity=3,
            discount_percentage=Decimal('10.00')
        )
        # Скидка на РОДИТЕЛЬСКУЮ категорию "Телефоны"
        cls.rule_category_qty = DiscountRule.objects.create(
            name='Скидка 20% на 2 телефона',
            discount_type=DiscountRule.DiscountType.CATEGORY_QUANTITY,
            min_quantity=2,
            discount_percentage=Decimal('20.00'),
            category_target=cls.cat_phones
        )
        cls.rule_product_qty = DiscountRule.objects.create(
            name='Скидка 50% на 2 товара дня',
            discount_type=DiscountRule.DiscountType.PRODUCT_QUANTITY,
            min_quantity=2,
            discount_percentage=Decimal('50.00'),
            product_target=cls.product_deal
        )
        cls.url = reverse('calculate-cart')

    def test_simple_cart_no_discount(self):
        """Тест: простая корзина без скидок."""
        payload = {'cartItems': [{'id': self.product_phone.id, 'quantity': 1}]}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # ИСПРАВЛЕНО: Сравниваем Decimal с Decimal
        self.assertEqual(response.data['subtotal'], Decimal('1000.00'))
        self.assertEqual(response.data['discount_amount'], Decimal('0.00'))
        self.assertEqual(response.data['final_total'], Decimal('1000.00'))
        self.assertIsNone(response.data['applied_rule'])

    def test_deal_of_the_day_price_is_used(self):
        """Тест: цена 'Товара дня' используется для расчета."""
        payload = {'cartItems': [{'id': self.product_deal.id, 'quantity': 1}]}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # ИСПРАВЛЕНО: Сравниваем Decimal с Decimal
        self.assertEqual(response.data['subtotal'], Decimal('1500.00'))
        self.assertEqual(response.data['final_total'], Decimal('1500.00'))

    def test_total_quantity_discount(self):
        """Тест: применяется скидка на общее количество товаров."""
        payload = {
            'cartItems': [
                {'id': self.product_phone.id, 'quantity': 1},
                {'id': self.product_case.id, 'quantity': 2},
            ]
        }
        subtotal = Decimal('1000.00') + 2 * Decimal('500.00') # 2000.00
        discount = (subtotal * Decimal('0.10')).quantize(Decimal('0.01')) # 200.00
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # ИСПРАВЛЕНО: Сравниваем Decimal с Decimal
        self.assertEqual(response.data['subtotal'], subtotal)
        self.assertEqual(response.data['discount_amount'], discount)
        self.assertEqual(response.data['final_total'], subtotal - discount)
        self.assertEqual(response.data['applied_rule'], self.rule_total_qty.name)

    def test_category_quantity_discount(self):
        """Тест: применяется скидка на количество товаров из категории."""
        payload = {
            'cartItems': [
                {'id': self.product_phone.id, 'quantity': 2},
                {'id': self.product_case.id, 'quantity': 1},
            ]
        }
        subtotal = 2 * Decimal('1000.00') + Decimal('500.00') # 2500.00
        discount = (subtotal * Decimal('0.20')).quantize(Decimal('0.01')) # 500.00
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # ИСПРАВЛЕНО: Сравниваем Decimal с Decimal
        self.assertEqual(response.data['discount_amount'], discount)
        self.assertEqual(response.data['applied_rule'], self.rule_category_qty.name)

    def test_best_discount_is_applied(self):
        """Тест: если подходят 2 правила, применяется самое выгодное (20% > 10%)."""
        payload = {
            'cartItems': [
                {'id': self.product_phone.id, 'quantity': 2},
                {'id': self.product_case.id, 'quantity': 1},
            ]
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['applied_rule'], self.rule_category_qty.name)

    def test_upsell_hint_no_discount(self):
        """Тест: если скидка не применена, должна вернуться подсказка."""
        payload = {'cartItems': [{'id': self.product_case.id, 'quantity': 1}]}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['applied_rule'])
        self.assertIn('Добавьте еще 2 шт.', response.data['upsell_hint'])


    # --- НОВЫЙ ТЕСТ ДЛЯ ПРОВЕРКИ ИЕРАРХИИ КАТЕГОРИЙ ---
    def test_parent_category_discount_is_applied(self):
        """Тест: скидка на родительскую категорию применяется к товару из дочерней."""
        payload = {
            'cartItems': [
                # Добавляем 2 айфона. Они в категории "iPhone", но должны считаться и как "Телефоны"
                {'id': self.product_iphone.id, 'quantity': 2}
            ]
        }
        # Должна сработать скидка 20% на категорию "Телефоны"
        subtotal = 2 * Decimal('1200.00') # 2400.00
        discount = (subtotal * Decimal('0.20')).quantize(Decimal('0.01')) # 480.00

        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['subtotal'], subtotal)
        self.assertEqual(response.data['discount_amount'], discount)
        self.assertEqual(response.data['final_total'], subtotal - discount)
        self.assertEqual(response.data['applied_rule'], self.rule_category_qty.name)