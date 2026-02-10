# backend/shop/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    InfoPanel, Category, Product, ProductImage, PromoBanner,
    ProductInfoCard, ColorGroup, ShopSettings, FaqItem, ShopImage,
    InfoPanel, Category, Product, ProductImage, PromoBanner,
    ProductInfoCard, ColorGroup, ShopSettings, FaqItem, ShopImage,
    Feature, CharacteristicSection, Characteristic,
    ProductCharacteristic, Cart, CartItem, Order, OrderItem, Article, ArticleCategory
)


# --- 1. НОВЫЙ БАЗОВЫЙ КЛАСС ДЛЯ РЕФАКТОРИНГА ---
class ImageUrlBuilderSerializer(serializers.ModelSerializer):
    """
    Базовый сериализатор, который умеет строить абсолютные URL для полей с файлами.
    """
    def _get_absolute_url(self, file_field):
        """Вспомогательный метод для получения полного URL."""
        request = self.context.get('request')
        if request and file_field and hasattr(file_field, 'url'):
            return request.build_absolute_uri(file_field.url)
        return None
class FeatureSerializer(ImageUrlBuilderSerializer):
    icon_url = serializers.SerializerMethodField()
    description = serializers.CharField(source='feature_definition.description', read_only=True)
    
    class Meta:
        model = Feature
        fields = ('name', 'icon_url', 'description')

    def get_icon_url(self, obj):
        # Если связано с определением и у него есть иконка
        if obj.feature_definition and obj.feature_definition.icon:
             return self._get_absolute_url(obj.feature_definition.icon)
        return None

    def to_representation(self, instance):
        """
        Кастомное представление:
        - Имя берем либо из instance.name (если задано), либо из instance.feature_definition.name
        """
        data = super().to_representation(instance)
        
        # Логика "умного" имени
        if instance.name:
            data['name'] = instance.name
        elif instance.feature_definition:
            data['name'] = instance.feature_definition.name
        else:
             data['name'] = "Без названия"

        return data


class ProductCharacteristicSerializer(serializers.ModelSerializer):
    # Получаем строковое представление характеристики (например, "Вес")
    name = serializers.CharField(source='characteristic.name')

    class Meta:
        model = ProductCharacteristic
        fields = ('name', 'value')

class CharacteristicSectionSerializer(serializers.ModelSerializer):
    # Вкладываем все характеристики, относящиеся к этому разделу
    characteristics = ProductCharacteristicSerializer(many=True, read_only=True)

    class Meta:
        model = CharacteristicSection
        fields = ('name', 'characteristics')




# --- Вспомогательные сериализаторы ---

class InfoPanelSerializer(serializers.ModelSerializer):
    class Meta:
        model = InfoPanel
        fields = ('name', 'color', 'text_color')

class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'subcategories')

    def get_subcategories(self, obj):
        serializer = CategorySerializer(obj.subcategories.all(), many=True)
        return serializer.data


