# backend/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.conf.urls.static import static

# Простая функция-заглушка для главной страницы
def index_view(request):
    return JsonResponse({"status": "ok", "message": "BonaFide55 API is running"})

urlpatterns = [
    path('', index_view, name='index'),
    path(settings.ADMIN_URL, admin.site.urls),
    path('api/', include('shop.urls')),
    path("ckeditor5/", include('django_ckeditor_5.urls'), name="ck_editor_5_upload_file"),
]

# 2. УБЕДИТЕСЬ, ЧТО ЭТОТ БЛОК КОДА ДОБАВЛЕН В КОНЕЦ ФАЙЛА
# Эта строка позволяет Django раздавать медиафайлы в режиме отладки (DEBUG=True)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)