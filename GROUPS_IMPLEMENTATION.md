# Руководство по интеграции модуля "Группы и потоки"

## Обзор

Этот документ содержит полное руководство по интеграции enterprise-реализации модуля "Группы и потоки" для платформы управления соревнованиями по художественной гимнастике.

## Созданные файлы

### Backend (NestJS + Prisma)

```
groups-backend/
├── groups.controller.ts       # REST API контроллер с 30+ endpoints
├── groups.service.ts          # Бизнес-логика групп
├── athletes.service.ts        # Управление участниками
├── streams.service.ts         # Управление потоками
├── draw.service.ts            # Алгоритмы жеребьёвки (4 стратегии)
├── excel.service.ts           # Import/Export Excel
├── groups.gateway.ts          # WebSocket gateway для real-time
└── dto/
    ├── group.dto.ts           # DTOs для групп
    ├── athlete.dto.ts         # DTOs для участников
    ├── draw.dto.ts            # DTOs для жеребьёвки
    ├── stream.dto.ts          # DTOs для потоков
    └── index.ts               # Экспорт всех DTOs
```

### Frontend (React + TypeScript)

```
frontend-examples/
├── GroupForm.tsx              # Multi-step форма создания группы
├── AthletesTable.tsx          # Таблица с drag-and-drop
├── StreamsPanel.tsx           # Панель управления потоками
├── DrawModal.tsx              # Модальное окно жеребьёвки
├── groupsStore.ts             # Zustand store
└── useGroups.ts               # React Query hooks
```

### Database Schema

```
prisma/
└── groups-schema.prisma       # Полная схема БД
```

## Пошаговая интеграция

### Шаг 1: Установка зависимостей

#### Backend

```bash
cd apps/api

# Core dependencies
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express
pnpm add @prisma/client class-validator class-transformer
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add exceljs

# Dev dependencies
pnpm add -D @nestjs/cli prisma typescript @types/node
```

#### Frontend

```bash
cd apps/web

# Core dependencies
pnpm add react react-dom next
pnpm add zustand @tanstack/react-query
pnpm add react-hook-form @hookform/resolvers zod
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add axios socket.io-client

# Dev dependencies
pnpm add -D typescript @types/react @types/node
```

### Шаг 2: Интеграция Prisma Schema

#### 2.1 Добавить схему в prisma/schema.prisma

```bash
# Скопировать содержимое из prisma/groups-schema.prisma
# в ваш основной prisma/schema.prisma
```

#### 2.2 Применить миграции

```bash
cd apps/api
pnpm prisma migrate dev --name add_groups_module
pnpm prisma generate
```

### Шаг 3: Интеграция Backend

#### 3.1 Создать структуру модулей

```bash
cd apps/api/src/modules
mkdir -p groups athletes streams draw excel websocket
```

#### 3.2 Скопировать файлы

```bash
# Groups module
cp ../../../groups-backend/groups.controller.ts modules/groups/
cp ../../../groups-backend/groups.service.ts modules/groups/
cp -r ../../../groups-backend/dto modules/groups/

# Athletes module
cp ../../../groups-backend/athletes.service.ts modules/athletes/

# Streams module
cp ../../../groups-backend/streams.service.ts modules/streams/

# Draw module
cp ../../../groups-backend/draw.service.ts modules/draw/

# Excel module
cp ../../../groups-backend/excel.service.ts modules/excel/

# WebSocket module
cp ../../../groups-backend/groups.gateway.ts modules/websocket/
```

#### 3.3 Создать модульные файлы

**modules/groups/groups.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { AthletesService } from '../athletes/athletes.service';
import { StreamsService } from '../streams/streams.service';
import { DrawService } from '../draw/draw.service';
import { ExcelService } from '../excel/excel.service';
import { GroupsGateway } from '../websocket/groups.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    AthletesService,
    StreamsService,
    DrawService,
    ExcelService,
    GroupsGateway,
  ],
  exports: [GroupsService],
})
export class GroupsModule {}
```

**modules/athletes/athletes.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { AthletesService } from './athletes.service';
import { GroupsModule } from '../groups/groups.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, GroupsModule],
  providers: [AthletesService],
  exports: [AthletesService],
})
export class AthletesModule {}
```

**modules/streams/streams.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { StreamsService } from './streams.service';
import { GroupsModule } from '../groups/groups.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, GroupsModule],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
```

**modules/draw/draw.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { DrawService } from './draw.service';
import { GroupsModule } from '../groups/groups.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, GroupsModule],
  providers: [DrawService],
  exports: [DrawService],
})
export class DrawModule {}
```

**modules/excel/excel.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { GroupsModule } from '../groups/groups.module';
import { AthletesModule } from '../athletes/athletes.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, GroupsModule, AthletesModule],
  providers: [ExcelService],
  exports: [ExcelService],
})
export class ExcelModule {}
```

**modules/websocket/websocket.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { GroupsGateway } from './groups.gateway';

@Module({
  providers: [GroupsGateway],
  exports: [GroupsGateway],
})
export class WebSocketModule {}
```

