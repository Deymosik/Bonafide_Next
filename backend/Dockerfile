# backend/Dockerfile

FROM python:3.11-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Создаем пользователя ДО копирования кода
RUN adduser --disabled-password --gecos "" appuser

# ИЗМЕНЕНИЕ: Копируем скрипт-помощник и сам код
COPY --chown=appuser:appuser entrypoint.sh /entrypoint.sh
COPY --chown=appuser:appuser . .

# Явно создаем папки для статики и медиа и отдаем их appuser
RUN mkdir -p /app/staticfiles /app/media && \
    chown -R appuser:appuser /app/staticfiles /app/media

# Указываем, что будем работать от имени appuser
USER appuser

# ИЗМЕНЕНИЕ: Указываем entrypoint, который будет выполняться первым
ENTRYPOINT ["/entrypoint.sh"]

# Команда по умолчанию, которая будет передана в entrypoint
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "backend.wsgi:application"]
