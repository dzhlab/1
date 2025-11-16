# Руководство по реализации платформы соревнований по художественной гимнастике

## Обзор

Эта документация содержит полную реализацию enterprise-архитектуры для платформы управления соревнованиями по художественной гимнастике с поддержкой FIG 2025-2028 Code of Points.

## Структура файлов

### Документация
- `ARCHITECTURE.md` - Общая архитектура системы, технологический стек, API endpoints
- `PROJECT_STRUCTURE.md` - Детальная структура монорепозитория, скрипты, переменные окружения
- `IMPLEMENTATION_GUIDE.md` - Данный файл, руководство по реализации

### Backend Examples (apps/api)
```
backend-examples/
├── competitions.controller.ts   # REST API контроллер для соревнований
├── competitions.service.ts      # Бизнес-логика соревнований, S3 интеграция
├── judges.service.ts            # Управление судьями, Excel import/export
├── ranking.service.ts           # Алгоритмы ранжирования FIG 2025-2028
├── events.gateway.ts            # WebSocket gateway для real-time
└── dto/
    ├── competition.dto.ts       # DTOs для соревнований
    ├── judge.dto.ts             # DTOs для судей
    └── index.ts                 # Экспорт всех DTOs
```

### Frontend Examples (apps/web)
```
frontend-examples/
├── CompetitionCreator.tsx       # Multi-step форма создания соревнования
├── JudgeManagement.tsx          # CRUD управление судьями + drag-and-drop
├── RankingTable.tsx             # Турнирная таблица с live updates
├── LogoUpload.tsx               # Загрузка логотипа с preview
├── useSocket.ts                 # React hooks для WebSocket
└── api.ts                       # Axios клиент с interceptors
```

### Infrastructure
```
docker/
├── api.Dockerfile               # Multi-stage Dockerfile для API
├── web.Dockerfile               # Multi-stage Dockerfile для Web
└── nginx.conf                   # Nginx reverse proxy конфигурация

docker-compose.yml               # Production конфигурация
docker-compose.dev.yml           # Development конфигурация с hot reload
```

### Database
```
prisma/
└── schema.prisma                # Полная схема БД с индексами и relations
```

## Пошаговая реализация

### Этап 1: Инициализация проекта

#### 1.1 Создание монорепозитория
```bash
# Создать корневую директорию
mkdir gymnastics-platform
cd gymnastics-platform

# Инициализировать package.json
pnpm init

# Установить Turborepo
pnpm add -D turbo

# Создать структуру
mkdir -p apps/api apps/web packages/shared packages/ui packages/config
```

#### 1.2 Настройка Turborepo
Создать `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

Создать `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Этап 2: Backend Setup

#### 2.1 Инициализация NestJS
```bash
cd apps/api
pnpm init
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express
pnpm add -D @nestjs/cli @nestjs/serde @nestjs/testing
pnpm add -D typescript @types/node ts-node
```

#### 2.2 Установка зависимостей
```bash
# ORM и Database
pnpm add @prisma/client
pnpm add -D prisma

# Validation
pnpm add class-validator class-transformer

# WebSocket
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io

# GraphQL (опционально)
pnpm add @nestjs/graphql @nestjs/apollo @apollo/server graphql

# S3 для логотипов
pnpm add @aws-sdk/client-s3

# Excel обработка
pnpm add exceljs

# Auth
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
pnpm add -D @types/passport-jwt @types/bcrypt

# Config
pnpm add @nestjs/config

# CORS
pnpm add cors
pnpm add -D @types/cors
```

#### 2.3 Копирование backend examples
```bash
# Скопировать файлы из backend-examples в структуру проекта
cp backend-examples/competitions.controller.ts src/modules/competitions/
cp backend-examples/competitions.service.ts src/modules/competitions/
cp backend-examples/judges.service.ts src/modules/judges/
cp backend-examples/ranking.service.ts src/modules/ranking/
cp backend-examples/events.gateway.ts src/modules/websocket/
cp -r backend-examples/dto/* src/modules/competitions/dto/
```

#### 2.4 Настройка Prisma
```bash
# Скопировать schema.prisma
cp ../../prisma/schema.prisma ./prisma/

# Сгенерировать клиент
pnpm prisma generate

# Создать миграцию
pnpm prisma migrate dev --name init
```

