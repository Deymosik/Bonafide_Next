# backend/shop/admin.py
import csv
import os
import zipfile
import json
import shutil
from io import BytesIO, StringIO
from datetime import datetime

from django.contrib import admin, messages
from django.http import HttpResponse, HttpResponseRedirect
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django import forms
from django.urls import path, reverse
from django.core.management import call_command
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction


from .models import (
    InfoPanel, Category, Product, ProductImage, PromoBanner, ProductInfoCard,
    DiscountRule, ColorGroup, ShopSettings, FaqItem, ShopImage,
    Feature, CharacteristicCategory, Characteristic, ProductCharacteristic, Cart,
    CartItem, Order, OrderItem, ArticleCategory, Article, Backup
)

class MultipleFileInput(forms.FileInput):
    """
    Кастомный виджет для загрузки нескольких файлов.
    Он наследует от FileInput, но переопределяет __init__, чтобы
    Django не вызывал ошибку ValueError при использовании multiple=True.
    """
    def __init__(self, attrs=None):
        # Просто копируем __init__ из базового класса Widget, удалив проверку
        if attrs is not None:
            self.attrs = attrs.copy()
        else:
            self.attrs = {}

# --- Все классы Inline остаются без изменений ---
class FeatureInline(admin.TabularInline):
    model = Feature
    extra = 1
    verbose_name = "Особенность (функционал)"
    verbose_name_plural = "Особенности (функционал)"
    fields = ('name', 'order')

@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('product', 'name', 'order')
    search_fields = ('name', 'product__name')
    list_filter = ('product',)


