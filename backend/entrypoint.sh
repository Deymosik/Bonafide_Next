#!/bin/sh

# Эта команда меняет владельца папок на пользователя appuser
# Она будет выполнена перед запуском основного приложения
chown -R appuser:appuser /app/staticfiles /app/media

# Эта строка передает управление основной команде, 
# которая указана в docker-compose (т.е. gunicorn)
exec "$@"
