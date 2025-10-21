# Docker Setup для MasterCRM Frontend

## Настройка автоматического деплоя в Docker Hub

### 1. Настройка секретов в GitHub

Перейди в настройки репозитория GitHub:
1. Settings → Secrets and variables → Actions
2. Добавь следующие секреты:
   - `DOCKER_USERNAME` - твой логин в Docker Hub
   - `DOCKER_PASSWORD` - твой пароль или токен доступа в Docker Hub

### 2. Создание токена доступа в Docker Hub (рекомендуется)

1. Зайди в Docker Hub → Account Settings → Security
2. Создай новый Access Token
3. Используй этот токен вместо пароля в секрете `DOCKER_PASSWORD`

### 3. Локальная разработка

#### Сборка и запуск контейнера:
```bash
# Сборка образа
docker build -t mastercrm-frontend .

# Запуск контейнера
docker run -p 3003:3003 mastercrm-frontend

# Или используй docker-compose
docker-compose up --build
```

#### Остановка:
```bash
docker-compose down
```

### 4. Автоматический деплой

После настройки секретов, при каждом пуше в ветку `main` или `master`:
1. GitHub Actions автоматически соберет Docker образ
2. Отправит его в Docker Hub
3. Образ будет доступен как `твой-логин/mastercrm-frontend:latest`

### 5. Использование образа

После деплоя можешь использовать образ:
```bash
docker pull твой-логин/mastercrm-frontend:latest
docker run -p 3003:3003 твой-логин/mastercrm-frontend:latest
```

### 6. Структура файлов

- `Dockerfile` - конфигурация для сборки образа
- `.dockerignore` - файлы, исключаемые из образа
- `docker-compose.yml` - для локальной разработки
- `.github/workflows/` - автоматический деплой

### 7. Полезные команды

```bash
# Просмотр логов
docker logs mastercrm-frontend

# Вход в контейнер
docker exec -it mastercrm-frontend sh

# Очистка неиспользуемых образов
docker system prune -a
```
