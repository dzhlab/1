# Архитектура модуля "Группы и потоки"

## Обзор

Модуль предназначен для создания групп спортсменов, управления потоками выступлений, жеребьёвки и автоматизации организации соревнований по художественной гимнастике.

## Технологический стек

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 16
- **Real-time**: Socket.io 4.x
- **Excel**: ExcelJS 4.x
- **Validation**: class-validator, class-transformer

### Frontend
- **Framework**: React 18.x + TypeScript
- **State Management**: Zustand 4.x + TanStack Query
- **UI Library**: Tailwind CSS + Radix UI
- **Forms**: React Hook Form + Zod
- **Drag & Drop**: dnd-kit
- **Excel**: SheetJS (xlsx)
- **Real-time**: Socket.io Client

## Архитектура модулей

```
apps/api/src/modules/
├── groups/
│   ├── groups.controller.ts       # REST API endpoints
│   ├── groups.service.ts          # Business logic
│   ├── groups.module.ts           # Module definition
│   ├── dto/
│   │   ├── create-group.dto.ts
│   │   ├── update-group.dto.ts
│   │   └── group-settings.dto.ts
│   └── entities/
│       └── group.entity.ts
│
├── athletes/
│   ├── athletes.controller.ts     # Athletes CRUD
│   ├── athletes.service.ts        # Athlete management
│   ├── athletes.module.ts
│   ├── dto/
│   │   ├── create-athlete.dto.ts
│   │   ├── update-athlete.dto.ts
│   │   ├── bulk-import.dto.ts
│   │   └── reorder-athletes.dto.ts
│   └── entities/
│       └── athlete.entity.ts
│
├── streams/
│   ├── streams.controller.ts      # Stream management
│   ├── streams.service.ts         # Stream auto-generation
│   ├── streams.module.ts
│   ├── dto/
│   │   ├── create-stream.dto.ts
│   │   ├── stream-settings.dto.ts
│   │   └── assign-athletes.dto.ts
│   └── entities/
│       └── stream.entity.ts
│
├── draw/
│   ├── draw.service.ts            # Draw/lottery algorithms
│   ├── draw.module.ts
│   └── strategies/
│       ├── random-draw.strategy.ts
│       ├── apparatus-draw.strategy.ts
│       └── group-draw.strategy.ts
│
├── excel/
│   ├── excel.service.ts           # Import/Export Excel
│   ├── excel.module.ts
│   ├── parsers/
│   │   └── athletes-parser.ts
│   └── generators/
│       └── athletes-generator.ts
│
└── websocket/
    ├── groups.gateway.ts          # WebSocket events
    └── events/
        ├── group-events.ts
        ├── athlete-events.ts
        └── stream-events.ts
```

```
apps/web/src/
├── features/
│   └── groups/
│       ├── components/
│       │   ├── GroupForm/
│       │   │   ├── GroupForm.tsx
│       │   │   ├── DisciplineSelect.tsx
│       │   │   ├── AgeCategorySelect.tsx
│       │   │   └── PerformanceTypeSelect.tsx
│       │   │
│       │   ├── AthletesTable/
│       │   │   ├── AthletesTable.tsx
│       │   │   ├── AthleteRow.tsx
│       │   │   ├── DraggableRow.tsx
│       │   │   └── TableActions.tsx
│       │   │
│       │   ├── StreamsPanel/
│       │   │   ├── StreamsPanel.tsx
│       │   │   ├── StreamCard.tsx
│       │   │   └── StreamSettings.tsx
│       │   │
│       │   └── DrawModal/
│       │       ├── DrawModal.tsx
│       │       ├── DrawSettings.tsx
│       │       └── DrawProgress.tsx
│       │
│       ├── hooks/
│       │   ├── useGroups.ts
│       │   ├── useAthletes.ts
│       │   ├── useStreams.ts
│       │   ├── useDraw.ts
│       │   └── useExcel.ts
│       │
│       ├── store/
│       │   ├── groupsStore.ts
│       │   └── athletesStore.ts
│       │
│       └── api/
│           ├── groups.api.ts
│           ├── athletes.api.ts
│           └── excel.api.ts
│
└── shared/
    ├── hooks/
    │   └── useWebSocket.ts
    └── utils/
        ├── excel.ts
        └── validation.ts
```