### Этап 3: Frontend Setup

#### 3.1 Инициализация Next.js
```bash
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --app --src-dir
```

#### 3.2 Установка зависимостей
```bash
# State Management
pnpm add zustand @tanstack/react-query

# Forms
pnpm add react-hook-form @hookform/resolvers zod

# WebSocket
pnpm add socket.io-client

# HTTP Client
pnpm add axios

# Drag and Drop
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# UI utilities
pnpm add clsx tailwind-merge

# Icons (опционально)
pnpm add lucide-react
```

#### 3.3 Копирование frontend examples
```bash
# Скопировать компоненты
cp ../../frontend-examples/CompetitionCreator.tsx src/components/Competitions/
cp ../../frontend-examples/JudgeManagement.tsx src/components/Competitions/
cp ../../frontend-examples/RankingTable.tsx src/components/Results/
cp ../../frontend-examples/LogoUpload.tsx src/components/Competitions/

# Скопировать хуки и утилиты
cp ../../frontend-examples/useSocket.ts src/hooks/
cp ../../frontend-examples/api.ts src/lib/
```

### Этап 4: Database Setup

#### 4.1 Запуск PostgreSQL через Docker
```bash
# Вернуться в корень проекта
cd ../..

# Запустить только БД
docker-compose -f docker-compose.dev.yml up postgres -d

# Проверить подключение
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "SELECT 1"
```

#### 4.2 Применить миграции
```bash
cd apps/api
pnpm prisma migrate deploy

# Или для разработки
pnpm prisma migrate dev
```

#### 4.3 Seed database (опционально)
Создать `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Создать тестовых судей
  const judges = await Promise.all([
    prisma.judge.create({
      data: {
        fullName: 'Иванова Анна Петровна',
        city: 'Москва',
        region: 'Москва',
        category: 'INTERNATIONAL',
        title: 'МСМК',
      },
    }),
    // ... другие судьи
  ]);

  // Создать тестовое соревнование
  const competition = await prisma.competition.create({
    data: {
      name: 'Чемпионат России 2025',
      startDate: new Date('2025-03-15'),
      endDate: new Date('2025-03-17'),
      days: 3,
      city: 'Москва',
      venue: 'Спорткомплекс "Лужники"',
      organizer: 'Федерация художественной гимнастики России',
      contactName: 'Петрова Мария Ивановна',
      contactPhone: '+7 (495) 123-45-67',
      category: 'SENIOR',
      disciplines: {
        create: [
          { discipline: 'ROPE' },
          { discipline: 'HOOP' },
          { discipline: 'BALL' },
          { discipline: 'CLUBS' },
          { discipline: 'RIBBON' },
        ],
      },
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Запустить:
```bash
pnpm prisma db seed
```

### Этап 5: Интеграция модулей

#### 5.1 Создать AppModule (apps/api/src/app.module.ts)
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { JudgesModule } from './modules/judges/judges.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CompetitionsModule,
    JudgesModule,
    RankingModule,
    WebSocketModule,
  ],
})
export class AppModule {}
```

#### 5.2 Создать модули для каждой сущности
См. структуру в `PROJECT_STRUCTURE.md`

### Этап 6: Запуск и тестирование

#### 6.1 Development режим
```bash
# Запустить всё через Docker
docker-compose -f docker-compose.dev.yml up

# Или запустить локально
cd apps/api
pnpm dev

# В другом терминале
cd apps/web
pnpm dev
```

#### 6.2 Проверка endpoints
```bash
# Health check
curl http://localhost:4000/health

# Получить соревнования
curl http://localhost:4000/api/competitions

# WebSocket
wscat -c ws://localhost:4000/socket.io
```

### Этап 7: Production Deploy

#### 7.1 Настройка переменных окружения
Создать `.env` в корне:
```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong-password-here
POSTGRES_DB=gymnastics

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# S3/MinIO
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=strong-password-here

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

#### 7.2 Build и Deploy
```bash
# Сборка образов
docker-compose build

# Запуск в production
docker-compose up -d

# Проверка логов
docker-compose logs -f