#### 3.4 Обновить AppModule

```typescript
// apps/api/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { GroupsModule } from './modules/groups/groups.module';
import { AthletesModule } from './modules/athletes/athletes.module';
import { StreamsModule } from './modules/streams/streams.module';
import { DrawModule } from './modules/draw/draw.module';
import { ExcelModule } from './modules/excel/excel.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GroupsModule,
    AthletesModule,
    StreamsModule,
    DrawModule,
    ExcelModule,
    WebSocketModule,
  ],
})
export class AppModule {}
```

### Шаг 4: Интеграция Frontend

#### 4.1 Создать структуру

```bash
cd apps/web/src
mkdir -p components/Groups stores hooks lib
```

#### 4.2 Скопировать файлы

```bash
# Components
cp ../../../frontend-examples/GroupForm.tsx components/Groups/
cp ../../../frontend-examples/AthletesTable.tsx components/Groups/
cp ../../../frontend-examples/StreamsPanel.tsx components/Groups/
cp ../../../frontend-examples/DrawModal.tsx components/Groups/

# Store
cp ../../../frontend-examples/groupsStore.ts stores/

# Hooks
cp ../../../frontend-examples/useGroups.ts hooks/
```

#### 4.3 Создать API клиент

**lib/api.ts:**

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### 4.4 Настроить React Query

**app/providers.tsx:**

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**app/layout.tsx:**

```typescript
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

#### 4.5 Создать WebSocket hook

**hooks/useSocket.ts:**

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useSocket = (groupId?: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    socketRef.current = io(`${SOCKET_URL}/groups`, {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket connected');

      // Subscribe to group if groupId provided
      if (groupId) {
        socket.emit('subscribe:group', { groupId });
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      if (groupId) {
        socket.emit('unsubscribe:group', { groupId });
      }
      socket.disconnect();
    };
  }, [groupId]);

  const subscribe = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
  };

  const unsubscribe = (event: string, callback?: (data: any) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback);
    } else {
      socketRef.current?.off(event);
    }
  };

  return { socket: socketRef.current, subscribe, unsubscribe };
};
```

### Шаг 5: Использование компонентов

#### Пример страницы управления группой

**app/groups/[id]/page.tsx:**

```typescript
'use client';

import { useState } from 'react';
import { useGroup } from '@/hooks/useGroups';
import { useSocket } from '@/hooks/useSocket';
import { AthletesTable } from '@/components/Groups/AthletesTable';
import { StreamsPanel } from '@/components/Groups/StreamsPanel';
import { DrawModal } from '@/components/Groups/DrawModal';

export default function GroupPage({ params }: { params: { id: string } }) {
  const { data: group, isLoading } = useGroup(params.id);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const { subscribe, unsubscribe } = useSocket(params.id);

  // Subscribe to real-time events
  useEffect(() => {
    const handleAthleteAdded = (data: any) => {
      console.log('Athlete added:', data);
      // Data will be updated automatically via React Query
    };

    subscribe('athlete:added', handleAthleteAdded);

    return () => {
      unsubscribe('athlete:added', handleAthleteAdded);
    };
  }, [subscribe, unsubscribe]);

  if (isLoading) return <div>Loading...</div>;
  if (!group) return <div>Group not found</div>;

  return (
    <div className="group-page">
      <header>
        <h1>{group.name}</h1>
        <button onClick={() => setShowDrawModal(true)}>Жеребьёвка</button>
      </header>

      <div className="group-content">
        <section>
          <h2>Участники</h2>
          <AthletesTable groupId={params.id} athletes={group.athletes} />
        </section>

        <section>
          <h2>Потоки</h2>
          <StreamsPanel
            groupId={params.id}
            streams={group.streams}
            performanceDuration={group.performanceDuration}
          />
        </section>
      </div>

      <DrawModal
        groupId={params.id}
        isOpen={showDrawModal}
        onClose={() => setShowDrawModal(false)}
      />
    </div>
  );
}
```

## API Endpoints

### Groups

```
GET    /api/groups                    # Получить все группы
GET    /api/groups/:id                # Получить группу по ID
POST   /api/groups                    # Создать группу
PUT    /api/groups/:id                # Обновить группу
DELETE /api/groups/:id                # Удалить группу
POST   /api/groups/:id/duplicate      # Дублировать группу
GET    /api/groups/:id/statistics     # Статистика группы
GET    /api/groups/:id/history        # История изменений
```

### Athletes

```
POST   /api/groups/:groupId/athletes                    # Создать участника
PUT    /api/groups/:groupId/athletes/:id                # Обновить участника
DELETE /api/groups/:groupId/athletes/:id                # Удалить участника
POST   /api/groups/:groupId/athletes/:id/move           # Переместить вверх/вниз
POST   /api/groups/:groupId/athletes/:id/reorder        # Переместить на позицию
POST   /api/groups/:groupId/athletes/reorder/bulk       # Массовое изменение порядка
DELETE /api/groups/:groupId/athletes                    # Очистить всех
```

### Draw

