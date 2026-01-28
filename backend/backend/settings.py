# backend/backend/settings.py - ФИНАЛЬНАЯ ЭТАЛОННАЯ ВЕРСИЯ
from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url
from corsheaders.defaults import default_headers
from datetime import timedelta
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _
from django.templatetags.static import static

# Загружаем переменные окружения из .env файла
load_dotenv()

# --- БЕЗОПАСНОСТЬ: Кастомный URL админки ---
# Читаем значение из .env. Если его нет — используем сложный путь по умолчанию.
# Это позволяет менять адрес админки без изменения кода.
custom_admin_url = os.environ.get('DJANGO_ADMIN_URL', 'secure-admin-panel/')
# Нормализация пути: убираем слеш в начале, добавляем в конце
ADMIN_URL = custom_admin_url.strip('/') + '/'

# Определяем базовую директорию проекта
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Настройки Безопасности ---

# Секретный ключ должен читаться из окружения. В .env файле он должен быть.
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
# Режим отладки. На сервере должен быть 'False'.
DEBUG = os.environ.get('DJANGO_DEBUG', '') != 'False'

# Разрешенные хосты. Читаются из .env файла.
# Пример для .env: ALLOWED_HOSTS_STR=bf55.ru,www.bf55.ru
if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    allowed_hosts_str = os.environ.get('ALLOWED_HOSTS_STR', '127.0.0.1,localhost')
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',')]

# Базовый URL сайта (для формирования ссылок в уведомлениях)
SITE_URL = os.environ.get('SITE_URL', 'http://127.0.0.1:8000').rstrip('/')

# --- Настройки безопасности для Production ---
# Эти настройки включаются только когда DEBUG=False
if not DEBUG:
    # HTTPS/SSL
    # ВАЖНО: Отключаем редирект на уровне Django, так как Nginx сам делает редирект для внешних клиентов.
    # Если оставить True, то внутренние запросы от Frontend (http://backend:8000) будут получать 301 https://...
    # и падать с ошибкой (так как внутри Docker нет SSL).
    SECURE_SSL_REDIRECT = False
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # Для работы за reverse proxy
    
    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = 31536000  # 1 год
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Cookies
    SESSION_COOKIE_SECURE = True  # Cookies только через HTTPS
    CSRF_COOKIE_SECURE = True     # CSRF cookie только через HTTPS
    
    # Дополнительная защита
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'


# --- Приложения Django ---

INSTALLED_APPS = [
    # --- ADMIN UI (Unfold) ---
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "unfold.contrib.import_export",
    "unfold.contrib.guardian",
    "unfold.contrib.simple_history",
    # -------------------------
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'whitenoise.runserver_nostatic',
    # Сторонние приложения
    'drf_spectacular', # Swagger
    'tinymce',
    'rest_framework',
    'corsheaders',
    'imagekit',
    'django_cleanup.apps.CleanupConfig',
    'colorfield',
    # Postgres extensions
    'django.contrib.postgres',
    # Ваше приложение
    'shop',
]


# --- Middleware ---
# Порядок Middleware очень важен.

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise для эффективной раздачи статики
   # 'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    # 'admin_reorder.middleware.ModelAdminReorder', # Removed for Unfold
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# --- Настройки URL ---

ROOT_URLCONF = 'backend.urls'


# --- Настройки Шаблонов ---

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# --- Настройки WSGI ---

WSGI_APPLICATION = 'backend.wsgi.application'


# --- База Данных ---
# Используем dj_database_url для гибкой настройки из .env файла.
# Docker Compose автоматически создаст DATABASE_URL из переменных POSTGRES_...

DATABASES = {
    'default': dj_database_url.config(conn_max_age=600, ssl_require=False)
}

# Use SQLite for tests to avoid PostgreSQL permission issues
import sys
if 'test' in sys.argv:
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }


# --- Кеширование (Новое) ---
# В продакшене лучше использовать Redis, но для старта пойдет LocMemCache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}


# --- Настройки для Django REST Framework и CORS ---

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    # Swagger Schema
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Настройки Swagger
SPECTACULAR_SETTINGS = {
    'TITLE': 'BonaFide55 API',
    'DESCRIPTION': 'API для интернет-магазина техники и аксессуаров BonaFide55.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    # Другие настройки...
}

CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-session-id',
]

# Разрешенные источники для CORS. Читаются из .env файла.
# Пример для .env: CORS_ALLOWED_ORIGINS_STR=https://bf55.ru,https://www.bf55.ru
cors_origins_str = os.environ.get('CORS_ALLOWED_ORIGINS_STR', 'http://localhost:3000,http://127.0.0.1:3000')

CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_str.split(',')]


# --- Настройки для работы за Reverse Proxy (Nginx) в Production ---
if not DEBUG:
    # 1. Говорим Django, что мы за Nginx и используем HTTPS
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # 2. Говорим использовать домен из заголовка (bf55.ru), а не localhost
    USE_X_FORWARDED_HOST = True

    # 3. ВАЖНО: Говорим использовать порт из заголовка (443), а не 8000
    USE_X_FORWARDED_PORT = True

    # 4. Безопасность кук (только через HTTPS)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # 5. Доверенные источники для CSRF
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in cors_origins_str.split(',') if origin]


# --- Валидаторы Паролей ---

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# --- Интернационализация и Часовой Пояс ---

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True


# --- Настройки Статических и Медиа Файлов ---

STATIC_URL = '/django-static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
#STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# Если мы в продакшене (DEBUG=False), мы жестко задаем публичный домен для медиа
if not DEBUG:
    # Важно: это заставит Django генерировать абсолютные ссылки (https://bf55.ru/media/...)
    # вместо относительных (/media/...)
    MEDIA_URL = f'https://{os.environ.get("ALLOWED_HOSTS_STR", "bf55.ru").split(",")[0]}/media/'
else:
    MEDIA_URL = '/media/'

MEDIA_ROOT = BASE_DIR / 'media'


# --- Прочие Настройки ---

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- Конфигурация для TinyMCE ---

TINYMCE_DEFAULT_CONFIG = {
    "license_key": "gpl",  # Open-source GPL license
    "theme": "silver",
    "height": 400,
    "menubar": True,
    "language": "ru",
    "plugins": [
        "advlist", "autolink", "lists", "link", "image", "charmap", "preview",
        "anchor", "searchreplace", "visualblocks", "code", "fullscreen",
        "insertdatetime", "media", "table", "help", "wordcount", "emoticons"
    ],
    "toolbar": (
        "undo redo | blocks | bold italic underline strikethrough | "
        "forecolor backcolor | alignleft aligncenter alignright alignjustify | "
        "bullist numlist outdent indent | link image media table emoticons | "
        "removeformat code fullscreen help"
    ),
    "content_css": "default",
    # Стили для контента редактора — изображения по умолчанию 300px в ширину
    "content_style": "img { max-width: 300px; height: auto; display: block; margin: 10px 0; }",
    "branding": False,
    "promotion": False,
    # Image upload configuration
    "images_upload_url": "/api/tinymce/upload-image/",
    "images_upload_credentials": True,
    "automatic_uploads": True,
    "file_picker_types": "image",
    "image_title": True,
    "image_caption": True,
    "image_advtab": True,
    # Разрешённые типы файлов для загрузки
    "images_file_types": "jpg,jpeg,png,gif,webp,heic,heif",
    # Сохранять пропорции изображения при изменении размера
    "image_dimensions": True,
    # Классы для изображений (пользователь может выбрать размер)
    "image_class_list": [
        {"title": "По умолчанию (50%)", "value": ""},
        {"title": "Маленькое (25%)", "value": "img-small"},
        {"title": "Среднее (50%)", "value": "img-medium"},
        {"title": "Большое (75%)", "value": "img-large"},
        {"title": "На всю ширину", "value": "img-full"},
    ],
}

# --- ПРОФЕССИОНАЛЬНОЕ ЛОГИРОВАНИЕ ---

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'shop': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# --- Celery Configuration ---
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://127.0.0.1:6379/0')
CELERY_TIMEZONE = TIME_ZONE
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

from django.utils.translation import gettext_lazy as _