## Модели данных

### 1. Group (Группа)
```typescript
{
  id: string
  name: string
  discipline: DisciplineType
  ageCategory: AgeCategoryType
  yearFrom?: number
  yearTo?: number
  program: ProgramType
  performanceType: PerformanceType
  apparatus: ApparatusType[]
  performanceDuration: number // seconds
  apparatusOrder: ApparatusType[] // порядок видов

  // Stream settings
  athletesPerStream: number
  minAthletesPerStream: number
  streamStartTime: string // HH:mm

  athletes: GroupAthlete[]
  streams: Stream[]

  createdAt: DateTime
  updatedAt: DateTime
}
```

### 2. GroupAthlete (Спортсмен в группе)
```typescript
{
  id: string
  groupId: string

  // Athlete info
  fullName: string
  birthDate: DateTime
  city: string
  club: string
  coach: string
  rank: RankType

  // Performance info
  orderNumber: number // порядковый номер
  streamId?: string
  streamTime?: string
  apparatusNumber?: number // 1-6
  subgroup?: string // A, B, C, etc.

  group: Group
  stream?: Stream

  createdAt: DateTime
  updatedAt: DateTime
}
```

### 3. Stream (Поток)
```typescript
{
  id: string
  groupId: string

  name: string // "Поток A", "Группа 1"
  subgroup: string // A, B, C
  startTime: string // HH:mm
  orderNumber: number

  athletes: GroupAthlete[]
  group: Group

  createdAt: DateTime
  updatedAt: DateTime
}
```

## REST API Endpoints

### Groups
```
GET    /api/groups                    - Список всех групп
GET    /api/groups/:id                - Получить группу
POST   /api/groups                    - Создать группу
PUT    /api/groups/:id                - Обновить группу
DELETE /api/groups/:id                - Удалить группу
POST   /api/groups/:id/duplicate      - Дублировать группу
```

### Athletes
```
GET    /api/groups/:groupId/athletes             - Список спортсменов
POST   /api/groups/:groupId/athletes             - Добавить спортсмена
PUT    /api/groups/:groupId/athletes/:id         - Обновить спортсмена
DELETE /api/groups/:groupId/athletes/:id         - Удалить спортсмена
POST   /api/groups/:groupId/athletes/reorder     - Изменить порядок
POST   /api/groups/:groupId/athletes/clear       - Очистить список
POST   /api/groups/:groupId/athletes/:id/move-up - Сдвиг вверх
POST   /api/groups/:groupId/athletes/:id/move-down - Сдвиг вниз
```

### Draw (Жеребьёвка)
```
POST   /api/groups/:groupId/draw                 - Выполнить жеребьёвку
POST   /api/groups/:groupId/draw/random          - Случайная жеребьёвка
POST   /api/groups/:groupId/draw/by-apparatus    - По видам программ
POST   /api/groups/:groupId/draw/by-subgroup     - По подгруппам
```

### Streams (Потоки)
```
GET    /api/groups/:groupId/streams              - Список потоков
POST   /api/groups/:groupId/streams/generate     - Генерация потоков
PUT    /api/groups/:groupId/streams/:id          - Обновить поток
POST   /api/groups/:groupId/streams/assign       - Назначить спортсменов
DELETE /api/groups/:groupId/streams/:id          - Удалить поток
```

### Excel
```
POST   /api/groups/:groupId/import               - Импорт из Excel
GET    /api/groups/:groupId/export               - Экспорт в Excel
GET    /api/groups/:groupId/template             - Скачать шаблон
POST   /api/groups/:groupId/validate-import      - Валидация перед импортом
```

## GraphQL Schema

