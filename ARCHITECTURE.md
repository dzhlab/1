# Архитектура платформы соревнований по художественной гимнастике

## 📋 Технологический стек

### Backend
- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **API**: REST + GraphQL (Apollo)
- **Validation**: class-validator, class-transformer
- **File Storage**: AWS S3 / MinIO
- **Excel Processing**: ExcelJS

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS + CSS Variables (iOS theme)
- **Forms**: React Hook Form + Zod
- **Real-time**: Socket.io Client
- **Excel**: SheetJS (xlsx)
- **Drag & Drop**: dnd-kit

### Infrastructure
- **Container**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry
- **Logging**: Winston

## 🗄️ Модель данных

### Основные сущности

#### 1. Competition (Соревнование)
```prisma
model Competition {
  id              String   @id @default(cuid())
  name            String
  startDate       DateTime
  endDate         DateTime
  days            Int
  city            String
  venue           String
  organizer       String
  contactName     String
  contactPhone    String
  category        Category
  logoUrl         String?
  logoKey         String?  // S3 key

  // Настройки ранжирования
  tiebreakRule    TiebreakRule @default(SHARE)
  rankingSkip     RankingSkip  @default(NO_SKIP)
  dCalculation    DCalculation @default(RUSSIAN)

  // Relations
  disciplines     CompetitionDiscipline[]
  judges          CompetitionJudge[]
  participants    CompetitionParticipant[]
  scores          Score[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([startDate, endDate])
}
```

#### 2. Judge (Судья)
```prisma
model Judge {
  id              String   @id @default(cuid())
  fullName        String
  city            String
  region          String
  category        JudgeCategory
  title           String?

  // Relations
  competitions    CompetitionJudge[]
  scores          Score[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([fullName])
}
```

#### 3. CompetitionJudge (Связь судьи с соревнованием)
```prisma
model CompetitionJudge {
  id              String   @id @default(cuid())
  competitionId   String
  judgeId         String
  brigade         Brigade  // D, E, A
  position        Int      // Порядок в бригаде

  competition     Competition @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  judge           Judge       @relation(fields: [judgeId], references: [id], onDelete: Cascade)

  @@unique([competitionId, judgeId])
  @@index([competitionId, brigade])
}
```

#### 4. Score (Оценка)
```prisma
model Score {
  id              String   @id @default(cuid())
  competitionId   String
  participantId   String
  discipline      Discipline
  judgeId         String?

  // D-бригада
  db1             Decimal  @db.Decimal(5, 3)
  db2             Decimal  @db.Decimal(5, 3)
  db3             Decimal? @db.Decimal(5, 3)
  db4             Decimal? @db.Decimal(5, 3)
  da1             Decimal  @db.Decimal(5, 3)
  da2             Decimal  @db.Decimal(5, 3)
  da3             Decimal? @db.Decimal(5, 3)
  da4             Decimal? @db.Decimal(5, 3)

  // E-бригада (вычеты)
  e1              Decimal  @db.Decimal(5, 3)
  e2              Decimal  @db.Decimal(5, 3)
  e3              Decimal  @db.Decimal(5, 3)
  e4              Decimal  @db.Decimal(5, 3)

  // A-бригада
  a1              Decimal  @db.Decimal(5, 3)
  a2              Decimal  @db.Decimal(5, 3)
  a3              Decimal  @db.Decimal(5, 3)
  a4              Decimal  @db.Decimal(5, 3)

  // Штрафы
  penalties       Decimal  @db.Decimal(5, 3) @default(0)

  // Итоговые значения
  dScore          Decimal  @db.Decimal(5, 3)
  eScore          Decimal  @db.Decimal(5, 3)
  aScore          Decimal  @db.Decimal(5, 3)
  totalScore      Decimal  @db.Decimal(5, 3)

  // Relations
  competition     Competition @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  participant     Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  judge           Judge?      @relation(fields: [judgeId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([competitionId, participantId, discipline])
  @@index([competitionId, totalScore])
}
```

### Enums
```prisma
enum Category {
  JUNIOR
  YOUTH
  SENIOR
  MIXED
}

enum Discipline {
  ROPE
  HOOP
  BALL
  CLUBS
  RIBBON
  FREE
}

enum Brigade {
  D
  E
  A
}

enum TiebreakRule {
  SHARE          // Делить место
  COMPONENTS     // Проверять компоненты E>A>D
}

enum RankingSkip {
  NO_SKIP        // 1-1-2
  SKIP           // 1-1-3
}

enum DCalculation {
  RUSSIAN        // ((DB1+DB2)+(DA1+DA2))/2
  SUM            // (DB1+DB2)+(DA1+DA2)
}

enum JudgeCategory {
  THIRD
  SECOND
  FIRST
  ALL_RUSSIAN
  INTERNATIONAL
}
```

