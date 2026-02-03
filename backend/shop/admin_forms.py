from django import forms
from django.template.loader import render_to_string
from django.utils.safestring import mark_safe
from .models import Product, ProductCharacteristic, Characteristic

class CharacteristicsWidget(forms.Widget):
    template_name = 'admin/shop/widgets/characteristics_widget.html'

    def __init__(self, attrs=None, product_instance=None):
        super().__init__(attrs)
        self.product_instance = product_instance

    def render(self, name, value, attrs=None, renderer=None):
        context = {
            'widget': {'value': value},
            'grouped_characteristics': {}
        }
        
        if self.product_instance and self.product_instance.characteristic_group:
            group = self.product_instance.characteristic_group
            # Получаем все характеристики группы, упорядоченные по разделу и имени
            characteristics = group.characteristics.select_related('section').all().order_by('section__order', 'section__name', 'name')
            
            # Получаем существующие значения
            existing_values = {
                pc.characteristic_id: pc.value 
                for pc in ProductCharacteristic.objects.filter(product=self.product_instance)
            }
            
            grouped = {}
            for char in characteristics:
                sec = char.section
                if sec not in grouped:
                    grouped[sec] = []
                
                grouped[sec].append({
                    'characteristic': char,
                    'value': existing_values.get(char.id, '')
                })
            
            context['grouped_characteristics'] = grouped
            
        return render_to_string(self.template_name, context)

class ProductAdminForm(forms.ModelForm):
    """Кастомная форма для модели Product."""
    
    # Поле-пустышка, просто чтобы вывести наш виджет
    characteristics_editor = forms.CharField(
        label='Редактор характеристик',
        required=False,
        widget=CharacteristicsWidget()
    )

    class Meta:
        model = Product
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Передаем инстанс продукта в виджет, чтобы он мог отрисовать поля
        if self.instance.pk:
            self.fields['characteristics_editor'].widget = CharacteristicsWidget(product_instance=self.instance)
        # Важно: если это POST запрос, и мы хотим валидировать или сохранять динамические поля,
        # нам нужно добавить их в self.fields динамически или (проще) обработать в save() админки/формы.
        # В данном упрощенном варианте мы просто рисуем виджет, а сохранение сделаем в save_model админки.

class ImportCharacteristicsForm(forms.Form):
    """Форма для импорта характеристик из JSON."""
    json_text = forms.CharField(
        label="JSON данные",
        widget=forms.Textarea(attrs={'rows': 20, 'style': 'font-family: monospace; width: 100%;'}),
        required=False,
        help_text="Вставьте JSON структуру здесь. Пример: [{'section': 'Display', 'items': ['Resolution', 'Size']}]"
    )
    json_file = forms.FileField(
        label="Или загрузите JSON файл",
        required=False,
        help_text="Выберите .json файл с аналогичной структурой."
    )

    def clean(self):
        cleaned_data = super().clean()
        text = cleaned_data.get('json_text')
        file = cleaned_data.get('json_file')

        if not text and not file:
            raise forms.ValidationError("Необходимо либо вставить текст JSON, либо загрузить файл.")
        
        return cleaned_data