```graphql
type Group {
  id: ID!
  name: String!
  discipline: DisciplineType!
  ageCategory: AgeCategoryType!
  yearFrom: Int
  yearTo: Int
  program: ProgramType!
  performanceType: PerformanceType!
  apparatus: [ApparatusType!]!
  performanceDuration: Int!
  apparatusOrder: [ApparatusType!]!
  athletesPerStream: Int!
  minAthletesPerStream: Int!
  streamStartTime: String!
  athletes: [GroupAthlete!]!
  streams: [Stream!]!
  athletesCount: Int!
  streamsCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type GroupAthlete {
  id: ID!
  groupId: ID!
  fullName: String!
  birthDate: DateTime!
  city: String!
  club: String!
  coach: String!
  rank: RankType!
  orderNumber: Int!
  streamId: ID
  streamTime: String
  apparatusNumber: Int
  subgroup: String
  group: Group!
  stream: Stream
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Stream {
  id: ID!
  groupId: ID!
  name: String!
  subgroup: String!
  startTime: String!
  orderNumber: Int!
  athletes: [GroupAthlete!]!
  athletesCount: Int!
  group: Group!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum DisciplineType {
  INDIVIDUAL
  GROUP
  FITNESS
}

enum AgeCategoryType {
  UNDER_5
  AGE_6_7
  AGE_8
  AGE_9
  AGE_10
  AGE_11_12
  AGE_13_15
  AGE_15_PLUS
}

enum ProgramType {
  THIRD_JUNIOR
  SECOND_JUNIOR
  FIRST_JUNIOR
  THIRD_SPORT
  SECOND_SPORT
  FIRST_SPORT
  CMS
  MS
}

enum PerformanceType {
  INDIVIDUAL
  TEAM_5_PLUS
  PAIRS
  TRIPLES
}

enum ApparatusType {
  FREE
  ROPE
  HOOP
  BALL
  CLUBS
  RIBBON
  MIXED
}

enum RankType {
  THIRD_JUNIOR
  SECOND_JUNIOR
  FIRST_JUNIOR
  THIRD_SPORT
  SECOND_SPORT
  FIRST_SPORT
  CMS
  MS
}

type Query {
  groups: [Group!]!
  group(id: ID!): Group
  groupAthletes(groupId: ID!): [GroupAthlete!]!
  groupStreams(groupId: ID!): [Stream!]!
}

type Mutation {
  createGroup(input: CreateGroupInput!): Group!
  updateGroup(id: ID!, input: UpdateGroupInput!): Group!
  deleteGroup(id: ID!): Boolean!

  addAthlete(groupId: ID!, input: CreateAthleteInput!): GroupAthlete!
  updateAthlete(id: ID!, input: UpdateAthleteInput!): GroupAthlete!
  deleteAthlete(id: ID!): Boolean!
  reorderAthletes(groupId: ID!, orders: [AthleteOrder!]!): [GroupAthlete!]!
  moveAthleteUp(id: ID!): GroupAthlete!
  moveAthleteDown(id: ID!): GroupAthlete!
  clearAthletes(groupId: ID!): Boolean!

  performDraw(groupId: ID!, strategy: DrawStrategy!): DrawResult!
  generateStreams(groupId: ID!): [Stream!]!
  assignAthletesToStream(streamId: ID!, athleteIds: [ID!]!): Stream!

  importAthletes(groupId: ID!, file: Upload!): ImportResult!
}

type Subscription {
  groupUpdated(groupId: ID!): Group!
  athleteAdded(groupId: ID!): GroupAthlete!
  athleteUpdated(groupId: ID!): GroupAthlete!
  athleteDeleted(groupId: ID!): ID!
  athletesReordered(groupId: ID!): [GroupAthlete!]!
  streamsGenerated(groupId: ID!): [Stream!]!
  drawCompleted(groupId: ID!): DrawResult!
}

input CreateGroupInput {
  name: String!
  discipline: DisciplineType!
  ageCategory: AgeCategoryType!
  yearFrom: Int
  yearTo: Int
  program: ProgramType!
  performanceType: PerformanceType!
  apparatus: [ApparatusType!]!
  performanceDuration: Int!
  apparatusOrder: [ApparatusType!]
  athletesPerStream: Int!
  minAthletesPerStream: Int!
  streamStartTime: String!
}

input UpdateGroupInput {
  name: String
  discipline: DisciplineType
  ageCategory: AgeCategoryType
  yearFrom: Int
  yearTo: Int
  program: ProgramType
  performanceType: PerformanceType
  apparatus: [ApparatusType!]
  performanceDuration: Int
  apparatusOrder: [ApparatusType!]
  athletesPerStream: Int
  minAthletesPerStream: Int
  streamStartTime: String
}

input CreateAthleteInput {
  fullName: String!
  birthDate: DateTime!
  city: String!
  club: String!
  coach: String!
  rank: RankType!
  apparatusNumber: Int
}

input UpdateAthleteInput {
  fullName: String
  birthDate: DateTime
  city: String
  club: String
  coach: String
  rank: RankType
  apparatusNumber: Int
  streamId: ID
  subgroup: String
}

input AthleteOrder {
  athleteId: ID!
  orderNumber: Int!
}

enum DrawStrategy {
  RANDOM
  BY_APPARATUS
  BY_SUBGROUP
  BY_GROUP
}

type DrawResult {
  success: Boolean!
  message: String!
  athletes: [GroupAthlete!]!
  timestamp: DateTime!
}

type ImportResult {
  success: Boolean!
  imported: Int!
  skipped: Int!
  errors: [ImportError!]!
  athletes: [GroupAthlete!]!
}

type ImportError {
  row: Int!
  field: String!
  message: String!
}
```

