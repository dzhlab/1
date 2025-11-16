# Структура проекта

## Архитектура монорепозитория

```
gymnastics-platform/
├── apps/
│   ├── api/                          # NestJS Backend API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # Аутентификация
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── users/            # Пользователи
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── competitions/     # Соревнования
│   │   │   │   │   ├── competitions.controller.ts
│   │   │   │   │   ├── competitions.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── competition.dto.ts
│   │   │   │   │       └── index.ts
│   │   │   │   ├── judges/           # Судьи
│   │   │   │   │   ├── judges.controller.ts
│   │   │   │   │   ├── judges.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── judge.dto.ts
│   │   │   │   │       └── index.ts
│   │   │   │   ├── participants/     # Участники
│   │   │   │   │   ├── participants.controller.ts
│   │   │   │   │   ├── participants.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── scoring/          # Судейство
│   │   │   │   │   ├── scoring.controller.ts
│   │   │   │   │   ├── scoring.service.ts
│   │   │   │   │   ├── calculation.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── ranking/          # Ранжирование
│   │   │   │   │   ├── ranking.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── websocket/        # WebSocket
│   │   │   │   │   ├── events.gateway.ts
│   │   │   │   │   └── events.module.ts
│   │   │   │   ├── prisma/           # Prisma
│   │   │   │   │   ├── prisma.service.ts
│   │   │   │   │   └── prisma.module.ts
│   │   │   │   └── graphql/          # GraphQL (опционально)
│   │   │   │       ├── resolvers/
│   │   │   │       └── schema.graphql
│   │   │   └── common/
│   │   │       ├── decorators/
│   │   │       ├── filters/
│   │   │       ├── guards/
│   │   │       ├── interceptors/
│   │   │       └── pipes/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   ├── .env.example
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── nest-cli.json
│   │
│   └── web/                          # Next.js Frontend
│       ├── src/
│       │   ├── app/                  # App Router
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── competitions/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── [id]/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── judges/
│       │   │   │   │   ├── participants/
│       │   │   │   │   ├── scoring/
│       │   │   │   │   └── results/
│       │   │   │   └── new/
│       │   │   ├── login/
│       │   │   ├── dashboard/
│       │   │   └── api/              # API routes (if needed)
│       │   ├── components/
│       │   │   ├── Competitions/
│       │   │   │   ├── CompetitionCreator.tsx
│       │   │   │   ├── CompetitionList.tsx
│       │   │   │   ├── CompetitionCard.tsx
│       │   │   │   ├── JudgeManagement.tsx
│       │   │   │   └── LogoUpload.tsx
│       │   │   ├── Results/
│       │   │   │   ├── RankingTable.tsx
│       │   │   │   ├── PodiumView.tsx
│       │   │   │   └── ResultsExport.tsx
│       │   │   ├── Scoring/
│       │   │   │   ├── ScoreForm.tsx
│       │   │   │   ├── ScorePanel.tsx
│       │   │   │   └── JudgePanel.tsx
│       │   │   ├── Common/
│       │   │   │   ├── Header.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   ├── Modal.tsx
│       │   │   │   ├── Button.tsx
│       │   │   │   └── LoadingSpinner.tsx
│       │   │   └── Auth/
│       │   │       ├── LoginForm.tsx
│       │   │       └── ProtectedRoute.tsx
│       │   ├── hooks/
│       │   │   ├── useSocket.ts
│       │   │   ├── useAuth.ts
│       │   │   ├── useCompetition.ts
│       │   │   └── useScoring.ts
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   ├── constants.ts
│       │   │   └── utils.ts
│       │   ├── store/                # Zustand stores
│       │   │   ├── authStore.ts
│       │   │   ├── competitionStore.ts
│       │   │   └── scoringStore.ts
│       │   ├── types/
│       │   │   ├── competition.ts
│       │   │   ├── judge.ts
│       │   │   ├── score.ts
│       │   │   └── index.ts
│       │   └── styles/
│       │       ├── globals.css
│       │       └── theme.css
│       ├── public/
│       │   ├── images/
│       │   └── icons/
│       ├── .env.local.example
│       ├── tsconfig.json
│       ├── next.config.js
│       ├── package.json
│       └── tailwind.config.js
│
├── packages/                         # Shared packages
│   ├── shared/                       # Shared code
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── ui/                          # Shared UI components
│   │   ├── src/
│   │   │   └── components/
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/                      # Shared config
│       ├── eslint-config/
│       ├── tsconfig/
│       └── prettier-config/
│
├── prisma/                          # Database
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docker/                          # Docker configs
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── nginx.conf
│
├── .github/                         # CI/CD
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       └── tests.yml
│
├── docs/                            # Documentation
│   ├── api/
│   ├── architecture/
│   └── deployment/
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .gitignore
├── .env.example
├── package.json                     # Root package.json
├── pnpm-workspace.yaml
├── turbo.json                       # Turborepo config
└── README.md
```