## 🔌 API Endpoints

### REST API

#### Competitions
```
POST   /api/competitions              # Создать соревнование
GET    /api/competitions              # Список соревнований
GET    /api/competitions/:id          # Получить соревнование
PATCH  /api/competitions/:id          # Обновить соревнование
DELETE /api/competitions/:id          # Удалить соревнование
POST   /api/competitions/:id/logo     # Загрузить логотип
```

#### Judges
```
POST   /api/judges                           # Создать судью
GET    /api/judges                           # Список судей
GET    /api/competitions/:id/judges          # Судьи соревнования
POST   /api/competitions/:id/judges          # Добавить судью
PATCH  /api/competitions/:id/judges/:judgeId # Обновить судью
DELETE /api/competitions/:id/judges/:judgeId # Удалить судью
POST   /api/competitions/:id/judges/reorder  # Изменить порядок
POST   /api/competitions/:id/judges/brigades # Сформировать бригады
POST   /api/competitions/:id/judges/import   # Импорт из Excel
GET    /api/competitions/:id/judges/export   # Экспорт в Excel
```

#### Scoring
```
POST   /api/scores                    # Добавить оценку
GET    /api/scores/:id                # Получить оценку
PATCH  /api/scores/:id                # Обновить оценку
DELETE /api/scores/:id                # Удалить оценку
GET    /api/competitions/:id/scores   # Оценки соревнования
```

#### Ranking & Results
```
GET    /api/competitions/:id/results  # Результаты с ранжированием
GET    /api/competitions/:id/podium   # Тройка лидеров
POST   /api/competitions/:id/recalculate # Пересчитать результаты
```

### GraphQL Schema

```graphql
type Competition {
  id: ID!
  name: String!
  startDate: DateTime!
  endDate: DateTime!
  days: Int!
  city: String!
  venue: String!
  organizer: String!
  contactName: String!
  contactPhone: String!
  category: Category!
  logoUrl: String

  # Settings
  tiebreakRule: TiebreakRule!
  rankingSkip: RankingSkip!
  dCalculation: DCalculation!

  # Relations
  disciplines: [Discipline!]!
  judges: [CompetitionJudge!]!
  participants: [Participant!]!
  scores: [Score!]!
  results: [Result!]!
}

type CompetitionJudge {
  id: ID!
  judge: Judge!
  brigade: Brigade!
  position: Int!
}

type Result {
  rank: Int!
  participant: Participant!
  scores: [Score!]!
  totalScore: Decimal!
  avgD: Decimal!
  avgE: Decimal!
  avgA: Decimal!
}

type Query {
  competitions(filter: CompetitionFilter): [Competition!]!
  competition(id: ID!): Competition
  judges(search: String): [Judge!]!
  results(competitionId: ID!): [Result!]!
}

type Mutation {
  createCompetition(input: CreateCompetitionInput!): Competition!
  updateCompetition(id: ID!, input: UpdateCompetitionInput!): Competition!
  addJudgeToCompetition(competitionId: ID!, judgeId: ID!, brigade: Brigade!): CompetitionJudge!
  reorderJudges(competitionId: ID!, orders: [JudgeOrderInput!]!): [CompetitionJudge!]!
  submitScore(input: ScoreInput!): Score!
}

type Subscription {
  competitionUpdated(id: ID!): Competition!
  judgesUpdated(competitionId: ID!): [CompetitionJudge!]!
  scoresUpdated(competitionId: ID!): [Score!]!
}
```

## 🔄 WebSocket Events

```typescript
// Server -> Client
socket.emit('competition:updated', { competitionId, data });
socket.emit('judge:added', { competitionId, judge });
socket.emit('judge:updated', { competitionId, judgeId, data });
socket.emit('judge:deleted', { competitionId, judgeId });
socket.emit('judge:reordered', { competitionId, judges });
socket.emit('brigade:formed', { competitionId, brigades });
socket.emit('score:submitted', { competitionId, score });
socket.emit('results:recalculated', { competitionId, results });

// Client -> Server
socket.emit('competition:join', { competitionId });
socket.emit('competition:leave', { competitionId });
```

## 📊 Ключевые алгоритмы

### Ранжирование
```typescript
// Основной алгоритм в /api/src/modules/ranking/ranking.service.ts
// UI компоненты в /web/src/components/Results/RankingTable.tsx
```

### Расчет оценок
```typescript
// Сервис расчета в /api/src/modules/scoring/calculation.service.ts
// React компонент в /web/src/components/Scoring/ScoreForm.tsx
```

Далее создам детальную реализацию кода...