# Сериализатор для дополнительных фото товара (в слайдере)
class ProductImageSerializer(ImageUrlBuilderSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ('image_url', 'thumbnail_url')

    def get_image_url(self, obj):
        return self._get_absolute_url(obj.image)

    def get_thumbnail_url(self, obj):
        return self._get_absolute_url(obj.image_thumbnail)

# Сериализатор для инфо-карточек (фич)
class ProductInfoCardSerializer(ImageUrlBuilderSerializer):
    # Используем thumbnail для отображения
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductInfoCard
        fields = ('title', 'image_url', 'link_url')

    def get_image_url(self, obj):
        return self._get_absolute_url(obj.image_thumbnail)

# Сериализатор для промо-баннеров (сторис)
class PromoBannerSerializer(ImageUrlBuilderSerializer):
    # Используем thumbnail
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PromoBanner
        fields = ('id', 'image_url', 'link_url', 'text_content', 'text_color')

    def get_image_url(self, obj):
        return self._get_absolute_url(obj.image_thumbnail)

# Сериализатор для фото магазина на странице FAQ
class ShopImageSerializer(ImageUrlBuilderSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ShopImage
        fields = ('image_url', 'thumbnail_url', 'caption')

    def get_image_url(self, obj):
        return self._get_absolute_url(obj.image)

    def get_thumbnail_url(self, obj):
        return self._get_absolute_url(obj.image_thumbnail)


# --- Основные сериализаторы ---

# Сериализатор для превью в списке товаров
class ProductListSerializer(serializers.ModelSerializer):
    info_panels = InfoPanelSerializer(many=True, read_only=True)
    main_image_thumbnail_url = serializers.SerializerMethodField()

    # ИЗМЕНЕНИЕ 1: 'price' теперь всегда актуальная цена (обычная или акционная)
    # Мы используем свойство current_price, которое создали в модели
    price = serializers.DecimalField(max_digits=10, decimal_places=2, source='current_price', read_only=True)
    
    # --- STOCK FIELDS ---
    availability_status = serializers.CharField(read_only=True)
    availability_status_display = serializers.CharField(source='get_availability_status_display', read_only=True)
    stock_quantity = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Product
        fields = (
            'id',
            'slug',
            'sku',
            'name',
            'price', # Текущая (финальная) цена
            'regular_price', # Обычная цена
            'deal_price', # Акционная цена (если есть)
            'main_image_thumbnail_url',
            'info_panels',
            'availability_status',
            'availability_status_display',
            'stock_quantity'
        )

    def get_main_image_thumbnail_url(self, obj):
        request = self.context.get('request')
        # Проверяем наличие main_image_thumbnail, чтобы избежать ошибок, если у товара нет фото
        if hasattr(obj, 'main_image_thumbnail') and obj.main_image_thumbnail:
            return request.build_absolute_uri(obj.main_image_thumbnail.url)
        return None

# Сериализатор для цветовых вариаций (квадратики)
class ColorVariationSerializer(serializers.ModelSerializer):
    main_image_thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ('id', 'slug', 'main_image_thumbnail_url')

    def get_main_image_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.main_image_thumbnail.url) if hasattr(obj, 'main_image_thumbnail') and obj.main_image_thumbnail else None

# Сериализатор для детальной страницы товара
class ProductDetailSerializer(serializers.ModelSerializer):
    info_panels = InfoPanelSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    info_cards = ProductInfoCardSerializer(many=True, read_only=True)
    related_products = ProductListSerializer(many=True, read_only=True)
    main_image_url = serializers.SerializerMethodField()
    main_image_thumbnail_url = serializers.SerializerMethodField()
    audio_sample = serializers.SerializerMethodField()
    features = FeatureSerializer(many=True, read_only=True)
    grouped_characteristics = serializers.SerializerMethodField()
    color_variations = serializers.SerializerMethodField()

    # ИЗМЕНЕНИЕ 2: 'price' также становится актуальной ценой
    price = serializers.DecimalField(max_digits=10, decimal_places=2, source='current_price', read_only=True)

    # --- STOCK FIELDS ---
    availability_status = serializers.CharField(read_only=True)
    availability_status_display = serializers.CharField(source='get_availability_status_display', read_only=True)
    # stock_quantity уже есть в модели, но мы может захотим его скрыть? Пока отдаем.
    
    can_be_purchased = serializers.BooleanField(read_only=True) # Используем property из модели

    class Meta:
        model = Product
        fields = (
            'id', 'slug', 'sku', 'name', 'description',
            'price', # Актуальная цена для покупки
            'regular_price', # Обычная цена (для зачеркивания)
            'deal_price', # Акционная цена
            'main_image_url', 'main_image_thumbnail_url',
            'images', 'audio_sample', 'info_panels', 'info_cards', 'related_products',
             'color_variations', 'features',
            'grouped_characteristics',
            'related_products', 'color_variations',
            # New Stock Fields
            'availability_status',
            'availability_status_display',
            'stock_quantity',
            'allow_backorder',
            'restock_date',
            'low_stock_threshold',
            'can_be_purchased',
        )

    def get_grouped_characteristics(self, obj):
        # Получаем все характеристики товара, сразу подгружая связанные разделы и названия
        characteristics = obj.characteristics.select_related('characteristic__section').all()

        # Группируем их по разделам
        grouped_data = {}
        for pc in characteristics:
            section_name = pc.characteristic.section.name
            if section_name not in grouped_data:
                grouped_data[section_name] = []
            grouped_data[section_name].append(
                ProductCharacteristicSerializer(pc).data
            )

        # Преобразуем в список для сериализатора
        # [{ 'name': 'Основные', 'characteristics': [...] }, { ... }]
        result = [
            {'name': sec_name, 'characteristics': items}
            for sec_name, items in grouped_data.items()
        ]
        return result

    def get_main_image_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.main_image.url) if obj.main_image else None

    def get_main_image_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.main_image_thumbnail.url) if hasattr(obj, 'main_image_thumbnail') and obj.main_image_thumbnail else None

    def get_audio_sample(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.audio_sample.url) if obj.audio_sample else None

    def get_color_variations(self, obj):
        if not obj.color_group:
            return []
        queryset = Product.objects.filter(color_group=obj.color_group).exclude(id=obj.id)
        return ColorVariationSerializer(queryset, many=True, context={'request': self.context.get('request')}).data