## Технологии

### Backend (apps/api)
- **Framework**: NestJS 10.x
- **Runtime**: Node.js 20.x
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 16
- **Real-time**: Socket.io 4.x
- **API**: REST + GraphQL (Apollo)
- **Validation**: class-validator, class-transformer
- **Auth**: JWT, Passport
- **File Storage**: AWS S3 / MinIO
- **Excel**: ExcelJS
- **Testing**: Jest, Supertest

### Frontend (apps/web)
- **Framework**: Next.js 14.x (App Router)
- **Runtime**: Node.js 20.x
- **UI Library**: React 18.x
- **Language**: TypeScript 5.x
- **State Management**: Zustand + TanStack Query (React Query)
- **Styling**: Tailwind CSS 3.x + CSS Variables
- **Forms**: React Hook Form + Zod
- **Real-time**: Socket.io Client 4.x
- **Drag & Drop**: dnd-kit
- **Charts**: Recharts / Chart.js
- **Testing**: Jest, React Testing Library, Playwright

### Infrastructure
- **Package Manager**: pnpm
- **Monorepo**: Turborepo
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry
- **Logging**: Winston (Backend), Pino (Frontend)

## Переменные окружения

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gymnastics"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# S3/MinIO
S3_ENDPOINT="http://localhost:9000"  # For MinIO, leave empty for AWS
S3_REGION="us-east-1"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_NAME="gymnastics-logos"

# Server
PORT=4000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:3000"

# WebSocket
WS_PORT=4000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WS_URL="ws://localhost:4000"
```

## Скрипты

### Root package.json
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "db:migrate": "cd apps/api && pnpm prisma migrate dev",
    "db:generate": "cd apps/api && pnpm prisma generate",
    "db:seed": "cd apps/api && pnpm prisma db seed",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  }
}
```

### API package.json
```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  }
}
```

### Web package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test"
  }
}
```

## Запуск проекта

### Development
```bash
# Установка зависимостей
pnpm install

# Генерация Prisma клиента
pnpm db:generate

# Запуск миграций
pnpm db:migrate

# Заполнение БД тестовыми данными
pnpm db:seed

# Запуск всех сервисов
pnpm dev

# Или через Docker
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
# Сборка
pnpm build

# Запуск через Docker
docker-compose up -d
```

## Endpoints

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **GraphQL Playground**: http://localhost:4000/graphql
- **WebSocket**: ws://localhost:4000
- **MinIO Console**: http://localhost:9001
- **PostgreSQL**: localhost:5432

## База данных

### Миграции
```bash
# Создать новую миграцию
cd apps/api
pnpm prisma migrate dev --name migration_name

# Применить миграции
pnpm prisma migrate deploy

# Сбросить БД
pnpm prisma migrate reset
```

### Seed
```bash
cd apps/api
pnpm prisma db seed
```

## Тестирование

### Unit tests
```bash
# Backend
cd apps/api
pnpm test

# Frontend
cd apps/web
pnpm test
```

### E2E tests
```bash
cd apps/web
pnpm test:e2e
```

## Деплой

### Docker Production
```bash
docker-compose build
docker-compose up -d
```

### Manual Deploy
```bash
# Backend
cd apps/api
pnpm build
pm2 start dist/main.js --name api

# Frontend
cd apps/web
pnpm build
pm2 start npm --name web -- start
```