## WebSocket Events

### Emit (Server → Client)

```typescript
// Group events
'group:created' → { group: Group }
'group:updated' → { groupId: string, data: Partial<Group> }
'group:deleted' → { groupId: string }

// Athlete events
'athlete:added' → { groupId: string, athlete: GroupAthlete }
'athlete:updated' → { groupId: string, athleteId: string, data: Partial<GroupAthlete> }
'athlete:deleted' → { groupId: string, athleteId: string }
'athletes:reordered' → { groupId: string, athletes: GroupAthlete[] }
'athletes:cleared' → { groupId: string }

// Draw events
'draw:started' → { groupId: string, strategy: string }
'draw:progress' → { groupId: string, progress: number, total: number }
'draw:completed' → { groupId: string, result: DrawResult }

// Stream events
'streams:generated' → { groupId: string, streams: Stream[] }
'stream:updated' → { groupId: string, streamId: string, data: Partial<Stream> }
'athletes:assigned' → { groupId: string, streamId: string, athleteIds: string[] }

// Import events
'import:started' → { groupId: string }
'import:progress' → { groupId: string, processed: number, total: number }
'import:completed' → { groupId: string, result: ImportResult }
'import:error' → { groupId: string, error: string }
```

### Subscribe (Client → Server)

```typescript
'group:join' → { groupId: string }
'group:leave' → { groupId: string }
```

## Алгоритмы

### 1. Жеребьёвка (Draw Algorithms)

#### Random Draw
```typescript
// Полностью случайная перестановка (Fisher-Yates)
function randomDraw(athletes: GroupAthlete[]): GroupAthlete[] {
  const shuffled = [...athletes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((athlete, index) => ({
    ...athlete,
    orderNumber: index + 1
  }));
}
```

#### By Apparatus Draw
```typescript
// Жеребьёвка с учетом видов программ
function apparatusDraw(
  athletes: GroupAthlete[],
  apparatus: ApparatusType[]
): GroupAthlete[] {
  // Группируем по видам
  const byApparatus = new Map<number, GroupAthlete[]>();

  athletes.forEach(athlete => {
    const app = athlete.apparatusNumber || 0;
    if (!byApparatus.has(app)) {
      byApparatus.set(app, []);
    }
    byApparatus.get(app)!.push(athlete);
  });

  // Перемешиваем внутри каждого вида
  byApparatus.forEach((group, key) => {
    byApparatus.set(key, shuffle(group));
  });

  // Чередуем виды
  const result: GroupAthlete[] = [];
  let index = 0;

  while (result.length < athletes.length) {
    for (const apparatusNum of apparatus.keys()) {
      const group = byApparatus.get(apparatusNum + 1);
      if (group && group.length > 0) {
        const athlete = group.shift()!;
        result.push({ ...athlete, orderNumber: ++index });
      }
    }
  }

  return result;
}
```