```
POST   /api/groups/:groupId/draw                        # Выполнить жеребьёвку
GET    /api/groups/:groupId/draw/history                # История жеребьёвок
```

### Streams

```
POST   /api/groups/:groupId/streams/generate            # Генерировать потоки
PUT    /api/groups/:groupId/streams/:id                 # Обновить поток
DELETE /api/groups/:groupId/streams/:id                 # Удалить поток
DELETE /api/groups/:groupId/streams                     # Удалить все потоки
POST   /api/groups/:groupId/streams/:streamId/athletes  # Назначить участника в поток
DELETE /api/groups/:groupId/athletes/:athleteId/stream  # Удалить из потока
GET    /api/groups/:groupId/streams/statistics          # Статистика потоков
```

### Excel

```
POST   /api/groups/:groupId/import                      # Импорт из Excel
GET    /api/groups/:groupId/export                      # Экспорт в Excel
GET    /api/groups/import/template                      # Скачать шаблон
```

## WebSocket Events

### Emit (Server -> Client)

```typescript
// Groups
'group:created'      { group, timestamp }
'group:updated'      { group, timestamp }
'group:deleted'      { groupId, timestamp }

// Athletes
'athlete:added'      { athlete, timestamp }
'athlete:updated'    { athlete, timestamp }
'athlete:deleted'    { athleteId, timestamp }
'athletes:reordered' { athletes, timestamp }
'athletes:cleared'   { groupId, timestamp }

// Draw
'draw:started'       { strategy, timestamp }
'draw:completed'     { result, timestamp }

// Streams
'streams:generated'  { streams, timestamp }
'stream:updated'     { stream, timestamp }
'stream:deleted'     { streamId, timestamp }
'streams:cleared'    { groupId, timestamp }

// Import/Export
'import:started'     { groupId, timestamp }
'import:progress'    { processed, total, percentage, timestamp }
'import:completed'   { result, timestamp }
'import:failed'      { error, timestamp }

// Notifications
'notification'       { message, type, timestamp }
```

### Subscribe (Client -> Server)

```typescript
'subscribe:group'    { groupId }
'unsubscribe:group'  { groupId }
'ping'               {}
'sync:request'       { groupId }
```

## Переменные окружения

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/gymnastics"

# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Запуск проекта

### Development

```bash
# Terminal 1: Backend
cd apps/api
pnpm dev

# Terminal 2: Frontend
cd apps/web
pnpm dev

# Terminal 3: Database
docker-compose up postgres
```

### Production

```bash
# Build
pnpm build

# Start
docker-compose up -d
```

## Тестирование

### Unit тесты

```bash
# Backend
cd apps/api
pnpm test

# Frontend
cd apps/web
pnpm test
```

### E2E тесты

```bash
cd apps/web
pnpm test:e2e
```

## Особенности реализации

### 1. Fisher-Yates Shuffle

Используется для случайной жеребьёвки:

```typescript
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
```

### 2. Transaction-based Updates

Все массовые обновления используют транзакции:

```typescript
await this.prisma.$transaction(
  athletes.map((athlete) =>
    this.prisma.groupAthlete.update({
      where: { id: athlete.id },
      data: { orderNumber: athlete.orderNumber },
    })
  )
);
```

### 3. Real-time Synchronization

WebSocket события автоматически синхронизируют состояние:

```typescript
this.groupsGateway.emitAthleteAdded(groupId, athlete);
```

### 4. Optimistic Updates

React Query поддерживает оптимистичные обновления:

```typescript
const mutation = useMutation({
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['group', groupId]);
    const previousData = queryClient.getQueryData(['group', groupId]);
    queryClient.setQueryData(['group', groupId], newData);
    return { previousData };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['group', groupId], context.previousData);
  },
});
```

## Производительность

### Backend

- Использование индексов в БД
- Lazy loading для связанных данных
- Пагинация для списков
- Кэширование частых запросов

### Frontend

- Code splitting (Next.js автоматически)
- React Query кэширование
- Optimistic updates
- Debounce для поиска
- Virtual scrolling для больших таблиц (опционально)

## Безопасность

- Input validation (class-validator)
- SQL injection защита (Prisma)
- XSS защита (React)
- File upload validation
- Rate limiting (на уровне Nginx)
- CORS настройки
- JWT аутентификация

## Мониторинг

- WebSocket connection status
- Import/export progress tracking
- Audit log для всех изменений
- Error tracking (Sentry - опционально)

## Масштабирование

- Горизонтальное масштабирование API
- Redis для WebSocket (Socket.io adapter)
- S3 для Excel файлов
- CDN для статики
- Database read replicas

## Заключение

Данная реализация предоставляет полнофункциональный enterprise-уровень модуль "Группы и потоки" с:

- ✅ 4 алгоритма жеребьёвки
- ✅ Автоматическая генерация потоков
- ✅ Excel import/export
- ✅ Drag & drop
- ✅ Real-time синхронизация
- ✅ Audit logging
- ✅ Type safety (TypeScript)
- ✅ Production-ready архитектура

Все компоненты готовы к использованию и требуют только интеграции в существующую структуру проекта.