class ProductCharacteristicInline(admin.TabularInline):
    model = ProductCharacteristic
    extra = 1
    verbose_name = "Характеристика"
    verbose_name_plural = "Характеристики"
    autocomplete_fields = ['characteristic']

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    readonly_fields = ('display_image',) # Добавляем поле для предпросмотра
    verbose_name = "Дополнительное фото"
    verbose_name_plural = "Дополнительные фото"

    # Функция для красивого отображения картинки
    def display_image(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="100" height="100" style="object-fit:cover; border-radius: 8px;" />', obj.image.url)
        return "Нет фото"
    display_image.short_description = 'Превью'


class ProductInfoCardInline(admin.TabularInline):
    model = ProductInfoCard
    extra = 0
    verbose_name = "Инфо-карточка (фича)"
    verbose_name_plural = "Инфо-карточки (фичи)"
    fields = ('image', 'title', 'link_url')

class ShopImageInline(admin.TabularInline):
    model = ShopImage
    extra = 1
    verbose_name = "Фотография для страницы 'Информация'"
    verbose_name_plural = "Фотографии для страницы 'Информация'"
    fields = ('image', 'caption', 'order')


# 2. ИЗМЕНЕНИЕ: Создаем специальную форму для админки Product
class ProductAdminForm(forms.ModelForm):
    """Кастомная форма для модели Product."""
    additional_images = forms.FileField(
        label='Загрузить дополнительные фото (пачкой)',
        # 3. ИЗМЕНЕНИЕ: Используем наш новый кастомный виджет
        widget=MultipleFileInput(attrs={'multiple': True}),
        required=False
    )

    class Meta:
        model = Product
        fields = '__all__'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # 3. ИЗМЕНЕНИЕ: Подключаем нашу кастомную форму
    form = ProductAdminForm

    list_display = ('name', 'sku', 'category', 'regular_price', 'is_active', 'display_deal_status')
    list_filter = ('category', 'is_active', 'info_panels', 'color_group')
    search_fields = ('name', 'sku', 'description', 'characteristics__characteristic__name', 'characteristics__value')
    list_editable = ('is_active',)

    # --- ИЗМЕНЕНИЕ 1: Добавляем автозаполнение (JS скрипт в админке) ---
    prepopulated_fields = {'slug': ('name',)}

    inlines = [
        FeatureInline,
        ProductCharacteristicInline,
        ProductInfoCardInline,
        ProductImageInline,
    ]

    fieldsets = (
        ('Основная информация', {
            # --- ИЗМЕНЕНИЕ 2: Добавляем 'slug' в список отображаемых полей ---
            'fields': ('name', 'slug', 'sku', 'color_group', 'category', 'regular_price', 'description', 'is_active')
        }),
        ("Акция 'Товар дня'", {
            'classes': ('collapse',),
            'fields': ('deal_ends_at', 'deal_price')
        }),
        ('Медиафайлы', {
            'fields': ('main_image', 'additional_images', 'audio_sample')
        }),
        ('Связи и опции', {
            'fields': ('related_products', 'info_panels')
        }),
    )

    filter_horizontal = ('related_products', 'info_panels',)

    # 5. ИЗМЕНЕНИЕ: Переопределяем метод сохранения модели (оставляем без изменений)
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        files = request.FILES.getlist('additional_images')
        if files:
            for f in files:
                ProductImage.objects.create(product=obj, image=f)
            self.message_user(request, f"Успешно загружено {len(files)} дополнительных фотографий.", messages.SUCCESS)

    @admin.display(description='Товар дня?', boolean=True)
    def display_deal_status(self, obj):
        return obj.is_deal_of_the_day

    actions = ['make_active', 'make_inactive', 'duplicate_product']

    def make_active(self, request, queryset):
        queryset.update(is_active=True)
    make_active.short_description = "Сделать выделенные товары активными"

    def make_inactive(self, request, queryset):
        queryset.update(is_active=False)
    make_inactive.short_description = "Сделать выделенные товары неактивными"

    @admin.action(description='Дублировать выбранные товары')
    def duplicate_product(self, request, queryset):
        if queryset.count() > 5:
            self.message_user(
                request,
                "Можно дублировать не более 5 товаров за раз.",
                messages.WARNING
            )
            return

        from django.core.files.base import ContentFile
        
        duplicated_count = 0
        for original_product in queryset:
            try:
                # Сохраняем связанные объекты до копирования
                related_products = list(original_product.related_products.all())
                info_panels = list(original_product.info_panels.all())
                images_to_copy = list(original_product.images.all())
                cards_to_copy = list(original_product.info_cards.all())
                features_to_copy = list(original_product.features.all())

                # Копируем главное изображение
                main_image_copy = None
                if original_product.main_image:
                    main_image_copy = ContentFile(original_product.main_image.read())
                    main_image_copy.name = original_product.main_image.name.split('/')[-1]
                    original_product.main_image.seek(0)  # Сброс указателя файла
                
                # Копируем аудио
                audio_copy = None
                if original_product.audio_sample:
                    audio_copy = ContentFile(original_product.audio_sample.read())
                    audio_copy.name = original_product.audio_sample.name.split('/')[-1]
                    original_product.audio_sample.seek(0)

                # Создаём копию товара
                new_product = Product(
                    name=f"{original_product.name} (копия)",
                    slug=None,  # Автогенерация
                    sku=None,   # Автогенерация
                    regular_price=original_product.regular_price,
                    deal_price=original_product.deal_price,
                    deal_ends_at=original_product.deal_ends_at,
                    description=original_product.description,
                    category=original_product.category,
                    is_active=False,
                    color_group=original_product.color_group,
                )
                
                if main_image_copy:
                    new_product.main_image = main_image_copy
                if audio_copy:
                    new_product.audio_sample = audio_copy
                    
                new_product.save()

                # Восстанавливаем ManyToMany связи
                new_product.related_products.set(related_products)
                new_product.info_panels.set(info_panels)

                # Копируем дополнительные изображения
                for image in images_to_copy:
                    if image.image:
                        image_copy = ContentFile(image.image.read())
                        image_copy.name = image.image.name.split('/')[-1]
                        image.image.seek(0)
                        
                        ProductImage.objects.create(
                            product=new_product,
                            image=image_copy
                        )

                # Копируем инфо-карточки
                for card in cards_to_copy:
                    if card.image:
                        card_image_copy = ContentFile(card.image.read())
                        card_image_copy.name = card.image.name.split('/')[-1]
                        card.image.seek(0)
                        
                        ProductInfoCard.objects.create(
                            product=new_product,
                            title=card.title,
                            image=card_image_copy,
                            link_url=card.link_url
                        )
                    else:
                        ProductInfoCard.objects.create(
                            product=new_product,
                            title=card.title,
                            link_url=card.link_url
                        )

                # Копируем фичи
                from .models import Feature
                for feature in features_to_copy:
                    Feature.objects.create(
                        product=new_product,
                        name=feature.name
                    )

                duplicated_count += 1
                
            except Exception as e:
                self.message_user(
                    request,
                    f"Ошибка при дублировании '{original_product.name}': {str(e)}",
                    messages.ERROR
                )

        if duplicated_count > 0:
            self.message_user(
                request,
                f"Успешно создано {duplicated_count} копий товаров.",
                messages.SUCCESS
            )

# --- Остальные классы вашей админ-панели остаются без изменений ---

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('__str__',)
    search_fields = ('name',)

@admin.register(ColorGroup)
class ColorGroupAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(InfoPanel)
class InfoPanelAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'text_color')

