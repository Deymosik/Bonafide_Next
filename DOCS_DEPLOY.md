# 🚀 Инструкция по деплою (Production Deployment Guide)

Этот гайд поможет вам развернуть проект **BonaFide55** на чистом сервере (VPS) под управлением Ubuntu 20.04 / 22.04.

## 📋 1. Подготовка сервера

Зайдите на сервер по SSH:
```bash
ssh root@your-server-ip
```

### 1.1. Обновление системы и установка Docker
Выполните следующие команды по очереди:

```bash
# Обновляем пакеты
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git

# Устанавливаем Docker (официальный скрипт)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Проверяем, что Docker запустился
docker --version
docker compose version
```

## 📦 2. Настройка проекта

### 2.1. Клонирование репозитория
```bash
# Переходим в папку сайтов (опционально, можно в любое место)
mkdir -p /var/www
cd /var/www

# Клонируем проект (замените ссылку на свою)
git clone https://github.com/USERNAME/REPO_NAME.git bonafide
cd bonafide
```

### 2.2. Создание файла конфигурации (.env)
Создайте файл `.env` на основе примера:

```bash
cp backend/.env.example .env
nano .env
```

**Важные переменные для продакшена:**
```dotenv
# Django
DEBUG=False
SECRET_KEY=сложный_длинный_ключ_который_никому_нельзя_показывать
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
DJANGO_ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database (имена сервисов из docker-compose)
POSTGRES_DB=bonafide_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong_db_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis & Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Next.js (Frontend)
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# Название сайта (Fallback)
# Используется как "заглушка" при загрузке или если БД недоступна.
# Приоритет: Настройки в Админке > Эта переменная.
# Рекомендуется: установить такое же, как в админке.
NEXT_PUBLIC_SITE_NAME=BonaFide55

# Эти переменные жестко прописаны в docker-compose.yml для внутренней связи,
# но можно продублировать здесь:
DJANGO_API_URL=http://backend:8000
```

## 🔐 3. Настройка SSL (HTTPS)

Мы используем **Certbot** для получения бесплатных сертификатов Let's Encrypt.

### 3.1. Остановка Nginx (если запущен)
Чтобы Certbot мог проверить домен, порт 80 должен быть свободен.
```bash
docker compose down
```

### 3.2. Получение сертификата
Запустите временный контейнер certbot. **Замените `your-domain.com` на ваш домен!**

```bash
docker compose run --rm certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos --no-eff-email
```

Если всё прошло успешно, сертификаты появятся в папке `./nginx/ssl/live/your-domain.com/`.
Наш `docker-compose.yml` настроен так, чтобы Nginx искал их именно там (через volume mapping).

**Важно:** Убедитесь, что пути в `nginx/default.conf` соответствуют сгенерированным путям. Обычно это:
- `/etc/nginx/ssl/live/your-domain.com/fullchain.pem`
- `/etc/nginx/ssl/live/your-domain.com/privkey.pem`

## 🚀 4. Запуск

Запускаем всё в фоновом режиме:

```bash
docker compose up -d --build
```

### 4.1. Применение миграций и создание админа
```bash
# Применяем миграции БД
docker compose exec backend python manage.py migrate

# Собираем статику (для админки)
docker compose exec backend python manage.py collectstatic --noinput

# Создаем суперпользователя
docker compose exec backend python manage.py createsuperuser
```

Теперь ваш сайт должен быть доступен по адресу `https://your-domain.com`.

## 🛠 5. Обслуживание

### Как обновить код?
```bash
git pull                   # Скачать изменения
docker compose build       # Пересобрать контейнеры (особенно фронтенд)
docker compose up -d       # Перезапустить (без простоя для DB/Redis, если они не менялись)
```

### Как посмотреть логи?
```bash
docker compose logs -f           # Все логи
docker compose logs -f backend   # Только бэкенд
docker compose logs -f frontend  # Только фронтенд
```

### Автообновление SSL
Добавьте задачу в cron на хосте (напишите `crontab -e`):
```bash
0 3 * * * docker compose run --rm certbot renew --quiet && docker compose restart nginx

## ❓ 6. Устранение неполадок (Troubleshooting)

### Ошибка `TLS handshake timeout` при сборке
Если вы видите ошибку:
`failed to do request: Head "https://registry-1.docker.io/...": net/http: TLS handshake timeout`

Это означает, что сервер не может соединиться с Docker Hub (часто бывает в РФ или при нестабильном интернете).

**Решения:**
1.  **Повторите команду**. Часто это временный сбой.
2.  **Перезапустите Docker**: `sudo systemctl restart docker` и попробуйте снова.
3.  **Используйте зеркало (Mirror)**:
    Редактируйте конфиг Docker:
    ```bash
    sudo nano /etc/docker/daemon.json
    ```
    Добавьте (или создайте) секцию:
    ```json
    {
      "registry-mirrors": ["https://mirror.gcr.io"]
    }
    ```
    Затем перезапустите: `sudo systemctl restart docker`.