# Применить миграции
docker-compose exec api pnpm prisma migrate deploy
```

## Ключевые особенности реализации

### 1. Ranking Algorithm (FIG 2025-2028)
Реализован в `ranking.service.ts`:
- Поддержка тайбрейка по компонентам (E > A > D)
- Два режима пропуска позиций (1-1-2 vs 1-1-3)
- Два метода расчета D-оценки (Российское правило vs Сумма)

### 2. Real-time Updates
WebSocket интеграция:
- Автоматическая синхронизация при изменении оценок
- Live обновление турнирной таблицы
- Комнаты для каждого соревнования
- Reconnection logic

### 3. Excel Import/Export
Реализовано в `judges.service.ts`:
- Импорт судей из Excel с валидацией
- Экспорт с форматированием и стилями
- Обработка ошибок с детальными отчетами

### 4. File Upload
S3/MinIO интеграция:
- Валидация типов файлов (PNG/JPG/SVG)
- Ограничение размера (2MB)
- Preview перед загрузкой
- Автоматическое удаление старых файлов

### 5. Multi-step Forms
React Hook Form + Zod:
- Пошаговая валидация
- Сохранение состояния между шагами
- Автоматический расчет (например, количества дней)

## Расширение функционала

### Добавление новых модулей

#### Пример: Модуль участников
```bash
cd apps/api/src/modules
mkdir participants
cd participants

# Создать файлы
touch participants.controller.ts
touch participants.service.ts
touch participants.module.ts
mkdir dto
```

Реализовать по аналогии с `competitions.controller.ts` и `competitions.service.ts`.

### Добавление GraphQL

#### 1. Создать schema.graphql
```graphql
type Query {
  competitions: [Competition!]!
  competition(id: ID!): Competition
}

type Mutation {
  createCompetition(input: CreateCompetitionInput!): Competition!
}

type Subscription {
  competitionUpdated(id: ID!): Competition!
}
```

#### 2. Создать резолверы
См. NestJS GraphQL документацию

## Тестирование

### Unit Tests
```bash
# Backend
cd apps/api
pnpm test

# Frontend
cd apps/web
pnpm test
```

### E2E Tests
```bash
cd apps/web
pnpm test:e2e
```

### Примеры тестов
См. `apps/api/test/` и `apps/web/__tests__/`

## Мониторинг и Логирование

### Sentry Integration
```bash
pnpm add @sentry/node @sentry/nextjs
```

Настроить в `main.ts` и `next.config.js`

### Winston Logger
```bash
pnpm add winston nest-winston
```

## Безопасность

### Checklist
- [x] JWT аутентификация
- [x] CORS настройки
- [x] Rate limiting (Nginx)
- [x] Input validation (class-validator)
- [x] SQL injection защита (Prisma)
- [x] XSS защита (React)
- [x] File upload validation
- [x] HTTPS (production)
- [x] Helmet headers (Nginx)

## Производительность

### Оптимизации
- [x] Database индексы (Prisma schema)
- [x] Query optimization
- [x] Caching (Redis опционально)
- [x] CDN для статики
- [x] Image optimization (Next.js)
- [x] Code splitting (Next.js)
- [x] Gzip compression (Nginx)

## Поддержка

### Полезные команды
```bash
# Перезапустить сервисы
docker-compose restart

# Посмотреть логи
docker-compose logs -f api
docker-compose logs -f web

# Подключиться к БД
docker-compose exec postgres psql -U postgres -d gymnastics

# Backup БД
docker-compose exec postgres pg_dump -U postgres gymnastics > backup.sql

# Restore БД
docker-compose exec -T postgres psql -U postgres gymnastics < backup.sql
```

## Roadmap

### Фаза 1 (MVP) ✅
- [x] Создание соревнований
- [x] Управление судьями
- [x] Загрузка логотипов
- [x] Настройки ранжирования
- [x] Real-time обновления

### Фаза 2
- [ ] Управление участниками
- [ ] Ввод оценок
- [ ] Расчет результатов
- [ ] Протоколы
- [ ] Экспорт отчетов

### Фаза 3
- [ ] Онлайн табло
- [ ] Мобильное приложение (React Native)
- [ ] Видео интеграция
- [ ] Статистика и аналитика

## Заключение

Данная реализация предоставляет полную enterprise-архитектуру для платформы управления соревнованиями по художественной гимнастике с поддержкой всех современных стандартов и best practices.

Все примеры кода готовы к использованию и требуют только интеграции в финальную структуру проекта согласно `PROJECT_STRUCTURE.md`.
