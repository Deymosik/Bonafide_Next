# backend/shop/admin.py
import csv
import os
import zipfile
import json
import shutil
from io import BytesIO, StringIO
from datetime import datetime

from django.contrib import admin, messages
from unfold.admin import ModelAdmin, TabularInline
from unfold.contrib.filters.admin import RangeDateFilter, ChoicesDropdownFilter, ChoicesDropdownFilter, RelatedDropdownFilter, TextFilter, FieldTextFilter
from django.http import HttpResponse, HttpResponseRedirect
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.shortcuts import render # Добавлено
from django import forms
from django.urls import path, reverse
from django.core.management import call_command
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction


from .models import (
    InfoPanel, Category, Product, ProductImage, PromoBanner, ProductInfoCard,
    DiscountRule, ColorGroup, ShopSettings, FaqItem, ShopImage,
    Feature, CharacteristicSection, Characteristic, ProductCharacteristic, Cart,

    CartItem, Order, OrderItem, ArticleCategory, Article, Backup, CharacteristicGroup,
    FeatureDefinition
)
from .admin_forms import ProductAdminForm, CharacteristicsWidget
from tinymce.models import HTMLField

from tinymce.widgets import TinyMCE

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
class FeatureDefinitionAdmin(ModelAdmin):
    list_display = ('name', 'icon', 'display_icon', 'slug')
    search_fields = ('name',)
    list_editable = ('icon',)
    
    def display_icon(self, obj):
        if obj.icon:
            return format_html('<img src="{}" width="30" height="30" style="object-fit:cover; border-radius: 4px;" />', obj.icon.url)
        return "—"
    display_icon.short_description = "Превью"

admin.site.register(FeatureDefinition, FeatureDefinitionAdmin)

@admin.register(Feature)
class FeatureAdmin(ModelAdmin):
    list_display = ('product', 'feature_definition', 'name', 'order')
    search_fields = ('name', 'product__name', 'feature_definition__name')
    list_filter = ('product', 'feature_definition')
    autocomplete_fields = ['feature_definition', 'product']


class FeatureInline(TabularInline):
    model = Feature
    extra = 1
    verbose_name = "Особенность (функционал)"
    verbose_name_plural = "Особенности (функционал)"
    fields = ('feature_definition', 'name', 'order')
    autocomplete_fields = ['feature_definition']

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        # Подсказка для менеджера
        formset.form.base_fields['name'].widget.attrs.update({
             'placeholder': 'Уточнение (необязательно)'
        })
        return formset



class ProductCharacteristicInline(TabularInline):
    model = ProductCharacteristic
    extra = 1
    verbose_name = "Характеристика"
    verbose_name_plural = "Характеристики"
    autocomplete_fields = ['characteristic']

class ProductImageInline(TabularInline):
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


class ProductInfoCardInline(TabularInline):
    model = ProductInfoCard
    extra = 0
    verbose_name = "Инфо-карточка (фича)"
    verbose_name_plural = "Инфо-карточки (фичи)"
    fields = ('image', 'title', 'link_url')

class ShopImageInline(TabularInline):
    model = ShopImage
    extra = 0
    verbose_name = "Фотография для страницы 'Информация'"
    verbose_name_plural = "Фотографии для страницы 'Информация'"
    fields = ('image', 'caption', 'order')


# 2. ИЗМЕНЕНИЕ: (Обновлено) Наследуемся от формы из admin_forms.py
class ProductAdminFormWithImages(ProductAdminForm):
    """
    Расширяем нашу форму с характеристиками, добавляя загрузку картинок.
    """
    additional_images = forms.FileField(
        label='Загрузить дополнительные фото (пачкой)',
        # 3. ИЗМЕНЕНИЕ: Используем наш новый кастомный виджет
        widget=MultipleFileInput(attrs={'multiple': True}),
        required=False
    )