#### Group Draw
```typescript
// Групповая жеребьёвка (для командных выступлений)
function groupDraw(athletes: GroupAthlete[]): GroupAthlete[] {
  // Группируем по клубам
  const byClub = new Map<string, GroupAthlete[]>();

  athletes.forEach(athlete => {
    if (!byClub.has(athlete.club)) {
      byClub.set(athlete.club, []);
    }
    byClub.get(athlete.club)!.push(athlete);
  });

  // Случайный порядок клубов
  const clubs = Array.from(byClub.keys());
  const shuffledClubs = shuffle(clubs);

  // Собираем результат
  const result: GroupAthlete[] = [];
  let index = 0;

  shuffledClubs.forEach(club => {
    const clubAthletes = byClub.get(club)!;
    // Перемешиваем внутри клуба
    const shuffledAthletes = shuffle(clubAthletes);
    shuffledAthletes.forEach(athlete => {
      result.push({ ...athlete, orderNumber: ++index });
    });
  });

  return result;
}
```

### 2. Генерация потоков

```typescript
function generateStreams(
  groupId: string,
  athletes: GroupAthlete[],
  settings: {
    athletesPerStream: number;
    minAthletesPerStream: number;
    streamStartTime: string;
    performanceDuration: number;
    subgroups: string[];
  }
): Stream[] {
  const {
    athletesPerStream,
    minAthletesPerStream,
    streamStartTime,
    performanceDuration,
    subgroups
  } = settings;

  // Расчет количества потоков
  let numStreams = Math.ceil(athletes.length / athletesPerStream);

  // Проверка минимального количества в последнем потоке
  const lastStreamSize = athletes.length % athletesPerStream;
  if (lastStreamSize > 0 && lastStreamSize < minAthletesPerStream && numStreams > 1) {
    // Перераспределяем участников
    numStreams = Math.floor(athletes.length / athletesPerStream);
  }

  const streams: Stream[] = [];
  let currentTime = parseTime(streamStartTime);

  for (let i = 0; i < numStreams; i++) {
    const subgroup = subgroups[i % subgroups.length] || `Поток ${i + 1}`;

    const stream: Stream = {
      id: generateId(),
      groupId,
      name: `Поток ${subgroup}`,
      subgroup,
      startTime: formatTime(currentTime),
      orderNumber: i + 1,
      athletes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Назначаем спортсменов в поток
    const startIdx = i * athletesPerStream;
    const endIdx = Math.min(startIdx + athletesPerStream, athletes.length);

    for (let j = startIdx; j < endIdx; j++) {
      const athlete = athletes[j];
      athlete.streamId = stream.id;
      athlete.streamTime = formatTime(currentTime);
      athlete.subgroup = subgroup;
      stream.athletes.push(athlete);

      // Следующее время
      currentTime += performanceDuration;
    }

    streams.push(stream);

    // Перерыв между потоками (5 минут)
    currentTime += 300;
  }

  return streams;
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
```

### 3. Сортировка

```typescript
type SortField = 'orderNumber' | 'fullName' | 'birthDate' | 'city' | 'club' | 'rank';
type SortDirection = 'asc' | 'desc';

function sortAthletes(
  athletes: GroupAthlete[],
  field: SortField,
  direction: SortDirection
): GroupAthlete[] {
  return [...athletes].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'orderNumber':
        comparison = a.orderNumber - b.orderNumber;
        break;
      case 'fullName':
        comparison = a.fullName.localeCompare(b.fullName, 'ru');
        break;
      case 'birthDate':
        comparison = new Date(a.birthDate).getTime() - new Date(b.birthDate).getTime();
        break;
      case 'city':
        comparison = a.city.localeCompare(b.city, 'ru');
        break;
      case 'club':
        comparison = a.club.localeCompare(b.club, 'ru');
        break;
      case 'rank':
        comparison = compareRanks(a.rank, b.rank);
        break;
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}

function compareRanks(a: RankType, b: RankType): number {
  const rankOrder = {
    MS: 8,
    CMS: 7,
    FIRST_SPORT: 6,
    SECOND_SPORT: 5,
    THIRD_SPORT: 4,
    FIRST_JUNIOR: 3,
    SECOND_JUNIOR: 2,
    THIRD_JUNIOR: 1
  };
  return rankOrder[a] - rankOrder[b];
}
```

## Excel Import/Export

### Template Structure

