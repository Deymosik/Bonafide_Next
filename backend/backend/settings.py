# backend/backend/settings.py - ФИНАЛЬНАЯ ЭТАЛОННАЯ ВЕРСИЯ
from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url

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
allowed_hosts_str = os.environ.get('ALLOWED_HOSTS_STR', '127.0.0.1,localhost')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',')]


# --- Приложения Django ---

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'whitenoise.runserver_nostatic',
    # Сторонние приложения
    'django_ckeditor_5',
    'rest_framework',
    'corsheaders',
    'imagekit',
    'django_cleanup.apps.CleanupConfig',
    'colorfield',
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
    'corsheaders.middleware.CorsMiddleware',
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


# --- Настройки для Django REST Framework и CORS ---

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
}

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

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# --- Прочие Настройки ---

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- Конфигурация для CKEditor 5 ---

CKEDITOR_5_UPLOAD_PATH = "uploads/"
CKEDITOR_5_CONFIGS = {
    'default': {
        'language': 'ru',
        'toolbar': ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', '|', 'imageUpload', '|', 'undo', 'redo'],
    },
    'extends': {
        'blockToolbar': [
            'paragraph', 'heading1', 'heading2', 'heading3', '|',
            'bulletedList', 'numberedList', '|', 'blockQuote',
        ],
        'toolbar': [
            'heading', '|', 'outdent', 'indent', '|', 'bold', 'italic', 'link', 'underline', 'strikethrough',
            'code','subscript', 'superscript', 'highlight', '|', 'codeBlock', 'sourceEditing', 'insertImage',
            'bulletedList', 'numberedList', 'todoList', '|',  'blockQuote', 'imageUpload', '|',
            'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', 'mediaEmbed', 'removeFormat',
            'insertTable',
        ],
        'image': {
            'toolbar': ['imageTextAlternative', '|', 'imageStyle:alignLeft', 'imageStyle:alignRight', 'imageStyle:alignCenter', 'imageStyle:side',  '|'],
            'styles': ['full', 'side', 'alignLeft', 'alignRight', 'alignCenter']
        },
        'table': {
            'contentToolbar': [ 'tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties' ],
            'tableProperties': {'borderColors': 'custom', 'backgroundColors': 'custom'},
            'tableCellProperties': {'borderColors': 'custom', 'backgroundColors': 'custom'}
        },
        'heading' : {
            'options': [
                { 'model': 'paragraph', 'title': 'Paragraph', 'class': 'ck-heading_paragraph' },
                { 'model': 'heading1', 'view': 'h1', 'title': 'Heading 1', 'class': 'ck-heading_heading1' },
                { 'model': 'heading2', 'view': 'h2', 'title': 'Heading 2', 'class': 'ck-heading_heading2' },
                { 'model': 'heading3', 'view': 'h3', 'title': 'Heading 3', 'class': 'ck-heading_heading3' }
            ]
        }
    },
    'list': {
        'properties': {
            'styles': 'true',
            'startIndex': 'true',
            'reversed': 'true',
        }
    }
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