@admin.register(Product)
class ProductAdmin(ModelAdmin):
    # 3. ИЗМЕНЕНИЕ: Подключаем нашу кастомную форму
    form = ProductAdminFormWithImages

    
    # Force TinyMCE widget
    formfield_overrides = {
        HTMLField: {'widget': TinyMCE(attrs={'cols': 80, 'rows': 30})},
    }

    # ВАЖНО: availability_status должен быть в list_display, чтобы работать в list_editable
    list_display = ('name', 'sku', 'category', 'regular_price', 'is_active', 'availability_status', 'stock_quantity', 'Display_availability_badge')
    list_filter = (
        ('category', RelatedDropdownFilter),
        ('availability_status', ChoicesDropdownFilter), # Фильтр по наличию
        ('is_active', ChoicesDropdownFilter),
        ('color_group', RelatedDropdownFilter),
        ('info_panels', RelatedDropdownFilter),
    )
    search_fields = ('name', 'sku', 'description', 'characteristics__characteristic__name', 'characteristics__value')
    list_editable = ('is_active', 'stock_quantity', 'availability_status') # Быстрое редактирование

    # --- ИЗМЕНЕНИЕ 1: Добавляем автозаполнение (JS скрипт в админке) ---
    prepopulated_fields = {'slug': ('name',)}

    inlines = [
        FeatureInline,
        # ProductCharacteristicInline, # Убираем стандартный инлайн, так как теперь есть удобный виджет
        ProductInfoCardInline,
        ProductImageInline,
    ]


    fieldsets = (
        ('Основная информация', {
            # --- ИЗМЕНЕНИЕ 2: Добавляем 'slug' в список отображаемых полей ---
            'fields': ('name', 'slug', 'sku', 'category', 'characteristic_group', 'regular_price', 'description', 'is_active')
        }),
        ('Характеристики', {
            'classes': ('tab',),
            'description': "Выберите 'Шаблон характеристик' выше и сохраните товар, чтобы появились поля.",
            'fields': ('characteristics_editor',)
        }),
        ("Управление наличием (Склад)", {
            'classes': ('tab',), # Выделяем в отдельный таб или блок
            'fields': ('availability_status', 'stock_quantity', 'allow_backorder', 'low_stock_threshold', 'restock_date')
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
        
        # 1. Сохранение картинок
        files = request.FILES.getlist('additional_images')
        if files:
            for f in files:
                ProductImage.objects.create(product=obj, image=f)
            self.message_user(request, f"Успешно загружено {len(files)} дополнительных фотографий.", messages.SUCCESS)

        # 2. Сохранение характеристик из нашего виджета
        # Итерируемся по всем параметрам POST запроса
        saved_chars_count = 0
        for key, value in request.POST.items():
            if key.startswith('characteristic_'):
                try:
                    char_id = int(key.split('_')[1])
                    if value.strip(): # Если значение не пустое
                        ProductCharacteristic.objects.update_or_create(
                            product=obj,
                            characteristic_id=char_id,
                            defaults={'value': value.strip()}
                        )
                        saved_chars_count += 1
                    else:
                        # Если значение стерли - удаляем запись
                        ProductCharacteristic.objects.filter(product=obj, characteristic_id=char_id).delete()
                except ValueError:
                    continue
        
        if saved_chars_count > 0:
            # Не перетираем сообщение об изображениях, если оно было
            pass 


    @admin.display(description='Товар дня?', boolean=True)
    def display_deal_status(self, obj):
        return obj.is_deal_of_the_day

    @admin.display(description='Наличие')
    def Display_availability_badge(self, obj):
        # Красивые бейджики для статусов
        colors = {
            'IN_STOCK': 'green',
            'OUT_OF_STOCK': 'red',
            'PRE_ORDER': 'blue',
            'DISCONTINUED': 'gray',
            'ON_DEMAND': 'purple',
        }
        color = colors.get(obj.availability_status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_availability_status_display()
        )

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
class CategoryAdmin(ModelAdmin):
    list_display = ('__str__',)
    search_fields = ('name',)

@admin.register(ColorGroup)
class ColorGroupAdmin(ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(InfoPanel)
class InfoPanelAdmin(ModelAdmin):
    list_display = ('name', 'color', 'text_color')

@admin.register(CharacteristicSection)
class CharacteristicSectionAdmin(ModelAdmin):
    change_list_template = 'admin/shop/characteristicsection/change_list.html'
    list_display = ('name', 'order')
    list_editable = ('order',)

@admin.register(Characteristic)
class CharacteristicAdmin(ModelAdmin):
    change_list_template = 'admin/shop/characteristic/change_list.html'
    list_display = ('name', 'section')
    list_filter = (('section', RelatedDropdownFilter),)
    search_fields = ('name',)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import/', self.admin_site.admin_view(self.import_characteristics), name='shop_characteristic_import'),
        ]
        return custom_urls + urls

    def import_characteristics(self, request):
        from .admin_forms import ImportCharacteristicsForm
        
        if request.method == 'POST':
            form = ImportCharacteristicsForm(request.POST, request.FILES)
            if form.is_valid():
                json_data = None
                # 1. Пытаемся получить JSON из текста
                if form.cleaned_data['json_text']:
                    try:
                        json_data = json.loads(form.cleaned_data['json_text'])
                    except json.JSONDecodeError as e:
                        messages.error(request, f"Ошибка в JSON тексте: {e}")
                        return render(request, 'admin/shop/characteristic/import_form.html', {'form': form, 'title': 'Импорт характеристик'})

                # 2. Если текста нет, берем из файла
                elif form.cleaned_data['json_file']:
                    try:
                        json_file = form.cleaned_data['json_file']
                        json_data = json.load(json_file)
                    except json.JSONDecodeError as e:
                        messages.error(request, f"Ошибка в JSON файле: {e}")
                        return render(request, 'admin/shop/characteristic/import_form.html', {'form': form, 'title': 'Импорт характеристик'})
                    except Exception as e:
                         messages.error(request, f"Ошибка чтения файла: {e}")
                         return render(request, 'admin/shop/characteristic/import_form.html', {'form': form, 'title': 'Импорт характеристик'})

                # 3. Обрабатываем данные
                if json_data:
                    if not isinstance(json_data, list):
                        messages.error(request, "JSON должен быть списком объектов [{'section': '...', 'items': [...]}]")
                    else:
                        created_sections = 0
                        created_characteristics = 0
                        errors = []

                        try:
                            with transaction.atomic():
                                for entry in json_data:
                                    section_name = entry.get('section')
                                    items = entry.get('items', [])

                                    if not section_name:
                                        errors.append(f"Пропущен 'section' в записи: {entry}")
                                        continue

                                    section_obj, created = CharacteristicSection.objects.get_or_create(name=section_name)
                                    if created:
                                        created_sections += 1

                                    for item_name in items:
                                        _, char_created = Characteristic.objects.get_or_create(
                                            name=item_name,
                                            section=section_obj
                                        )
                                        if char_created:
                                            created_characteristics += 1
                            
                            if errors:
                                messages.warning(request, f"Импорт завершен с предупреждениями. Создано разделов: {created_sections}, характеристик: {created_characteristics}. Ошибки: {'; '.join(errors)}")
                            else:
                                messages.success(request, f"Успешно! Создано разделов: {created_sections}, характеристик: {created_characteristics}.")
                            
                            return HttpResponseRedirect(reverse('admin:shop_characteristic_changelist'))
                        
                        except Exception as e:
                             messages.error(request, f"Системная ошибка при импорте: {e}")

        else:
            form = ImportCharacteristicsForm()

        context = {
            'form': form,
            'title': 'Импорт характеристик',
            **self.admin_site.each_context(request),
        }
        return render(request, 'admin/shop/characteristic/import_form.html', context)

@admin.register(CharacteristicGroup)
class CharacteristicGroupAdmin(ModelAdmin):
    change_list_template = 'admin/shop/characteristicgroup/change_list.html'
    list_display = ('name', 'get_chars_count')
    search_fields = ('name',)
    filter_horizontal = ('characteristics',)
    
    @admin.display(description='Кол-во хар-к')
    def get_chars_count(self, obj):
        return obj.characteristics.count()


@admin.register(PromoBanner)
class PromoBannerAdmin(ModelAdmin):
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
class DiscountRuleAdmin(ModelAdmin):
    list_display = ('name', 'discount_type', 'min_quantity', 'discount_percentage', 'is_active')
    list_filter = (
        ('discount_type', ChoicesDropdownFilter),
        ('is_active', ChoicesDropdownFilter)
    )
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
class ShopSettingsAdmin(ModelAdmin):
    inlines = [ShopImageInline]
    
    # Force TinyMCE widget
    formfield_overrides = {
        HTMLField: {'widget': TinyMCE(attrs={'cols': 80, 'rows': 30})},
    }
    
    class Media:
        css = {
            'all': ('shop/css/admin_custom.css',)
        }

    fieldsets = (
        ('Основные настройки', {
            'classes': ('tab',),
            'fields': (
                ('site_name', 'logo'),
                ('manager_username', 'manager_telegram_chat_id'),
                'telegram_channel_url',
                'og_default_image'
            )
        }),
        ('Настройки страниц (Тексты/Lottie)', {
            'classes': ('tab',),
            'fields': (
                'search_placeholder',

                'cart_lottie_file',
                'order_success_lottie_file',
            )
        }),
        ('SEO (Мета-теги)', {
            'classes': ('tab',),
            'description': "Управление мета-тегами для страниц. Вы можете использовать переменные, например <b>{{site_name}}</b>.",
            'fields': (
                ('seo_title_home', 'seo_description_home'),
                ('seo_title_blog', 'seo_description_blog'),
                ('seo_title_product', 'seo_description_product'),
                ('seo_title_cart', 'seo_description_cart'),
                ('seo_title_faq', 'seo_description_faq'),
                ('seo_title_checkout', 'seo_description_checkout'),
            )
        }),
        ('Контент (FAQ/Доставка)', {
            'classes': ('tab',),
            'fields': (
                'about_us_section',
                'delivery_section',
                'warranty_section',
                'article_font_family'
            )
        }),
        ('Юридическая информация', {
            'classes': ('tab',),
            'fields': (
                'public_offer', 
                'privacy_policy',
                'free_shipping_threshold'
            )
        }),
    )

    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(FaqItem)
class FaqItemAdmin(ModelAdmin):
    # Force TinyMCE widget
    formfield_overrides = {
        HTMLField: {'widget': TinyMCE(attrs={'cols': 80, 'rows': 30})},
    }
    list_display = ('question', 'order', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('question', 'answer')
    change_list_template = 'admin/shop/faqitem/change_list.html'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import-json/', self.admin_site.admin_view(self.import_json_view), name='shop_faqitem_import'),
        ]
        return custom_urls + urls

    def import_json_view(self, request):
        # Внутренний класс формы
        class FaqImportForm(forms.Form):
            json_file = forms.FileField(required=False, label="JSON файл")
            json_text = forms.CharField(required=False, widget=forms.Textarea(attrs={'rows': 10, 'style': 'width: 100%;'}), label="JSON текст")

            def clean(self):
                cleaned_data = super().clean()
                file = cleaned_data.get('json_file')
                text = cleaned_data.get('json_text')
                if not file and not text:
                    raise forms.ValidationError("Загрузите файл или вставьте текст.")
                return cleaned_data

        if request.method == 'POST':
            form = FaqImportForm(request.POST, request.FILES)
            if form.is_valid():
                data = None
                try:
                    # 1. Считываем данные
                    if form.cleaned_data['json_file']:
                        file = form.cleaned_data['json_file']
                        content = file.read().decode('utf-8')
                        data = json.loads(content)
                    else:
                        data = json.loads(form.cleaned_data['json_text'])

                    # 2. Валидация формата
                    if not isinstance(data, list):
                        raise ValueError("Ожидается массив (список) объектов.")

                    count = 0
                    with transaction.atomic():
                        for item in data:
                            if 'question' not in item or 'answer' not in item:
                                continue # Пропускаем некорректные
                            
                            FaqItem.objects.create(
                                question=item.get('question'),
                                answer=item.get('answer'),
                                order=item.get('order', 0),
                                is_active=item.get('is_active', True)
                            )
                            count += 1
                    
                    self.message_user(request, f"Успешно импортировано {count} вопросов.", messages.SUCCESS)
                    return HttpResponseRedirect(reverse('admin:shop_faqitem_changelist'))

                except json.JSONDecodeError:
                    self.message_user(request, "Ошибка: Неверный формат JSON.", messages.ERROR)
                except ValueError as ve:
                    self.message_user(request, f"Ошибка данных: {str(ve)}", messages.ERROR)
                except Exception as e:
                    self.message_user(request, f"Системная ошибка: {str(e)}", messages.ERROR)
        else:
            form = FaqImportForm()

        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta,
            'form': form,
            'title': 'Импорт FAQ из JSON'
        }
        return render(request, 'admin/shop/faqitem/import_form.html', context)

class CartItemInline(TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'added_at')
    can_delete = False
    verbose_name = "Товар в корзине"
    verbose_name_plural = "Товары в корзине"

@admin.register(Cart)
class CartAdmin(ModelAdmin):

    list_display = ('telegram_id', 'created_at', 'updated_at')
    search_fields = ('telegram_id', 'session_key',)
    inlines = [CartItemInline]
    readonly_fields = ('telegram_id', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False if obj else True

class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price_at_purchase')
    can_delete = False
    verbose_name = "Товар в заказе"
    verbose_name_plural = "Товары в заказе"

@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = ('id', 'status', 'get_full_name', 'delivery_method', 'city', 'final_total', 'created_at')
    list_filter = (
        ('status', ChoicesDropdownFilter),
        ('delivery_method', ChoicesDropdownFilter),
        ('created_at', RangeDateFilter),
    )
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
class ArticleCategoryAdmin(ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)} # Автозаполнение slug из name

@admin.register(Article)
class ArticleAdmin(ModelAdmin):
    # Force TinyMCE widget
    formfield_overrides = {
        HTMLField: {'widget': TinyMCE(attrs={'cols': 80, 'rows': 30})},
    }
    # 1. ИЗМЕНЕНИЕ: Добавляем 'is_featured' и 'views_count' в список для удобства
    list_display = ('title', 'category', 'status', 'is_featured', 'views_count', 'published_at')
    list_filter = (
        ('status', ChoicesDropdownFilter),
        ('category', RelatedDropdownFilter),
        ('is_featured', ChoicesDropdownFilter),
        ('author', RelatedDropdownFilter),
        ('published_at', RangeDateFilter),
    )
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
class BackupAdmin(ModelAdmin):
    list_display = ('name', 'size_display', 'status', 'created_at', 'download_link')
    # Поля, которые нельзя редактировать вручную
    readonly_fields = ('created_at', 'size', 'restore_warning', 'status', 'log')

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
                    'fields': ('name', 'file', 'size', 'created_at', 'status', 'log')
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
    # --- ЛОГИКА СОЗДАНИЯ БЭКАПА (ЭКСПОРТ) ---
    def create_backup_view(self, request):
        try:
            # Создаем запись статуса
            timestamp = datetime.now().strftime('%d.%m.%Y %H:%M')
            backup = Backup.objects.create(
                name=f"Авто-бэкап от {timestamp}",
                status='pending'
            )
            
            # Запускаем задачу
            from .tasks import create_backup_task
            transaction.on_commit(lambda: create_backup_task.delay(backup.id))

            self.message_user(request, "⏳ Задача на создание бэкапа запущена в фоне. Обновите страницу через минуту.", messages.INFO)
        except Exception as e:
            self.message_user(request, f"❌ Ошибка запуска задачи: {str(e)}", messages.ERROR)

        return HttpResponseRedirect(reverse('admin:shop_backup_changelist'))

    # --- ЛОГИКА ВОССТАНОВЛЕНИЯ (ИМПОРТ) ---
    def restore_backup_view(self, request, pk):
        backup = self.get_object(request, pk)
        if not backup:
            return HttpResponseRedirect(reverse('admin:shop_backup_changelist'))

        try:
            # Обновляем статус
            backup.status = 'pending'
            backup.save(update_fields=['status'])
            
            # Запускаем задачу
            from .tasks import restore_backup_task
            transaction.on_commit(lambda: restore_backup_task.delay(backup.id))

            self.message_user(request, "⏳ Восстановление запущена в фоне. Это может занять некоторое время.", messages.WARNING)
        except Exception as e:
            self.message_user(request, f"❌ Ошибка запуска восстановления: {str(e)}", messages.ERROR)
            
        return HttpResponseRedirect(reverse('admin:shop_backup_changelist'))

        return HttpResponseRedirect(reverse('admin:shop_backup_changelist'))

    change_list_template = 'admin/shop/backup/change_list.html'