# Сериализатор для глобальных настроек
class ShopSettingsSerializer(serializers.ModelSerializer):
    images = ShopImageSerializer(many=True, read_only=True)

    cart_lottie_url = serializers.SerializerMethodField()
    order_success_lottie_url = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    og_default_image_url = serializers.SerializerMethodField()

    class Meta:
        model = ShopSettings
        fields = (
            'manager_username', 'telegram_channel_url', 'about_us_section',
            'delivery_section', 'warranty_section', 'images', 'free_shipping_threshold',
            'search_placeholder', 'cart_lottie_url', 'order_success_lottie_url', 'article_font_family',
            'public_offer', 'privacy_policy', 'site_name', 'logo_url', 'og_default_image_url',
            'seo_title_home', 'seo_description_home',
            'seo_title_blog', 'seo_description_blog', 'seo_title_product', 'seo_description_product',
            'seo_title_cart', 'seo_description_cart', 'seo_title_faq', 'seo_description_faq',
            'seo_title_checkout', 'seo_description_checkout',
        )



    def get_cart_lottie_url(self, obj):
        request = self.context.get('request')
        if obj.cart_lottie_file and hasattr(obj.cart_lottie_file, 'url'):
            return request.build_absolute_uri(obj.cart_lottie_file.url)
        return None

    def get_order_success_lottie_url(self, obj):
        request = self.context.get('request')
        if obj.order_success_lottie_file and hasattr(obj.order_success_lottie_file, 'url'):
            return request.build_absolute_uri(obj.order_success_lottie_file.url)
        return None

    def get_logo_url(self, obj):
        request = self.context.get('request')
        if obj.logo and hasattr(obj.logo, 'url'):
            return request.build_absolute_uri(obj.logo.url)
        return None

    def get_og_default_image_url(self, obj):
        request = self.context.get('request')
        if obj.og_default_image and hasattr(obj.og_default_image, 'url'):
            return request.build_absolute_uri(obj.og_default_image.url)
        return None

# Сериализатор для FAQ
class FaqItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqItem
        fields = ('id', 'question', 'answer')

class DealOfTheDaySerializer(serializers.ModelSerializer):
    main_image_thumbnail_url = serializers.SerializerMethodField()

    # ИЗМЕНЕНИЕ 3: Поле 'price' теперь явно указывает на 'regular_price',
    # чтобы фронтенд мог показать "старую" цену.
    price = serializers.DecimalField(max_digits=10, decimal_places=2, source='regular_price', read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'slug',
            'name',
            'price', # <- Теперь это regular_price
            'deal_price',
            'main_image_thumbnail_url',
            'deal_ends_at'
        )

    def get_main_image_thumbnail_url(self, obj):
        request = self.context.get('request')
        if hasattr(obj, 'main_image_thumbnail') and obj.main_image_thumbnail:
            return request.build_absolute_uri(obj.main_image_thumbnail.url)
        return None

class CartItemSerializer(serializers.ModelSerializer):
    """Сериализатор для отдельного товара в корзине."""
    # Добавляем вложенный сериализатор, чтобы получить полную информацию о товаре
    product = ProductListSerializer(read_only=True)
    # Поле только для записи, чтобы принимать ID товара от фронтенда
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = CartItem
        fields = ('id', 'product', 'product_id', 'quantity')
        # Делаем quantity доступным и для чтения, и для записи
        read_only_fields = ('id', 'product')


class CartSerializer(serializers.ModelSerializer):
    """Полный сериализатор корзины со всеми товарами."""
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ('id', 'telegram_id', 'session_key', 'items', 'updated_at')
        read_only_fields = ('id', 'telegram_id', 'session_key', 'updated_at')


class DetailedCartItemSerializer(serializers.Serializer):
    """
    Сериализатор для "раскрашенных" товаров из функции расчета.
    Он не привязан к модели, а работает со словарями.
    """
    id = serializers.IntegerField(allow_null=True)
    product = ProductListSerializer()
    quantity = serializers.IntegerField()
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    discounted_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)


class OrderItemSerializer(serializers.ModelSerializer):
    """Сериализатор для товаров ВНУТРИ заказа."""
    product_id = serializers.IntegerField()

    class Meta:
        model = OrderItem
        fields = ('product_id', 'quantity')


class OrderCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для СОЗДАНИЯ заказа."""
    items = OrderItemSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = (
            'first_name', 'last_name', 'patronymic', 'phone',
            'delivery_method',
            'city', 'district', 'street', 'house', 'apartment', 'postcode',
            'cdek_office_address',
            'items'
        )
        extra_kwargs = {
            'city': {'required': False},
            'district': {'required': False},
            'street': {'required': False},
            'house': {'required': False},
            'apartment': {'required': False},
            'postcode': {'required': False},
            'cdek_office_address': {'required': False},
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        calculation_results = self.context.get('calculation_results')

        if not calculation_results:
             raise serializers.ValidationError("Не удалось рассчитать стоимость заказа.")

        # --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
        # Получаем данные идентификации из контекста (переданного во view)
        tg_id = self.context.get('telegram_id')
        session_key = self.context.get('session_key')

        order = Order.objects.create(
            **validated_data,
            telegram_id=tg_id,       # Может быть None, если заказ с сайта
            session_key=session_key, # Сохраняем сессию браузера
            subtotal=calculation_results['subtotal'],
            discount_amount=calculation_results['discount_amount'],
            final_total=calculation_results['final_total'],
            applied_rule=calculation_results['applied_rule']
        )
        # -----------------------

        for item_data in items_data:
            product_info = next(
                (item for item in calculation_results['items'] if item['product'].id == item_data['product_id']),
                None
            )
            if not product_info:
                continue

            OrderItem.objects.create(
                order=order,
                product_id=item_data['product_id'],
                quantity=item_data['quantity'],
                price_at_purchase=product_info['discounted_price'] if product_info['discounted_price'] is not None else product_info['original_price']
            )

        return order

class AuthorSerializer(serializers.ModelSerializer):
    """Сериализатор для краткой информации об авторе."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'full_name')

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username

class ArticleCategorySerializer(serializers.ModelSerializer):
    """Сериализатор для категорий статей."""
    class Meta:
        model = ArticleCategory
        fields = ('name', 'slug')

class ArticleListSerializer(ImageUrlBuilderSerializer):
    """Сериализатор для списка статей (краткая информация)."""
    category = ArticleCategorySerializer(read_only=True)
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ('title', 'slug', 'published_at', 'category', 'cover_image_url', 'is_featured')

    def get_cover_image_url(self, obj):
        return self._get_absolute_url(obj.cover_image_list_thumbnail)

class ArticleDetailSerializer(ImageUrlBuilderSerializer):
    """Сериализатор для детального отображения статьи."""
    category = ArticleCategorySerializer(read_only=True)
    author = AuthorSerializer(read_only=True)
    related_products = ProductListSerializer(many=True, read_only=True)
    cover_image_url = serializers.SerializerMethodField()
    og_image_url = serializers.SerializerMethodField()

    # 1. ИЗМЕНЕНИЕ: Добавляем поле для времени чтения
    reading_time = serializers.IntegerField(read_only=True)

    class Meta:
        model = Article
        fields = (
            'title', 'slug', 'author', 'published_at', 'cover_image_url',
            'content_type', 'content', 'external_url', 'category',
            'related_products', 'meta_description',
            'og_image_url', 'canonical_url',
            'views_count',      # <-- 2. ИЗМЕНЕНИЕ: Добавляем счётчик просмотров
            'reading_time'      # <-- 2. ИЗМЕНЕНИЕ: Добавляем время чтения
        )

    def get_cover_image_url(self, obj):
        return self._get_absolute_url(obj.cover_image_detail_thumbnail)

    def get_og_image_url(self, obj):
        # Если есть специальное OG изображение, возвращаем его
        if obj.og_image:
            return self._get_absolute_url(obj.og_image)
        # Если нет, возвращаем None (фронтенд будет использовать fallback)
        return None

# --- 5. Сериализаторы для просмотра заказа (Secure) ---

class OrderItemDetailSerializer(serializers.ModelSerializer):
    """Сериализатор товара в уже созданном заказе (для просмотра)."""
    # Используем ProductListSerializer для отображения миниатюры и названия
    product = ProductListSerializer(read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'quantity', 'price_at_purchase')


class OrderDetailSerializer(serializers.ModelSerializer):
    """
    Сериализатор деталей заказа для страницы успеха.
    Возвращает безопасный набор полей.
    """
    items = OrderItemDetailSerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = (
            'id', 'status', 'created_at', 
            'subtotal', 'discount_amount', 'final_total', 
            'delivery_method', 'city', 'street', 'cdek_office_address',
            'items', 'phone', 'full_name', 'shipping_address'
        )

    def get_full_name(self, obj):
        parts = [obj.first_name, obj.last_name]
        return " ".join(filter(None, parts))

    def get_shipping_address(self, obj):
        if obj.delivery_method == 'cdek':
             return f"СДЭК: {obj.cdek_office_address}" if obj.cdek_office_address else "Пункт выдачи СДЭК"
        
        # Courier/Postal address
        parts = [obj.postcode, obj.city, obj.street, obj.house, obj.apartment]
        address = ", ".join(filter(None, parts))
        return address if address else "Адрес не указан"
