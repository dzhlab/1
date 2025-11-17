# Gymnastics Competition Platform API

Backend API для платформы управления соревнованиями по художественной гимнастике.

## Возможности

- Управление соревнованиями
- Управление участниками и судьями
- Система судейства с real-time обновлениями
- Управление группами и потоками
- Автоматический расчет расписания
- Генерация протоколов

## Технологии

- NestJS 10
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Socket.io для WebSocket
- Swagger/OpenAPI документация

## Установка

```bash
# Установить зависимости
npm install

# Скопировать .env.example в .env
cp .env.example .env

# Генерация Prisma клиента
npm run prisma:generate

# Запустить миграции
npm run prisma:migrate
```

## Запуск

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

После запуска доступна по адресу: http://localhost:4000/api/docs

## Основные endpoints

- `/api/auth/*` - Аутентификация
- `/api/competitions/*` - Соревнования
- `/api/participants/*` - Участники
- `/api/judges/*` - Судьи
- `/api/groups/*` - Группы и потоки
- `/api/scoring/*` - Судейство и оценки

## База данных

Проект использует PostgreSQL с Prisma ORM.

### Миграции

```bash
# Создать миграцию
npm run prisma:migrate -- --name migration_name

# Применить миграции
npm run prisma:migrate

# Prisma Studio
npm run prisma:studio
```

## Тестирование

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```
