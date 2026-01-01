# backend/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

# Простая функция-заглушка для главной страницы
def index_view(request):
    return JsonResponse({"status": "ok", "message": "BonaFide55 API is running"})

urlpatterns = [
    path('', index_view, name='index'),
    path(settings.ADMIN_URL, admin.site.urls),
    path('api/', include('shop.urls')),
    path('tinymce/', include('tinymce.urls')),
    # --- Документация API (Swagger) ---
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# 2. УБЕДИТЕСЬ, ЧТО ЭТОТ БЛОК КОДА ДОБАВЛЕН В КОНЕЦ ФАЙЛА
# Эта строка позволяет Django раздавать медиафайлы в режиме отладки (DEBUG=True)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)