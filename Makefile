# Makefile для Universal Shop Project

# Переменные
DOCKER_COMPOSE = docker-compose

# Помощь
.PHONY: help
help:
	@echo "🛠️  Доступные команды:"
	@echo "--------------------------------------------------------"
	@echo "  make build      - Собрать/Пересобрать контейнеры"
	@echo "  make up         - Запустить проект (в фоне)"
	@echo "  make down       - Остановить проект"
	@echo "  make restart    - Перезапустить проект"
	@echo "  make logs       - Смотреть логи всех сервисов"
	@echo "  make logs-back  - Смотреть логи бэкенда"
	@echo "  make logs-front - Смотреть логи фронтенда"
	@echo "  make shell-back - Зайти в консоль контейнера Backend"
	@echo "  make migrate    - Применить миграции БД"
	@echo "  make superuser  - Создать суперпользователя Django"
	@echo "--------------------------------------------------------"

# Сборка и запуск
.PHONY: build
build:
	$(DOCKER_COMPOSE) build

.PHONY: up
up:
	$(DOCKER_COMPOSE) up -d

.PHONY: start
start: up

.PHONY: down
down:
	$(DOCKER_COMPOSE) down

.PHONY: restart
restart: down up

.PHONY: deploy
deploy: build up
	@echo "🚀 Проект успешно развернут!"

# Логи
.PHONY: logs
logs:
	$(DOCKER_COMPOSE) logs -f

.PHONY: logs-back
logs-back:
	$(DOCKER_COMPOSE) logs -f backend

.PHONY: logs-front
logs-front:
	$(DOCKER_COMPOSE) logs -f frontend

# Утилиты
.PHONY: shell-back
shell-back:
	docker exec -it bonafide_backend bash

.PHONY: migrate
migrate:
	docker exec -it bonafide_backend python manage.py migrate

.PHONY: superuser
superuser:
	docker exec -it bonafide_backend python manage.py createsuperuser
