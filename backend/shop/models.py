# backend/shop/models.py
import os
from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.utils import timezone
from tinymce.models import HTMLField
from django.db.models import Case, When, F, DecimalField
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFit
from colorfield.fields import ColorField
from django.contrib.auth.models import User
from pytils.translit import slugify
from django.utils.html import strip_tags
import math # Импортируем math для округления

# --- Модель InfoPanel (без изменений) ---
class InfoPanel(models.Model):
    name = models.CharField("Название", max_length=50)
    color = ColorField("Цвет фона", default="#444444")
    # Заменяем CharField на ColorField
    text_color = ColorField("Цвет текста", default="#FFFFFF")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Информационная панелька"
        verbose_name_plural = "Информационные панельки"


# --- Модель Category (без изменений) ---
class Category(models.Model):
    name = models.CharField("Название категории", max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories', verbose_name="Родительская категория")

    def __str__(self):
        full_path = [self.name]
        k = self.parent
        while k is not None:
            full_path.append(k.name)
            k = k.parent
        return ' -> '.join(full_path[::-1])

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"

# --- Модель ColorGroup (без изменений) ---
class ColorGroup(models.Model):
    name = models.CharField("Название группы (например, 'Чехол для iPhone 15 Pro')", max_length=200, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Группа цветов"
        verbose_name_plural = "Группы цветов"



class FeatureDefinition(models.Model):
    """
    Справочник особенностей (маркетинговых фишек).
    Например: 'FaceID', 'NFC', 'Беспроводная зарядка'.
    Содержит иконку и базовое описание.
    """
    name = models.CharField("Название особенности", max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    icon = models.FileField(
        "Иконка (SVG/PNG)", 
        upload_to='features/icons/', 
        null=True, 
        blank=True,
        help_text="Рекомендуется SVG для лучшего качества."
    )
    description = models.TextField("Описание (для подсказок)", blank=True)

    class Meta:
        verbose_name = "Справочник особенностей"
        verbose_name_plural = "Справочник особенностей"
        ordering = ['name']

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Feature(models.Model):
    """
    Привязка особенности к товару.
    Можно переопределить название (например 'Быстрая зарядка' -> 'Быстрая зарядка 68 Вт').
    """
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='features')
    
    # Ссылка на справочник (пока nullable, чтобы миграция прошла, потом заполним данными)
    feature_definition = models.ForeignKey(
        FeatureDefinition, 
        on_delete=models.CASCADE, 
        related_name='product_links',
        verbose_name="Особенность из справочника",
        null=True,
        blank=True
    )
    
    name = models.CharField(
        "Переопределение названия", 
        max_length=200, 
        blank=True, 
        help_text="Оставьте пустым, чтобы использовать название из справочника. ИЛИ напишите свое уточнение (напр. 'Быстрая зарядка 65W')"
    )
    
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Особенность (функционал)"
        verbose_name_plural = "Особенности (функционал)"
        ordering = ['order']

    def __str__(self):
        # Если есть переопределение - показываем его, иначе из справочника
        if self.name:
            return self.name
        if self.feature_definition:
            return self.feature_definition.name
        return "Неизвестная особенность"


class CharacteristicSection(models.Model):
    """Категория (Раздел) для группировки характеристик (например, 'Основные', 'Габариты')."""
    name = models.CharField("Название раздела", max_length=100, unique=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Раздел характеристик"
        verbose_name_plural = "Разделы характеристик"
        ordering = ['order']

    def __str__(self):
        return self.name

class Characteristic(models.Model):
    """Справочник всех возможных названий характеристик (Вес, Цвет, Материал)."""
    name = models.CharField("Название характеристики", max_length=100, unique=True)
    section = models.ForeignKey(CharacteristicSection, on_delete=models.CASCADE, related_name='characteristics', verbose_name="Раздел")

    class Meta:
        verbose_name = "Характеристика (справочник)"
        verbose_name_plural = "Характеристики (справочник)"
        ordering = ['section__order', 'name']

    def __str__(self):
        return f"{self.section.name} - {self.name}"

class ProductCharacteristic(models.Model):
    """Связь конкретного товара с характеристикой и ее значением."""
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='characteristics')
    characteristic = models.ForeignKey(Characteristic, on_delete=models.CASCADE, verbose_name="Характеристика")
    value = models.CharField("Значение", max_length=255)

    class Meta:
        verbose_name = "Характеристика товара"
        verbose_name_plural = "Характеристики товара"
        ordering = ['characteristic']
        unique_together = ('product', 'characteristic') # Одна характеристика на один товар

    def __str__(self):
        return f"{self.product.name}: {self.characteristic.name} = {self.value}"


# --- НОВАЯ МОДЕЛЬ (Refactoring) ---
class CharacteristicGroup(models.Model):
    """
    Шаблон характеристик (например, 'Смартфоны', 'Ноутбуки').
    Позволяет группировать характеристики для удобного заполнения в админке.
    """
    name = models.CharField("Название группы", max_length=100)
    characteristics = models.ManyToManyField(Characteristic, related_name='groups', verbose_name="Характеристики в группе")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Шаблон характеристик"
        verbose_name_plural = "Шаблоны характеристик"



# --- Модель Product (С КЛЮЧЕВЫМИ ИЗМЕНЕНИЯМИ) ---
class Product(models.Model):
    class AvailabilityStatus(models.TextChoices):
        IN_STOCK = 'IN_STOCK', 'В наличии'
        OUT_OF_STOCK = 'OUT_OF_STOCK', 'Нет в наличии'
        PRE_ORDER = 'PRE_ORDER', 'Предзаказ'
        DISCONTINUED = 'DISCONTINUED', 'Снят с производства'
        ON_DEMAND = 'ON_DEMAND', 'Под заказ'

    name = models.CharField("Название товара", max_length=200)

    slug = models.SlugField(
        "URL-slug",
        max_length=255,
        unique=True,
        blank=True,
        db_index=True,
        help_text="Уникальная ссылка. Оставьте пустым для автогенерации из названия."
    )

    # 1. ИЗМЕНЕНИЕ: Поле SKU
    sku = models.CharField(
        "Артикул (SKU)",
        max_length=20,
        unique=True,
        blank=True,
        null=True, # Разрешаем null для уже существующих товаров, чтобы не сломать миграцию
        db_index=True, # Индекс для быстрого поиска
        help_text="Оставьте пустым для автоматической генерации."
    )

    regular_price = models.DecimalField("Обычная цена", max_digits=10, decimal_places=2)

    # --- Поля для "Товара дня" ---
    deal_price = models.DecimalField(
        "Акционная цена ('Товар дня')",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Укажите цену, которая будет действовать во время акции 'Товар дня'. Оставьте пустым, если скидки нет."
    )

    deal_ends_at = models.DateTimeField(
        "Акция 'Товар дня' действует до",
        null=True,
        blank=True,
        help_text="Укажите дату и время окончания акции. После этого товар перестанет быть 'Товаром дня'."
    )
    description = HTMLField("Описание")

    # --- Управление наличием (Stock) ---
    availability_status = models.CharField(
        "Статус наличия",
        max_length=20,
        choices=AvailabilityStatus.choices,
        default=AvailabilityStatus.IN_STOCK,
        help_text="Управляет логикой отображения кнопки покупки и бейджей."
    )
    
    stock_quantity = models.PositiveIntegerField(
        "Количество на складе",
        default=0,
        help_text="Реальное количество товара. Если 0 и статус 'В наличии', товар все равно может быть куплен (зависит от галочки 'Разрешить предзаказ при 0')."
    )

    allow_backorder = models.BooleanField(
        "Разрешить покупку при 0 кол-ве",
        default=False,
        help_text="Если включено, клиенты смогут купить товар, даже если на складе 0 (Backorder)."
    )
    
    restock_date = models.DateField(
        "Ожидаемая дата поступления",
        null=True,
        blank=True,
        help_text="Для товаров со статусом 'Предзаказ' или 'Под заказ'. Будет показана клиенту."
    )
    
    low_stock_threshold = models.PositiveIntegerField(
        "Порог 'Мало на складе'",
        default=3,
        help_text="Если количество меньше или равно этому числу (и больше 0), клиент увидит предупреждение 'Осталось мало!'."
    )
    # ------------------------------------

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products", verbose_name="Категория")
    # Новое поле для рефакторинга
    characteristic_group = models.ForeignKey(CharacteristicGroup, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Шаблон характеристик")
    
    info_panels = models.ManyToManyField(InfoPanel, blank=True, verbose_name="Информационные панельки")
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    main_image = models.ImageField("Главное фото (оригинал)", upload_to='products/main/original/')
    main_image_thumbnail = ImageSpecField(source='main_image',
                                          processors=[ResizeToFit(width=600)],
                                          format='WEBP',
                                          options={'quality': 85})
    audio_sample = models.FileField("Пример аудио (MP3, WAV)", upload_to='products/audio/', null=True, blank=True)

    related_products = models.ManyToManyField('self', blank=True, symmetrical=False, verbose_name="Сопутствующие товары")
    color_group = models.ForeignKey(ColorGroup, on_delete=models.SET_NULL, related_name='products', null=True, blank=True, verbose_name="Группа цветов")

    @property
    def is_deal_of_the_day(self):
        """
        Вычисляет, является ли товар 'Товаром дня' в данный момент.
        Возвращает True, если есть акционная цена и срок акции не истек.
        """
        return (
            self.deal_price is not None and
            self.deal_ends_at and
            self.deal_ends_at > timezone.now()
        )

    @property
    def current_price(self):
        """
        Возвращает актуальную цену товара.
        """
        if self.is_deal_of_the_day:
            return self.deal_price
        return self.regular_price

    @property
    def can_be_purchased(self):
        """
        Может ли товар быть добавлен в корзину?
        """
        # Если явно снят с продажи или под заказ (через менеджера)
        if self.availability_status in [self.AvailabilityStatus.DISCONTINUED, self.AvailabilityStatus.ON_DEMAND]:
            return False
            
        # Если статус "В наличии"
        if self.availability_status == self.AvailabilityStatus.IN_STOCK:
            # Можно купить если есть на складе ИЛИ разрешен backorder
            return self.stock_quantity > 0 or self.allow_backorder
            
        # Если предзаказ - всегда можно оформить (обычно)
        if self.availability_status == self.AvailabilityStatus.PRE_ORDER:
            return True
            
        # Если "Нет в наличии" - очевидно нет
        if self.availability_status == self.AvailabilityStatus.OUT_OF_STOCK:
            return False
            
        return False

    def __str__(self):
        return f"{self.name} ({self.sku})" if self.sku else self.name

    # 2. ИЗМЕНЕНИЕ: Метод save для автогенерации SKU на основе ID
    def save(self, *args, **kwargs):
        # Логика генерации Slug
        if not self.slug:
            # Используем pytils для перевода 'Привет мир' в 'privet-mir'
            self.slug = slugify(self.name)

            # Проверка на уникальность (если slug уже занят другим товаром)
            original_slug = self.slug
            counter = 1
            while Product.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1

        # Сохраняем объект один раз, чтобы получить ID (если это создание)
        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Логика генерации SKU на основе полученного ID (если SKU не задан вручную)
        if is_new and not self.sku:
            self.sku = f"BF-{self.pk:04d}"
            # Используем update_fields для производительности, чтобы не вызывать повторно полный save()
            Product.objects.filter(pk=self.pk).update(sku=self.sku)

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ['-created_at']
        indexes = [
            GinIndex(
                fields=['name'],
                name='product_name_trgm_idx',
                opclasses=['gin_trgm_ops']
            ),
        ]

    @classmethod
    def annotate_with_price(cls, queryset):
        """
        Аннотирует queryset новым полем 'price', которое содержит
        актуальную цену (акционную или обычную).
        """
        now = timezone.now()

        # Условие, при котором акция "Товар дня" активна
        deal_active_condition = models.Q(
            deal_price__isnull=False,
            deal_ends_at__gt=now
        )

        # Создаем "виртуальное" поле 'price'
        # Если акция активна -> берем deal_price
        # Иначе -> берем regular_price
        price_annotation = Case(
            When(deal_active_condition, then=F('deal_price')),
            default=F('regular_price'),
            output_field=DecimalField()
        )

        return queryset.annotate(price=price_annotation)

# --- Модель ProductImage (без изменений) ---
class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images', verbose_name="Товар")
    image = models.ImageField("Фото (оригинал)", upload_to='products/additional/original/')
    image_thumbnail = ImageSpecField(source='image',
                                     processors=[ResizeToFit(width=800, height=800)],
                                     format='WEBP',
                                     options={'quality': 85})

    def __str__(self):
        return f"Фото для {self.product.name}"

    class Meta:
        verbose_name = "Дополнительное фото"
        verbose_name_plural = "Дополнительные фото"

# --- Модель PromoBanner (без изменений) ---
class PromoBanner(models.Model):
    title = models.CharField("Название (для админа)", max_length=100)
    image = models.ImageField("Изображение (оригинал)", upload_to='banners/original/')
    image_thumbnail = ImageSpecField(source='image',
                                     processors=[ResizeToFit(width=280)],
                                     format='WEBP',
                                     options={'quality': 80})

    link_url = models.URLField("URL-ссылка (куда ведет баннер)", blank=True, null=True)
    text_content = models.CharField("Текст на баннере", max_length=150, blank=True, help_text="Оставьте пустым, если текст не нужен")
    text_color = models.CharField("Цвет текста (HEX)", max_length=7, default="#FFFFFF", help_text="Например, #FFFFFF для белого")
    order = models.IntegerField("Порядок сортировки", default=0, help_text="Чем меньше число, тем левее будет баннер")
    is_active = models.BooleanField("Активен (виден клиенту)", default=True)

    class Meta:
        verbose_name = "Промо-баннер (сторис)"
        verbose_name_plural = "Промо-баннеры (сторис)"
        ordering = ['order']

    def __str__(self):
        return self.title

# --- Модель ProductInfoCard (без изменений) ---
class ProductInfoCard(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='info_cards', verbose_name="Товар")
    title = models.CharField("Заголовок (под фото)", max_length=100)
    image = models.ImageField("Фото для карточки (оригинал)", upload_to='products/info_cards/original/')
    image_thumbnail = ImageSpecField(source='image',
                                     processors=[ResizeToFit(width=240)],
                                     format='WEBP',
                                     options={'quality': 80})

    link_url = models.URLField("URL для перехода по клику")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Инфо-карточка (фича)"
        verbose_name_plural = "Инфо-карточки (фичи)"

# --- Модель DiscountRule (без изменений) ---
class DiscountRule(models.Model):
    class DiscountType(models.TextChoices):
        TOTAL_QUANTITY = 'TOTAL_QTY', 'На общее количество товаров в корзине'
        PRODUCT_QUANTITY = 'PRODUCT_QTY', 'На количество конкретного товара'
        CATEGORY_QUANTITY = 'CATEGORY_QTY', 'На количество товаров из конкретной категории'
    name = models.CharField("Название правила (для админа)", max_length=255)
    discount_type = models.CharField("Тип скидки", max_length=20, choices=DiscountType.choices, default=DiscountType.TOTAL_QUANTITY)
    min_quantity = models.PositiveIntegerField("Минимальное количество для активации", default=2)
    discount_percentage = models.DecimalField("Процент скидки", max_digits=5, decimal_places=2, help_text="Например, 10.5 для 10.5%")
    product_target = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Целевой товар")
    category_target = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Целевая категория")
    is_active = models.BooleanField("Правило активно", default=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Правило скидки"
        verbose_name_plural = "Правила скидок"
        ordering = ['-discount_percentage']

# --- Модель ShopSettings (без изменений) ---
class ShopSettings(models.Model):

    manager_username = models.CharField("Юзернейм менеджера в Telegram", max_length=100, help_text="Без @", default="username")
    
    # --- Новые поля для White-Label ---
    telegram_channel_url = models.URLField("Ссылка на Telegram канал/бот", blank=True, help_text="Например: https://t.me/your_shop")
    
    # --- Поле для уведомлений о заказах ---
    manager_telegram_chat_id = models.BigIntegerField(
        "Telegram Chat ID менеджера",
        null=True, blank=True,
        help_text="Для получения ID: отправьте /start боту, затем узнайте свой ID через @userinfobot. Сюда будут приходить уведомления о заказах."
    )
    
    logo = models.ImageField("Логотип магазина", upload_to='settings/', blank=True, null=True, help_text="Используется в Schema.org")
    og_default_image = models.ImageField("OG Image по умолчанию", upload_to='settings/', blank=True, null=True, help_text="Картинка для соцсетей, если страница не имеет своей")
    
    about_us_section = HTMLField("Блок 'О нас'", blank=True, help_text="Краткий рассказ о магазине")
    delivery_section = HTMLField("Блок 'Условия доставки'", blank=True)
    warranty_section = HTMLField("Блок 'Гарантия и возврат'", blank=True)
    free_shipping_threshold = models.DecimalField("Порог бесплатной доставки", max_digits=10, decimal_places=2, null=True, blank=True, help_text="Оставьте пустым или 0, чтобы отключить эту функцию")
    search_placeholder = models.CharField("Плейсхолдер в строке поиска", max_length=150, default="Найти чехол или наушники...")


    # --- НОВОЕ ПОЛЕ ДЛЯ АНИМАЦИИ В КОРЗИНЕ ---
    cart_lottie_file = models.FileField(
        "Файл Lottie-анимации (.json) для Корзины",
        upload_to='lottie/',
        blank=True,
        null=True,
        help_text="Отображается в пустой корзине"
    )

    # --- НОВОЕ ПОЛЕ ДЛЯ АНИМАЦИИ УСПЕХА ---
    order_success_lottie_file = models.FileField(
        "Файл Lottie-анимации (.json) для Страницы Успеха",
        upload_to='lottie/',
        blank=True,
        null=True,
        help_text="Отображается после оформления заказа (галочка/салют)"
    )

    article_font_family = models.CharField("Название шрифта для статей", max_length=100, default="Exo 2",help_text="Например: 'Roboto', 'Times New Roman', 'Exo 2'")

    # --- Настройки Авто-Бана (Anti-DDoS) ---
    auto_ban_enabled = models.BooleanField("Включить Авто-Бан", default=True, help_text="Блокировать ли пользователей автоматически при частых атаках (429 ошибок)")
    auto_ban_threshold = models.PositiveIntegerField("Порог блокировки (кол-во нарушений)", default=15, help_text="Сколько раз нужно получить '429 Too Many Requests', чтобы попасть в Черный список")
    auto_ban_hours = models.PositiveIntegerField("Период учета нарушений (часов)", default=1, help_text="За какое время считать нарушения (например, 15 нарушений за 1 час)")

    # --- 1. ИЗМЕНЕНИЕ: Добавляем блок SEO-полей ---
    site_name = models.CharField("Название сайта (для SEO)", max_length=50, default="BonaFide55", help_text="Используется в шаблонах мета-тегов как переменная {{site_name}}")

    # SEO - Главная страница
    seo_title_home = models.CharField("SEO Title для Главной", max_length=255, blank=True, default="{{site_name}} | Главная")
    seo_description_home = models.TextField("SEO Description для Главной", blank=True, default="Лучшие гаджеты и аксессуары в {{site_name}}.")

    # SEO - Страница Блога
    seo_title_blog = models.CharField("SEO Title для Блога", max_length=255, blank=True, default="Блог | {{site_name}}")
    seo_description_blog = models.TextField("SEO Description для Блога", blank=True, default="Интересные статьи, обзоры и новости от {{site_name}}.")

    # SEO - Страница Товара (шаблон)
    seo_title_product = models.CharField("SEO Title для Товара", max_length=255, blank=True, default="Купить {{product_name}} | {{site_name}}", help_text="Доступные переменные: {{product_name}}, {{product_price}}, {{site_name}}")
    seo_description_product = models.TextField("SEO Description для Товара", blank=True, default="Закажите {{product_name}} с доставкой. Лучшая цена: {{product_price}} ₽.", help_text="Доступные переменные: {{product_name}}, {{product_price}}, {{site_name}}")

    # SEO - Корзина
    seo_title_cart = models.CharField("SEO Title для Корзины", max_length=255, blank=True, default="Ваша корзина | {{site_name}}")
    seo_description_cart = models.TextField("SEO Description для Корзины", blank=True, default="Оформите заказ на выбранные товары в {{site_name}}.")

    # SEO - Инфо (FAQ)
    seo_title_faq = models.CharField("SEO Title для Инфо/FAQ", max_length=255, blank=True, default="Информация и FAQ | {{site_name}}")
    seo_description_faq = models.TextField("SEO Description для Инфо/FAQ", blank=True, default="Ответы на частые вопросы, информация о доставке и гарантии от {{site_name}}.")

    # SEO - Оформление заказа
    seo_title_checkout = models.CharField("SEO Title для Оформления заказа", max_length=255, blank=True, default="Оформление заказа | {{site_name}}")
    seo_description_checkout = models.TextField("SEO Description для Оформления заказа", blank=True, default="Заполните данные для завершения вашего заказа в {{site_name}}.")


    privacy_policy = HTMLField("Политика конфиденциальности", blank=True)
    public_offer = HTMLField("Публичная оферта", blank=True)

    def __str__(self):
        return "Настройки магазина"
    def save(self, *args, **kwargs):
        self.pk = 1; super(ShopSettings, self).save(*args, **kwargs)
    def delete(self, *args, **kwargs): pass
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1); return obj

    class Meta:
        verbose_name = "Настройки магазина"
        verbose_name_plural = "Настройки магазина"

# --- Модель FaqItem (без изменений) ---
class FaqItem(models.Model):
    question = models.CharField("Вопрос", max_length=255)
    answer = HTMLField("Ответ")
    order = models.PositiveIntegerField("Порядок сортировки", default=0, help_text="Чем меньше число, тем выше будет вопрос")
    is_active = models.BooleanField("Активен", default=True)

    def __str__(self):
        return self.question

    class Meta:
        verbose_name = "Вопрос-Ответ (FAQ)"
        verbose_name_plural = "Вопросы-Ответы (FAQ)"
        ordering = ['order']

# --- Модель ShopImage (без изменений) ---
class ShopImage(models.Model):
    settings = models.ForeignKey(ShopSettings, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField("Изображение (оригинал)", upload_to='shop_images/original/')
    image_thumbnail = ImageSpecField(source='image',
                                     processors=[ResizeToFit(width=800)],
                                     format='WEBP',
                                     options={'quality': 85})

    caption = models.CharField("Подпись (опционально)", max_length=200, blank=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Фотография магазина"
        verbose_name_plural = "Фотографии магазина"
        ordering = ['order']

class Cart(models.Model):
    """
    Модель корзины.
    Может быть привязана к Telegram ID (если пользователь зашел через ТГ)
    ИЛИ к Session Key (для обычного браузера).
    """
    telegram_id = models.BigIntegerField("Telegram ID пользователя", unique=True, null=True, blank=True, db_index=True)
    session_key = models.CharField("Session Key (UUID)", max_length=64, unique=True, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    def __str__(self):
        return f"Корзина пользователя {self.telegram_id}"

    class Meta:
        verbose_name = "Корзина пользователя"
        verbose_name_plural = "Корзины пользователей"

class CartItem(models.Model):
    """Модель товара в корзине."""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items', verbose_name="Корзина")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items', verbose_name="Товар")
    quantity = models.PositiveIntegerField("Количество", default=1)
    added_at = models.DateTimeField("Дата добавления", auto_now_add=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} в корзине {self.cart.telegram_id}"

    class Meta:
        verbose_name = "Товар в корзине"
        verbose_name_plural = "Товары в корзине"
        # Гарантируем, что один и тот же товар не будет добавлен в одну корзину дважды
        unique_together = ('cart', 'product')
        ordering = ['added_at']

class Order(models.Model):
    class DeliveryMethod(models.TextChoices):
        POST = 'Почта России', 'Почта России'
        SDEK = 'СДЭК', 'СДЭК'

    class OrderStatus(models.TextChoices):
        NEW = 'new', 'Новый'
        PROCESSING = 'processing', 'В обработке'
        SHIPPED = 'shipped', 'Отправлен'
        COMPLETED = 'completed', 'Выполнен'
        CANCELED = 'canceled', 'Отменен'

    telegram_id = models.BigIntegerField("Telegram ID пользователя", null=True, blank=True, db_index=True)
    session_key = models.CharField("Session Key", max_length=64, null=True, blank=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    status = models.CharField("Статус заказа", max_length=20, choices=OrderStatus.choices, default=OrderStatus.NEW)

    # Контактные данные
    last_name = models.CharField("Фамилия", max_length=100)
    first_name = models.CharField("Имя", max_length=100)
    patronymic = models.CharField("Отчество", max_length=100, blank=True, default='')
    phone = models.CharField("Номер телефона", max_length=20)

    # --- ОБНОВЛЕННЫЙ БЛОК АДРЕСА ---
    delivery_method = models.CharField("Способ доставки", max_length=50)

    city = models.CharField("Населенный пункт", max_length=100, blank=True)

    # Поля для "Почты России"
    # ИЗМЕНЕНИЕ: Поле 'region' полностью удалено
    district = models.CharField("Район", max_length=150, blank=True)
    street = models.CharField("Улица", max_length=255, blank=True)
    house = models.CharField("Дом", max_length=20, blank=True)
    apartment = models.CharField("Квартира", max_length=20, blank=True)
    postcode = models.CharField("Почтовый индекс", max_length=6, blank=True)

    # Поле для "СДЭК"
    cdek_office_address = models.CharField("Адрес пункта выдачи СДЭК", max_length=255, blank=True)

    # Финансовая информация
    subtotal = models.DecimalField("Сумма (без скидки)", max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField("Размер скидки", max_digits=10, decimal_places=2, default=0)
    final_total = models.DecimalField("Итоговая сумма", max_digits=10, decimal_places=2)
    applied_rule = models.CharField("Примененная скидка", max_length=255, blank=True, null=True)

    def get_full_name(self):
        return f"{self.last_name} {self.first_name} {self.patronymic}".strip()
    get_full_name.short_description = "ФИО клиента"

    def __str__(self):
        return f"Заказ №{self.id} от {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ['-created_at']


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name="Заказ")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Товар")
    quantity = models.PositiveIntegerField("Количество", default=1)
    price_at_purchase = models.DecimalField("Цена на момент покупки", max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} (x{self.quantity})"

    class Meta:
        verbose_name = "Товар в заказе"
        verbose_name_plural = "Товары в заказе"


class ArticleCategory(models.Model):
    """Категории для статей (например, Обзоры, Новости)."""
    name = models.CharField("Название категории", max_length=100, unique=True)
    slug = models.SlugField("URL-slug", unique=True, help_text="Используется в URL. Заполнится автоматически.")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Категория статьи"
        verbose_name_plural = "Категории статей"
        ordering = ['name']


class Article(models.Model):
    """Модель для статей или записей в блоге."""
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Черновик'
        PUBLISHED = 'PUBLISHED', 'Опубликовано'

    class ContentType(models.TextChoices):
        INTERNAL = 'INTERNAL', 'Внутренняя статья'
        EXTERNAL = 'EXTERNAL', 'Внешняя ссылка'

    # --- Основное содержимое ---
    title = models.CharField("Заголовок статьи", max_length=200)
    # SEO fields
    meta_description = models.TextField("Meta Description (для SEO)", max_length=160, blank=True, help_text="Краткое описание для Google и Яндекс (до 160 символов). Очень важно для привлечения пользователей.")
    og_image = models.ImageField("Open Graph Image (для соцсетей)", upload_to='articles/og/', blank=True, help_text="Персональная картинка для репостов. Если пусто, используется обложка статьи.")
    canonical_url = models.URLField("Canonical URL", blank=True, help_text="Оставьте пустым, если это оригинальная статья. Заполняйте ТОЛЬКО если это перепечатка (кросспостинг) — укажите здесь ссылку на первоисточник, чтобы избежать санкций поисковиков за дублирующийся контент.")
    slug = models.SlugField("URL-slug", max_length=220, unique=True, blank=True, help_text="Человекопонятный URL. Генерируется из заголовка, но можно отредактировать. Пример: 'kak-vybrat-naushniki'")
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Автор")
    published_at = models.DateTimeField("Дата публикации", default=timezone.now)

    # --- ВОТ ПЕРВОЕ НЕДОСТАЮЩЕЕ ПОЛЕ ---
    cover_image = models.ImageField("Обложка статьи (оригинал)", upload_to='articles/covers/', help_text="Будет отображаться в списке статей и при репосте в соцсети.")

    # Оптимизаторы теперь будут работать, так как есть 'source'
    cover_image_list_thumbnail = ImageSpecField(source='cover_image',
                                                processors=[ResizeToFit(width=600)],
                                                format='WEBP',
                                                options={'quality': 80})
    cover_image_detail_thumbnail = ImageSpecField(source='cover_image',
                                                  processors=[ResizeToFit(width=1200)],
                                                  format='WEBP',
                                                  options={'quality': 85})

    # --- Тип и тело статьи ---
    # --- ВОТ ВТОРОЕ НЕДОСТАЮЩЕЕ ПОЛЕ ---
    content_type = models.CharField("Тип контента", max_length=10, choices=ContentType.choices, default=ContentType.INTERNAL)

    content = HTMLField("Содержимое статьи", blank=True, help_text="Для 'Внутренней статьи'. Изображения до 15 МБ автоматически оптимизируются при загрузке.")
    # ИСПРАВЛЕНИЕ: Убрали дублирующийся verbose_name в конце
    external_url = models.URLField("URL внешней статьи", blank=True, help_text="Для 'Внешней ссылки'. Укажите полный URL, например, https://example.com/article")

    # --- Организация и связи ---
    category = models.ForeignKey(ArticleCategory, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Категория")
    status = models.CharField("Статус", max_length=10, choices=Status.choices, default=Status.DRAFT, help_text="'Черновик' не виден пользователям, 'Опубликовано' - виден всем.")
    is_featured = models.BooleanField("Закрепленная статья", default=False, help_text="Отметьте, чтобы статья отображалась в особых блоках (например, 'Статья дня').")
    related_products = models.ManyToManyField(Product, blank=True, verbose_name="Связанные товары", help_text="Товары, которые будут рекомендоваться в конце статьи.")

    # --- SEO ---
    meta_title = models.CharField("Meta Title (для SEO)", max_length=60, blank=True, help_text="Заголовок для вкладки браузера и поисковиков (до 60 символов). Если пусто, используется основной заголовок.")
    meta_description = models.TextField("Meta Description (для SEO)", max_length=160, blank=True, help_text="Краткое описание для Google и Яндекс (до 160 символов). Очень важно для привлечения пользователей.")
    views_count = models.PositiveIntegerField("Количество просмотров", default=0, editable=False) # editable=False, чтобы его нельзя было изменить вручную в админке

    @property
    def reading_time(self):
        """Вычисляет примерное время на чтение статьи в минутах."""
        if self.content_type == self.ContentType.INTERNAL and self.content:
            # Очищаем HTML-теги, чтобы посчитать только слова
            plain_text = strip_tags(self.content)
            word_count = len(plain_text.split())
            # Средняя скорость чтения взрослого человека ~200 слов в минуту
            time_in_minutes = math.ceil(word_count / 200)
            return time_in_minutes
        return 0 # Для внешних ссылок или пустых статей время чтения 0

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Автоматическое создание slug из title, если slug не задан
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Статья"
        verbose_name_plural = "Статьи"
        ordering = ['-published_at']


# --- НОВАЯ МОДЕЛЬ ДЛЯ БЭКАПОВ ---
class Backup(models.Model):
    # Разрешаем оставлять пустым для авто-заполнения
    name = models.CharField("Название / Комментарий", max_length=255, blank=True)
    file = models.FileField("Файл архива (.zip)", upload_to='backups/', help_text="Содержит базу данных и медиафайлы", null=True, blank=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    size = models.CharField("Размер", max_length=50, blank=True)

    STATUS_CHOICES = (
        ('pending', 'В очереди'),
        ('processing', 'Создается...'),
        ('success', 'Готово'),
        ('failed', 'Ошибка'),
    )
    status = models.CharField("Статус", max_length=20, choices=STATUS_CHOICES, default='success') # Default success for old backups
    log = models.TextField("Лог операций", blank=True)

    def __str__(self):
        # Если есть имя, показываем его, иначе дату
        return self.name or f"Бэкап {self.created_at}"

    def save(self, *args, **kwargs):
        # 1. Автоматически считаем размер файла
        if self.file:
            try:
                size_bytes = self.file.size
                if size_bytes < 1024 * 1024:
                    self.size = f"{size_bytes / 1024:.1f} KB"
                else:
                    self.size = f"{size_bytes / (1024 * 1024):.1f} MB"
            except:
                self.size = "Unknown"

        # 2. Если имя не задано пользователем, берем имя файла
        if not self.name:
            if self.file:
                # Очищаем путь и расширение, чтобы получить красивое имя
                clean_name = self.file.name.split('/')[-1].replace('.zip', '')
                self.name = f"Загружен: {clean_name}"
            else:
                self.name = "Бэкап (без названия)"

        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Резервная копия"
        verbose_name_plural = "Резервные копии"
        ordering = ['-created_at']

# --- SECURITY MODELS ---
# from django.db import models # Already imported at top

class BlacklistedItem(models.Model):
    class ItemType(models.TextChoices):
        IP = 'IP', 'IP адрес'
        TELEGRAM_ID = 'TG', 'Telegram ID'

    item_type = models.CharField("Тип блокировки", max_length=2, choices=ItemType.choices, default=ItemType.IP)
    value = models.CharField("Значение", max_length=255, help_text="IP адрес или Telegram ID")
    reason = models.TextField("Причина блокировки", blank=True)
    created_at = models.DateTimeField("Дата блокировки", auto_now_add=True)
    is_active = models.BooleanField("Активна", default=True)

    class Meta:
        verbose_name = "⛔ Черный список"
        verbose_name_plural = "⛔ Черный список"
        unique_together = ('item_type', 'value')

    def __str__(self):
        return f"[{self.get_item_type_display()}] {self.value}"

class SecurityBlockLog(models.Model):
    ip_address = models.GenericIPAddressField("IP адрес")
    telegram_id = models.CharField("Telegram ID", max_length=100, null=True, blank=True)
    request_path = models.CharField("Путь запроса", max_length=255)
    limit_type = models.CharField("Сработал лимит", max_length=50, help_text="Какой throttle class сработал")
    created_at = models.DateTimeField("Дата инцидента", auto_now_add=True)

    class Meta:
        verbose_name = "🛡 Журнал атак (429)"
        verbose_name_plural = "🛡 Журнал атак (429)"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ip_address} -> {self.request_path} ({self.created_at})"