UNFOLD = {
    "SITE_TITLE": os.environ.get("ADMIN_SITE_TITLE", "BonaFide55 Admin"),
    "SITE_HEADER": os.environ.get("ADMIN_SITE_HEADER", "BonaFide55"),
    "SITE_URL": "/",
    "SITE_ICON": {
        "light": lambda request: static("admin/img/logo-light.svg"),  # light mode
        "dark": lambda request: static("admin/img/logo-dark.svg"),  # dark mode
    },
    # "THEME": "dark",  # Force dark mode or "light"
    "STYLES": [
        lambda request: static("css/unfold_custom.css"),
    ],
    "SCRIPTS": [
        lambda request: static("js/unfold_custom.js"),
    ],
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,
        "navigation": [
            {
                "title": _("Каталог"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Товары"),
                        "icon": "inventory_2",
                        "link": reverse_lazy("admin:shop_product_changelist"),
                    },
                    {
                        "title": _("Категории"),
                        "icon": "category",
                        "link": reverse_lazy("admin:shop_category_changelist"),
                    },
                    {
                        "title": _("Группы цветов"),
                        "icon": "palette",
                        "link": reverse_lazy("admin:shop_colorgroup_changelist"),
                    },
                    {
                        "title": _("Характеристики"),
                        "icon": "list",
                        "link": reverse_lazy("admin:shop_characteristic_changelist"),
                    },
                    {
                        "title": _("Категории характеристик"),
                        "icon": "folder_open",
                        "link": reverse_lazy("admin:shop_characteristiccategory_changelist"),
                    },
                    {
                        "title": _("Фичи (Особенности)"),
                        "icon": "verified",
                        "link": reverse_lazy("admin:shop_feature_changelist"),
                    },
                ],
            },
            {
                "title": _("Продажи"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Заказы"),
                        "icon": "shopping_cart",
                        "link": reverse_lazy("admin:shop_order_changelist"),
                        "badge": "shop.admin_utils.order_badge_callback",
                    },
                    {
                        "title": _("Корзины"),
                        "icon": "shopping_basket",
                        "link": reverse_lazy("admin:shop_cart_changelist"),
                    },
                    {
                        "title": _("Правила скидок"),
                        "icon": "local_offer",
                        "link": reverse_lazy("admin:shop_discountrule_changelist"),
                    },
                ],
            },
            {
                "title": _("Контент"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Статьи"),
                        "icon": "article",
                        "link": reverse_lazy("admin:shop_article_changelist"),
                    },
                    {
                        "title": _("Категории статей"),
                        "icon": "library_books",
                        "link": reverse_lazy("admin:shop_articlecategory_changelist"),
                    },
                    {
                        "title": _("Промо баннеры"),
                        "icon": "image",
                        "link": reverse_lazy("admin:shop_promobanner_changelist"),
                    },
                    {
                        "title": _("FAQ"),
                        "icon": "help",
                        "link": reverse_lazy("admin:shop_faqitem_changelist"),
                    },
                    {
                        "title": _("Инфо панели"),
                        "icon": "info",
                        "link": reverse_lazy("admin:shop_infopanel_changelist"),
                    },
                ],
            },
            {
                "title": _("Система"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Настройки магазина"),
                        "icon": "settings",
                        "link": reverse_lazy("admin:shop_shopsettings_changelist"),
                    },
                    {
                        "title": _("Резервные копии"),
                        "icon": "backup",
                        "link": reverse_lazy("admin:shop_backup_changelist"),
                    },
                    {
                        "title": _("Пользователи"),
                        "icon": "person",
                        "link": reverse_lazy("admin:auth_user_changelist"),
                    },
                    {
                        "title": _("Группы"),
                        "icon": "group",
                        "link": reverse_lazy("admin:auth_group_changelist"),
                    },
                ],
            },
        ],
    },
}
# --- Next.js Revalidation ---
NEXTJS_REVALIDATE_URL = os.environ.get("NEXTJS_REVALIDATE_URL", "http://frontend:3000/api/revalidate")
REVALIDATION_TOKEN = os.environ.get("REVALIDATION_TOKEN", "my-secret-token-123")