@admin.register(CharacteristicCategory)
class CharacteristicCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    list_editable = ('order',)

@admin.register(Characteristic)
class CharacteristicAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
    list_filter = ('category',)
    search_fields = ('name',)

@admin.register(PromoBanner)
class PromoBannerAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'is_active', 'display_image')
    list_editable = ('order', 'is_active')
    search_fields = ('title',)

    fieldsets = (
        (None, {
            'fields': ('title', 'is_active', 'order')
        }),
        ('Содержимое баннера', {
            'fields': ('image', 'link_url')
        }),
        ('Текст поверх изображения (опционально)', {
            'fields': ('text_content', 'text_color')
        }),
    )

    def display_image(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="60" height="60" style="object-fit:cover; border-radius: 8px;" />', obj.image.url)
        return "Нет фото"
    display_image.short_description = 'Превью'

@admin.register(DiscountRule)
class DiscountRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_type', 'min_quantity', 'discount_percentage', 'is_active')
    list_filter = ('discount_type', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('name',)

    fieldsets = (
        (None, {
            'fields': ('name', 'is_active')
        }),
        ('Условие', {
            'fields': ('discount_type', 'min_quantity')
        }),
        ('Результат', {
            'fields': ('discount_percentage',)
        }),
        ('Цель (заполнять, если нужно)', {
            'description': "Укажите 'Целевой товар' для скидки на товар. Укажите 'Целевую категорию' для скидки на категорию. Оставьте пустым для скидки на всю корзину.",
            'fields': ('product_target', 'category_target')
        }),
    )


@admin.register(ShopSettings)
class ShopSettingsAdmin(admin.ModelAdmin):
    inlines = [ShopImageInline]
    
    class Media:
        css = {
            'all': ('shop/css/admin_custom.css',)
        }

    fieldsets = (
        ('Основные настройки и брендинг', {
            'fields': ('site_name', 'manager_username', 'manager_telegram_chat_id', 'telegram_channel_url', 'logo', 'og_default_image')
        }),
        ('Настройки страниц', {
            'classes': ('collapse',),
            'description': "Здесь настраиваются тексты и анимации для разных страниц.",
            'fields': (
                'search_placeholder',
                'search_initial_text',
                'search_lottie_file',
                'cart_lottie_file',
            )
        }),
        ('Настройки Блога/Статей', {
            'classes': ('collapse',),
            'fields': ('article_font_family',)
        }),
        ('SEO Настройки', {
            'classes': ('collapse',),
            'description': "Управление мета-тегами для страниц. Вы можете использовать переменные, например <b>{{site_name}}</b>. Для страницы товара также доступны <b>{{product_name}}</b> и <b>{{product_price}}</b>.",
            'fields': (
                'seo_title_home', 'seo_description_home',
                'seo_title_blog', 'seo_description_blog',
                'seo_title_product', 'seo_description_product',
                'seo_title_cart', 'seo_description_cart',
                'seo_title_faq', 'seo_description_faq',
                'seo_title_checkout', 'seo_description_checkout',
            )
        }),
        ('Настройки страницы "Информация" (FAQ)', {
            'classes': ('collapse',),
            'fields': ('about_us_section', 'delivery_section', 'warranty_section')
        }),
        ('Юридическая информация', {
            'classes': ('collapse',),
            'description': "Тексты документов, которые будут отображаться в приложении. Используйте форматирование для заголовков и списков.",
            'fields': ('public_offer', 'privacy_policy')
        }),
        ('Коммерческие настройки', {
            'classes': ('collapse',),
            'fields': ('free_shipping_threshold',)
        }),
    )

    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(FaqItem)
class FaqItemAdmin(admin.ModelAdmin):
    list_display = ('question', 'order', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('question', 'answer')

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'added_at')
    can_delete = False
    verbose_name = "Товар в корзине"
    verbose_name_plural = "Товары в корзине"

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):

    list_display = ('telegram_id', 'created_at', 'updated_at')
    search_fields = ('telegram_id', 'session_key',)
    inlines = [CartItemInline]
    readonly_fields = ('telegram_id', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False if obj else True

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price_at_purchase')
    can_delete = False
    verbose_name = "Товар в заказе"
    verbose_name_plural = "Товары в заказе"

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'get_full_name', 'delivery_method', 'city', 'final_total', 'created_at')
    list_filter = ('status', 'delivery_method', 'created_at')
    search_fields = ('id', 'first_name', 'last_name', 'phone', 'city', 'cdek_office_address')

    readonly_fields = (
        'id', 'created_at', 'telegram_id', 'get_full_name', 'phone',
        'subtotal', 'discount_amount', 'final_total', 'applied_rule'
    )
    inlines = [OrderItemInline]
    actions = ['export_as_csv']

    fieldsets = (
        ('Основная информация', {'fields': ('id', 'status', 'created_at', 'telegram_id')}),
        ('Данные клиента', {'fields': ('get_full_name', 'phone')}),
        ('Финансы', {'fields': ('subtotal', 'discount_amount', 'final_total', 'applied_rule')}),
        ('Адрес доставки', {
            'fields': (
                'delivery_method',
                'city',
                'district',
                'street',
                'house',
                'apartment',
                'postcode',
                'cdek_office_address'
            )
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            base_readonly = list(self.readonly_fields)
            all_fields = [field.name for field in self.model._meta.fields]
            editable_fields = {'status'}
            return base_readonly + [f for f in all_fields if f not in editable_fields]
        return self.readonly_fields

    def has_add_permission(self, request):
        return False

    @admin.action(description='Экспортировать выбранные заказы в CSV')
    def export_as_csv(self, request, queryset):
        meta = self.model._meta
        field_names = [
            'id', 'status', 'last_name', 'first_name', 'patronymic', 'phone',
            'delivery_method', 'city', 'district', 'street', 'house',
            'apartment', 'postcode', 'cdek_office_address', 'final_total', 'created_at'
        ]
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename={meta.verbose_name_plural}.csv'
        writer = csv.writer(response)
        writer.writerow(field_names)
        for obj in queryset:
            writer.writerow([getattr(obj, field) for field in field_names])
        return response


@admin.register(ArticleCategory)
class ArticleCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)} # Автозаполнение slug из name

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    # 1. ИЗМЕНЕНИЕ: Добавляем 'is_featured' и 'views_count' в список для удобства
    list_display = ('title', 'category', 'status', 'is_featured', 'views_count', 'published_at')
    list_filter = ('status', 'category', 'is_featured', 'author', 'published_at')
    search_fields = ('title', 'content', 'meta_description')
    # 2. ИЗМЕНЕНИЕ: Позволяем быстро менять статус и закреплять статью
    list_editable = ('status', 'is_featured')
    prepopulated_fields = {'slug': ('title',)}
    autocomplete_fields = ['author']
    filter_horizontal = ('related_products',)

    # 1. ИЗМЕНЕНИЕ: Добавляем описания (description) к fieldsets
    fieldsets = (
        ('Основное', {
            'fields': ('title', 'slug', 'meta_description', 'status', 'is_featured', 'published_at', 'category', 'author', 'canonical_url')
        }),
        ('Контент', {
            'description': "<h3>Шаг 1: Выберите тип контента.</h3><p>Затем заполните <b>только одно</b> из двух полей ниже: либо напишите текст в редакторе, либо вставьте внешнюю ссылку.</p>",
            'fields': ('content_type', 'cover_image', 'og_image', 'content', 'external_url')
        }),
        ('Связанные товары (Опционально)', {
            'classes': ('collapse',),
            'description': "<h3>Шаг 2: Увеличьте продажи!</h3><p>Выберите товары, которые тематически подходят к статье. Они будут показаны читателю.</p>",
            'fields': ('related_products',)
        }),
    )

    # 3. ИЗМЕНЕНИЕ: Добавляем кастомное действие для быстрого закрепления
    actions = ['make_featured', 'unmake_featured']

    @admin.action(description='Закрепить выбранные статьи')
    def make_featured(self, request, queryset):
        queryset.update(is_featured=True)
        self.message_user(request, "Выбранные статьи были закреплены.", messages.SUCCESS)

    @admin.action(description='Открепить выбранные статьи')
    def unmake_featured(self, request, queryset):
        queryset.update(is_featured=False)
        self.message_user(request, "Выбранные статьи были откреплены.", messages.SUCCESS)


@admin.register(Backup)
class BackupAdmin(admin.ModelAdmin):
    list_display = ('name', 'size_display', 'created_at', 'download_link')
    # Поля, которые нельзя редактировать вручную
    readonly_fields = ('created_at', 'size', 'restore_warning')

    # Настройка формы редактирования
    def get_fieldsets(self, request, obj=None):
        if obj:
            # СЦЕНАРИЙ 1: Просмотр существующего бэкапа
            # Показываем кнопку восстановления и детали
            return (
                ('Управление', {
                    'fields': ('restore_warning',)
                }),
                ('Детали архива', {
                    'fields': ('name', 'file', 'size', 'created_at')
                }),
            )
        else:
            # СЦЕНАРИЙ 2: Загрузка нового файла (Импорт)
            # Скрываем лишние поля, просим только файл
            return (
                (None, {
                    'fields': ('file', 'name'),
                    'description': 'Загрузите готовый .zip архив бэкапа. Размер будет рассчитан автоматически.'
                }),
            )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('process-create/', self.admin_site.admin_view(self.create_backup_view), name='shop_backup_create'),
            path('<int:pk>/process-restore/', self.admin_site.admin_view(self.restore_backup_view), name='shop_backup_restore'),
        ]
        return custom_urls + urls

    def size_display(self, obj):
        return obj.size
    size_display.short_description = "Размер"

    def download_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" download>⬇️ Скачать</a>', obj.file.url)
        return "-"
    download_link.short_description = "Файл"

    def restore_warning(self, obj):
        return format_html(
            '''
            <div style="background: #fff3cd; color: #856404; padding: 15px; border: 1px solid #ffeeba; border-radius: 5px;">
                <strong>⚠️ ВНИМАНИЕ! ОПАСНАЯ ЗОНА ⚠️</strong><br><br>
                Нажатие кнопки ниже запустит процесс восстановления:<br>
                1. Текущая база данных будет <strong>перезаписана</strong> данными из этого архива.<br>
                2. Текущие картинки товаров будут заменены.<br><br>

                <a class="button" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; font-weight: bold;" href="{}">
                    ЗАПУСТИТЬ ВОССТАНОВЛЕНИЕ
                </a>
            </div>
            ''',
            reverse('admin:shop_backup_restore', args=[obj.pk])
        )
    restore_warning.short_description = "Восстановление"

    # --- ЛОГИКА СОЗДАНИЯ БЭКАПА (ЭКСПОРТ) ---
    def create_backup_view(self, request):
        try:
            # 1. Дамп базы данных в память
            buf = StringIO()
            # Исключаем системные таблицы, чтобы избежать конфликтов
            call_command('dumpdata', exclude=['auth.permission', 'contenttypes', 'admin.logentry', 'sessions', 'shop.backup'], stdout=buf)
            buf.seek(0)
            db_json = buf.read()

            # 2. Создаем ZIP архив
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Добавляем JSON базы
                zip_file.writestr('db_dump.json', db_json)

                # Добавляем папку media (картинки)
                media_root = settings.MEDIA_ROOT
                if os.path.exists(media_root):
                    for root, dirs, files in os.walk(media_root):
                        if 'backups' in dirs:
                            dirs.remove('backups') # Не архивируем сами бэкапы рекурсивно

                        for file in files:
                            file_path = os.path.join(root, file)
                            # Сохраняем относительный путь (media/products/img.jpg)
                            arcname = os.path.relpath(file_path, start=os.path.dirname(media_root))
                            zip_file.write(file_path, arcname)

            # 3. Сохраняем файл
            timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
            filename = f"backup_{timestamp}.zip"
            backup = Backup(name=f"Авто-бэкап от {datetime.now().strftime('%d.%m.%Y %H:%M')}")
            backup.file.save(filename, ContentFile(zip_buffer.getvalue()))
            backup.save()

            self.message_user(request, "✅ Полный бэкап успешно создан!", messages.SUCCESS)
        except Exception as e:
            self.message_user(request, f"❌ Ошибка создания: {str(e)}", messages.ERROR)

        return HttpResponseRedirect(reverse('admin:shop_backup_changelist'))

    # --- ЛОГИКА ВОССТАНОВЛЕНИЯ (ИМПОРТ) ---
    @transaction.atomic
    def restore_backup_view(self, request, pk):
        backup = self.get_object(request, pk)
        if not backup:
            return HttpResponseRedirect(reverse('admin:shop_backup_changelist'))

        try:
            with zipfile.ZipFile(backup.file.path, 'r') as zip_file:
                # 1. Проверяем валидность архива
                if 'db_dump.json' not in zip_file.namelist():
                    raise Exception("Некорректный архив: отсутствует файл базы данных (db_dump.json)")

                # 2. Восстанавливаем базу данных
                json_data = zip_file.read('db_dump.json').decode('utf-8')

                # Сохраняем во временную папку или в media, где есть права на запись
                temp_file_path = os.path.join(settings.MEDIA_ROOT, 'temp_restore.json')
                with open(temp_file_path, 'w') as tmp_file:
                    tmp_file.write(json_data)

                print("Загрузка данных в БД...")
                # loaddata автоматически обновляет существующие записи по ID и создает новые
                call_command('loaddata', temp_file_path)

                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

                # 3. Восстанавливаем медиафайлы
                # Распаковываем в папку media, перезаписывая файлы
                media_parent = os.path.dirname(settings.MEDIA_ROOT)

                for member in zip_file.namelist():
                    # Извлекаем только файлы из папки media/ и игнорируем папку backups/
                    if member.startswith('media/') and 'backups/' not in member:
                        zip_file.extract(member, media_parent)

            self.message_user(request, "✅ Система успешно восстановлена из архива!", messages.SUCCESS)
        except Exception as e:
            # Благодаря @transaction.atomic изменения в БД откатятся при ошибке
            self.message_user(request, f"❌ Ошибка восстановления: {str(e)}", messages.ERROR)

        return HttpResponseRedirect(reverse('admin:shop_backup_changelist'))

    change_list_template = 'admin/shop/backup/change_list.html'