```
| № | ФИО спортсмена | Дата рождения | Город | Клуб | Тренер | Разряд | Поток | Время | Вид программы |
|---|----------------|---------------|-------|------|--------|--------|-------|-------|---------------|
| 1 | Иванова А.П.   | 2015-03-15    | Москва| СДЮШ | Петрова| КМС    | A     | 09:00 | 1             |
```

### Import Logic

```typescript
async function importAthletes(
  groupId: string,
  buffer: Buffer
): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  const athletes: CreateAthleteInput[] = [];
  const errors: ImportError[] = [];

  // Skip header
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    try {
      // Валидация
      const athlete = validateAthleteRow(row, i + 1);
      athletes.push(athlete);
    } catch (error) {
      errors.push({
        row: i + 1,
        field: error.field,
        message: error.message
      });
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      imported: 0,
      skipped: rows.length - 1,
      errors,
      athletes: []
    };
  }

  // Bulk insert
  const created = await prisma.groupAthlete.createMany({
    data: athletes.map((athlete, index) => ({
      ...athlete,
      groupId,
      orderNumber: index + 1
    }))
  });

  return {
    success: true,
    imported: created.count,
    skipped: 0,
    errors: [],
    athletes: await prisma.groupAthlete.findMany({ where: { groupId } })
  };
}

function validateAthleteRow(row: any[], rowNumber: number): CreateAthleteInput {
  const [_, fullName, birthDate, city, club, coach, rank, stream, time, apparatus] = row;

  if (!fullName || !birthDate || !city || !club || !coach || !rank) {
    throw {
      field: 'required',
      message: 'Отсутствуют обязательные поля'
    };
  }

  // Валидация даты
  const parsedDate = new Date(birthDate);
  if (isNaN(parsedDate.getTime())) {
    throw {
      field: 'birthDate',
      message: 'Неверный формат даты рождения'
    };
  }

  // Валидация разряда
  const validRanks = Object.values(RankType);
  const normalizedRank = normalizeRank(rank);
  if (!validRanks.includes(normalizedRank)) {
    throw {
      field: 'rank',
      message: `Неверный разряд: ${rank}`
    };
  }

  return {
    fullName: String(fullName).trim(),
    birthDate: parsedDate,
    city: String(city).trim(),
    club: String(club).trim(),
    coach: String(coach).trim(),
    rank: normalizedRank,
    apparatusNumber: apparatus ? parseInt(apparatus) : undefined
  };
}
```

### Export Logic

```typescript
async function exportAthletes(groupId: string): Promise<Buffer> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      athletes: {
        orderBy: { orderNumber: 'asc' },
        include: { stream: true }
      }
    }
  });

  if (!group) {
    throw new Error('Group not found');
  }

  // Создаем workbook
  const wb = XLSX.utils.book_new();

  // Заголовки
  const headers = [
    '№',
    'ФИО спортсмена',
    'Дата рождения',
    'Город',
    'Клуб',
    'Тренер',
    'Разряд',
    'Поток',
    'Время',
    'Вид программы'
  ];

  // Данные
  const data = group.athletes.map(athlete => [
    athlete.orderNumber,
    athlete.fullName,
    formatDate(athlete.birthDate),
    athlete.city,
    athlete.club,
    athlete.coach,
    translateRank(athlete.rank),
    athlete.subgroup || '',
    athlete.streamTime || '',
    athlete.apparatusNumber ? `Вид ${athlete.apparatusNumber}` : ''
  ]);

  // Создаем worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Стили
  ws['!cols'] = [
    { wch: 5 },   // №
    { wch: 30 },  // ФИО
    { wch: 15 },  // Дата
    { wch: 15 },  // Город
    { wch: 25 },  // Клуб
    { wch: 25 },  // Тренер
    { wch: 15 },  // Разряд
    { wch: 10 },  // Поток
    { wch: 10 },  // Время
    { wch: 15 }   // Вид
  ];

  // Добавляем лист
  XLSX.utils.book_append_sheet(wb, ws, 'Спортсмены');

  // Генерируем buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
```

## Обработка ошибок

```typescript
// Custom exceptions
class GroupNotFoundException extends NotFoundException {
  constructor(groupId: string) {
    super(`Group with ID ${groupId} not found`);
  }
}

class AthleteNotFoundException extends NotFoundException {
  constructor(athleteId: string) {
    super(`Athlete with ID ${athleteId} not found`);
  }
}

class InvalidDrawStrategyException extends BadRequestException {
  constructor(strategy: string) {
    super(`Invalid draw strategy: ${strategy}`);
  }
}

class InvalidFileFormatException extends BadRequestException {
  constructor() {
    super('Invalid file format. Expected .xlsx or .xls file');
  }
}

class ImportValidationException extends BadRequestException {
  constructor(errors: ImportError[]) {
    super({
      message: 'Import validation failed',
      errors
    });
  }
}

// Error filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message
    });
  }
}
```

## UX Improvements

### 1. Автосохранение
- Автоматическое сохранение при каждом изменении (debounce 500ms)
- Индикатор сохранения
- Восстановление при ошибке

### 2. Drag & Drop
- Визуальное выделение при перетаскивании
- Показ целевой позиции
- Плавная анимация перемещения
- Отмена через Escape

### 3. Bulk Operations
- Множественный выбор (Shift + Click, Ctrl + Click)
- Групповое удаление
- Групповое назначение в поток
- Копирование/вставка из Excel

### 4. Real-time Collaboration
- Показ активных пользователей
- Live курсоры
- Конфликт-резолюция при одновременном редактировании
- Уведомления об изменениях

### 5. Undo/Redo
- История изменений (последние 50 действий)
- Горячие клавиши Ctrl+Z / Ctrl+Y
- Визуальный индикатор возможности отмены

### 6. Smart Validation
- Real-time валидация полей
- Подсказки при ошибках
- Автокоррекция (заглавные буквы, пробелы)
- Проверка дубликатов

### 7. Performance
- Виртуализация таблицы (react-window)
- Lazy loading при прокрутке
- Оптимистичные обновления UI
- Кэширование данных

### 8. Accessibility
- Keyboard navigation (Tab, Arrow keys)
- Screen reader support
- High contrast mode
- Focus indicators

## Тестирование

```typescript
// Unit tests
describe('DrawService', () => {
  describe('randomDraw', () => {
    it('should shuffle athletes randomly', () => {
      const athletes = createMockAthletes(10);
      const result = randomDraw(athletes);

      expect(result).toHaveLength(10);
      expect(result.map(a => a.id).sort()).toEqual(
        athletes.map(a => a.id).sort()
      );
    });
  });

  describe('apparatusDraw', () => {
    it('should distribute athletes evenly across apparatus', () => {
      const athletes = createMockAthletes(12);
      const apparatus = [ApparatusType.ROPE, ApparatusType.HOOP, ApparatusType.BALL];

      const result = apparatusDraw(athletes, apparatus);

      // Проверяем чередование
      const apparatusSequence = result.map(a => a.apparatusNumber);
      expect(apparatusSequence).toMatchPattern([1, 2, 3, 1, 2, 3, ...]);
    });
  });
});

// Integration tests
describe('GroupsController (e2e)', () => {
  it('should create group and generate streams', async () => {
    const group = await request(app.getHttpServer())
      .post('/api/groups')
      .send(createGroupDto)
      .expect(201);

    const athletes = await addAthletes(group.body.id, 15);

    const streams = await request(app.getHttpServer())
      .post(`/api/groups/${group.body.id}/streams/generate`)
      .expect(201);

    expect(streams.body).toHaveLength(3); // 15 / 6 = 3 streams
  });
});
```

## Deployment

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/gymnastics
REDIS_URL=redis://localhost:6379
S3_BUCKET=gymnastics-files
S3_REGION=us-east-1
WS_PORT=4001
```

### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: ./apps/api
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "4000:4000"
      - "4001:4001"

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=gymnastics
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Метрики и мониторинг

```typescript
// Prometheus metrics
import { Counter, Histogram } from 'prom-client';

const drawCounter = new Counter({
  name: 'draws_total',
  help: 'Total number of draws performed',
  labelNames: ['strategy', 'status']
});

const importDuration = new Histogram({
  name: 'import_duration_seconds',
  help: 'Duration of Excel imports',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Usage
drawCounter.inc({ strategy: 'random', status: 'success' });
const timer = importDuration.startTimer();
// ... perform import
timer();
```
