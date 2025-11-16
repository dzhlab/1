# Архитектура модуля "Настройка соревнований"

## 1. Обзор системы

Модуль предназначен для комплексного управления соревнованиями по художественной гимнастике с автоматическим пересчетом расписания, управлением датами, группами, событиями и генерацией стартовых протоколов.

## 2. Диаграмма потоков данных

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Competition Setup Module                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                ▼                  ▼                  ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │ Competition  │   │    Dates     │   │   Schedule   │
        │  Management  │   │  Management  │   │ Recalculation│
        └──────────────┘   └──────────────┘   └──────────────┘
                │                  │                  │
                │                  │                  │
        ┌───────┴──────┐   ┌───────┴──────┐   ┌───────┴──────┐
        ▼              ▼   ▼              ▼   ▼              ▼
   ┌────────┐   ┌─────────┐ ┌────────┐ ┌──────┐ ┌──────┐ ┌──────────┐
   │ Create │   │ Delete  │ │  Add   │ │ Edit │ │ Auto │ │ Conflict │
   │  Comp  │   │  Comp   │ │  Date  │ │ Date │ │ Time │ │ Detection│
   └────────┘   └─────────┘ └────────┘ └──────┘ └──────┘ └──────────┘
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
                ┌──────────────┐      ┌──────────────┐
                │    Groups    │      │    Events    │
                │  Management  │      │  Management  │
                └──────────────┘      └──────────────┘
                        │                     │
                ┌───────┴───────┐     ┌───────┴───────┐
                ▼               ▼     ▼               ▼
        ┌────────────┐  ┌────────────┐ ┌──────────┐ ┌──────────┐
        │   Streams  │  │  Athletes  │ │ Opening  │ │  Break   │
        │ Generation │  │ Assignment │ │  Parade  │ │  Awards  │
        └────────────┘  └────────────┘ └──────────┘ └──────────┘
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
                ┌──────────────┐      ┌──────────────┐
                │    Export    │      │   Protocols  │
                │ (XLSX/PDF)   │      │  Generation  │
                └──────────────┘      └──────────────┘
```

## 3. Архитектура модулей

```
competitions/
├── domain/
│   ├── entities/
│   │   ├── Competition
│   │   ├── CompetitionDate
│   │   ├── DateItem (abstract)
│   │   ├── Group
│   │   ├── Event
│   │   ├── Stream
│   │   ├── Athlete
│   │   └── StartProtocol
│   ├── value-objects/
│   │   ├── TimeSlot
│   │   ├── DatePosition
│   │   ├── EventType
│   │   └── ScheduleConflict
│   └── services/
│       ├── ScheduleCalculator
│       ├── ConflictDetector
│       ├── DateShifter
│       └── ProtocolGenerator
├── application/
│   ├── services/
│   │   ├── CompetitionService
│   │   ├── DateManagementService
│   │   ├── GroupManagementService
│   │   ├── EventManagementService
│   │   └── ScheduleRecalculationService
│   └── use-cases/
│       ├── CreateCompetitionUseCase
│       ├── AddDateUseCase
│       ├── EditDateUseCase (first/last only)
│       ├── DeleteDateUseCase
│       ├── RecalculateScheduleUseCase
│       └── GenerateFinalsUseCase
├── infrastructure/
│   ├── persistence/
│   │   ├── CompetitionRepository
│   │   ├── DateRepository
│   │   └── ProtocolRepository
│   ├── export/
│   │   ├── ExcelExporter
│   │   ├── PDFExporter
│   │   └── JSONExporter
│   └── websocket/
│       └── CompetitionGateway
└── presentation/
    ├── controllers/
    │   ├── CompetitionController
    │   ├── DateController
    │   ├── GroupController
    │   ├── EventController
    │   └── ExportController
    └── dto/
        ├── CreateCompetitionDto
        ├── AddDateDto
        ├── EditDateDto
        ├── AddEventDto
        └── RecalculateScheduleDto
```

## 4. Ключевые бизнес-правила

### 4.1 Управление датами

**Правила добавления даты:**
- ✅ Можно добавить дату перед первым днем (position: 'beforeFirst')
- ✅ Можно добавить дату после последнего дня (position: 'afterLast')
- ✅ Можно вставить дату между существующими (position: 'afterDateId')
- ⚠️ При вставке между днями остальные даты автоматически сдвигаются
- ✅ После добавления запускается автоматический пересчет расписания

**Правила редактирования даты:**
- ✅ Можно редактировать только ПЕРВЫЙ или ПОСЛЕДНИЙ день
- ❌ Нельзя редактировать промежуточные даты напрямую
- ⚠️ При изменении первого/последнего дня остальные даты сдвигаются пропорционально
- ✅ Изменение времени (startTime) возможно для любого дня
- ✅ После редактирования запускается автоматический пересчет

**Правила удаления даты:**
- ✅ Можно удалить любую дату
- ⚠️ При удалении даты все группы и события этого дня удаляются (с предупреждением)
- ✅ Остальные даты остаются на своих местах (не сдвигаются)
- ✅ После удаления запускается пересчет для проверки консистентности

### 4.2 Алгоритм пересчета времени

**Входные данные:**
```typescript
interface ScheduleInput {
  competitionId: string;
  mode: 'strict' | 'relaxed';
  options?: {
    breakBetweenItems?: number; // seconds
    breakBetweenStreams?: number; // seconds
    minBreakBeforeEvent?: number; // seconds
  };
}
```

**Алгоритм:**

1. **Сортировка элементов дня**
   - Получить все DateItems (Groups + Events) для каждой даты
   - Отсортировать по полю `order`

2. **Расчет длительности для каждого элемента**

   **Для Event:**
   ```
   duration = event.duration (задается вручную)
   ```

   **Для Group:**
   ```
   - Если группа имеет потоки:
     duration = max(stream1.duration, stream2.duration, ...) + breaks

   - Если группа без потоков:
     duration = numberOfAthletes * timePerPerformance * numberOfApparatus + breaks
   ```

   **Для Stream:**
   ```
   athletesInStream = ceil(totalAthletes / numberOfStreams)
   duration = athletesInStream * timePerPerformance * numberOfApparatus
   ```

3. **Последовательное назначение времени**

   ```typescript
   currentTime = date.startTime

   for each item in sortedItems:
     if item.type === 'EVENT' && item.hasFixedTime:
       if item.fixedStartTime < currentTime:
         → CONFLICT: Event cannot fit (strict: throw, relaxed: shift)
       else:
         currentTime = item.fixedStartTime

     item.startTime = currentTime
     item.endTime = currentTime + item.duration
     currentTime = item.endTime + mandatoryBreak

   date.endTime = currentTime
   ```

4. **Обнаружение конфликтов**

   **Типы конфликтов:**
   - `FIXED_TIME_CONFLICT` - событие с фиксированным временем не помещается
   - `DAY_OVERFLOW` - день заканчивается позже разумного времени (например, после 23:00)
   - `OVERLAP` - два элемента накладываются друг на друга
   - `NEGATIVE_BREAK` - между элементами отрицательный перерыв

5. **Режимы работы**

   **Strict Mode:**
   - При любом конфликте возвращает ошибку
   - Не изменяет данные
   - Возвращает список конфликтов с предложениями

   **Relaxed Mode:**
   - Автоматически сдвигает элементы для разрешения конфликтов
   - Изменяет startTime у элементов с фиксированным временем (с предупреждением)
   - Сохраняет изменения
   - Возвращает список примененных исправлений

6. **Сдвиг дат при редактировании первого/последнего дня**

   **При изменении первого дня:**
   ```typescript
   daysDiff = newFirstDate - oldFirstDate

   for each otherDate in dates.slice(1):
     otherDate.date = otherDate.date + daysDiff
   ```

   **При изменении последнего дня:**
   - Последний день изменяется
   - Остальные даты не трогаются (т.к. они в прошлом)

### 4.3 События (Event Types)

```typescript
enum EventType {
  OPENING = 'OPENING',           // Открытие
  BREAK = 'BREAK',               // Перерыв
  PARADE = 'PARADE',             // Парад
  AWARDS = 'AWARDS',             // Награждение
  SHOWCASE = 'SHOWCASE',         // Показательное
  JUDGES_MEETING = 'JUDGES_MEETING', // Совещание судей
  ARRIVAL_DEPARTURE = 'ARRIVAL_DEPARTURE', // Приезд/отъезд
  FLOOR_TRAINING = 'FLOOR_TRAINING', // Опробование площадки
  OTHER = 'OTHER'                // Другое
}
```

**Поля события:**
- `type: EventType`
- `name: string` (опционально, например "Обеденный перерыв")
- `startTime: string` (HH:MM)
- `duration: number` (в секундах)
- `isFixed: boolean` (если true, startTime строго фиксировано)

### 4.4 Группы и потоки

**Группа (Group):**
- Содержит участников (athletes)
- Может иметь несколько видов программ (apparatus)
- Может быть разделена на потоки (streams)

**Расчет времени группы:**

**Вариант 1: Без потоков**
```
duration = numberOfAthletes × timePerPerformance × numberOfApparatus + breaks
```

**Вариант 2: С потоками (параллельные выступления)**
```
athletesPerStream = ceil(numberOfAthletes / numberOfStreams)
streamDuration = athletesPerStream × timePerPerformance × numberOfApparatus

duration = max(stream1.duration, stream2.duration, ...) + interStreamBreaks
```

**Пример:**
- 30 участников
- 2 вида программы (скакалка, мяч)
- Время выступления: 90 секунд
- Без потоков: 30 × 90 × 2 = 5400 секунд (1.5 часа)
- С 3 потоками: ceil(30/3) × 90 × 2 = 10 × 90 × 2 = 1800 секунд (30 минут)

## 5. Data Flow для ключевых операций

### 5.1 Добавление даты

```
User Action: Click "Add Date"
     │
     ▼
UI: Show DateForm (date, startTime, position)
     │
     ▼
User: Fill form & Submit
     │
     ▼
Frontend: POST /api/competitions/:id/dates
     │
     ▼
Backend: AddDateUseCase
     │
     ├─→ Validate input
     ├─→ Check position (beforeFirst/afterLast/afterDateId)
     ├─→ Insert date at position
     ├─→ Shift other dates if needed
     ├─→ Save to DB
     ├─→ Trigger ScheduleRecalculation
     │
     ▼
ScheduleRecalculationService
     │
     ├─→ Get all items for new date
     ├─→ Calculate durations
     ├─→ Assign times sequentially
     ├─→ Detect conflicts
     ├─→ Return result
     │
     ▼
Backend: Return updated competition with schedule
     │
     ▼
WebSocket: Emit 'date_added' event
     │
     ▼
Frontend: Update UI + Show conflicts if any
```

### 5.2 Редактирование даты (первый/последний)

```
User Action: Click "Edit Date"
     │
     ▼
UI: Check if first or last date
     │
     ├─→ If middle date: Show error "Cannot edit middle dates"
     │
     ▼
UI: Show DateForm (pre-filled)
     │
     ▼
User: Change date/time & Submit
     │
     ▼
UI: Show confirmation modal
     "Changing first/last date will shift other dates. Continue?"
     │
     ▼
User: Confirm
     │
     ▼
Frontend: PUT /api/competitions/:id/dates/:dateId
     │
     ▼
Backend: EditDateUseCase
     │
     ├─→ Validate (is first or last)
     ├─→ Calculate day shift
     ├─→ Update target date
     ├─→ Shift other dates
     ├─→ Save to DB
     ├─→ Trigger ScheduleRecalculation for all affected dates
     │
     ▼
WebSocket: Emit 'dates_shifted' event
     │
     ▼
Frontend: Update UI + Show diff of changes
```

### 5.3 Добавление события

```
User Action: Click "Add Event" on specific date
     │
     ▼
UI: Show EventForm (type, name, startTime, duration, isFixed)
     │
     ▼
User: Fill form & Submit
     │
     ▼
Frontend: POST /api/dates/:dateId/events
     │
     ▼
Backend: AddEventUseCase
     │
     ├─→ Validate input
     ├─→ Create Event entity
     ├─→ Insert into date.items with order
     ├─→ Save to DB
     ├─→ Trigger ScheduleRecalculation for this date
     │
     ▼
ScheduleRecalculationService
     │
     ├─→ Recalculate times for all items
     ├─→ Detect conflicts (especially with fixed events)
     ├─→ Return conflicts + suggestions
     │
     ▼
Backend: Return updated date with schedule
     │
     ▼
WebSocket: Emit 'event_added' + 'schedule_recalculated'
     │
     ▼
Frontend: Update UI + Show conflicts with suggestions
     │
     └─→ If conflicts: Show modal with options:
         - Extend day end time
         - Remove some breaks
         - Split group into streams
         - Change event time
```

### 5.4 Автоматический пересчет

```
Trigger: Any change (add/edit/delete date/event/group/athlete)
     │
     ▼
ScheduleRecalculationService.recalculate(competitionId)
     │
     ├─→ Get competition with all dates, items, groups, events
     │
     ├─→ For each date:
     │    │
     │    ├─→ Get sorted items (by order)
     │    │
     │    ├─→ For each item:
     │    │    ├─→ Calculate duration:
     │    │    │   ├─→ If Event: use event.duration
     │    │    │   └─→ If Group: calculate based on athletes & streams
     │    │    │
     │    │    ├─→ Assign startTime & endTime
     │    │    │
     │    │    └─→ Check for conflicts
     │    │
     │    └─→ Update date.endTime
     │
     ├─→ Collect all conflicts
     │
     ├─→ Generate suggestions for each conflict
     │
     └─→ Return ScheduleResult {
          success: boolean,
          conflicts: Conflict[],
          suggestions: Suggestion[],
          updatedSchedule: Schedule
        }
```

## 6. Conflict Detection & Resolution

### 6.1 Типы конфликтов

```typescript
interface Conflict {
  type: ConflictType;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  dateId: string;
  itemId?: string;
  message: string;
  details: any;
  suggestions: Suggestion[];
}

enum ConflictType {
  FIXED_TIME_CONFLICT = 'FIXED_TIME_CONFLICT',
  DAY_OVERFLOW = 'DAY_OVERFLOW',
  OVERLAP = 'OVERLAP',
  NEGATIVE_BREAK = 'NEGATIVE_BREAK',
  INSUFFICIENT_TIME = 'INSUFFICIENT_TIME'
}
```

### 6.2 Предложения по разрешению

```typescript
interface Suggestion {
  type: SuggestionType;
  description: string;
  action: AutoFixAction;
  impact: string;
}

enum SuggestionType {
  EXTEND_DAY = 'EXTEND_DAY',
  REDUCE_BREAKS = 'REDUCE_BREAKS',
  ADD_STREAMS = 'ADD_STREAMS',
  MOVE_TO_NEXT_DAY = 'MOVE_TO_NEXT_DAY',
  CHANGE_EVENT_TIME = 'CHANGE_EVENT_TIME',
  REMOVE_EVENT = 'REMOVE_EVENT'
}
```

**Примеры предложений:**

**Конфликт:** День заканчивается в 23:30 (слишком поздно)
```typescript
{
  type: 'ADD_STREAMS',
  description: 'Разделить группу "Девочки 10-11 лет" на 2 потока',
  action: { groupId: 'xxx', splitIntoStreams: 2 },
  impact: 'Сократит время группы с 2 часов до 1 часа. День закончится в 21:30'
}
```

**Конфликт:** Событие "Награждение" в 18:00 не помещается (предыдущие элементы заканчиваются в 18:30)
```typescript
{
  type: 'CHANGE_EVENT_TIME',
  description: 'Перенести награждение на 18:30',
  action: { eventId: 'xxx', newTime: '18:30' },
  impact: 'Награждение начнется на 30 минут позже'
}
```

## 7. WebSocket Events

### Подписка

```typescript
// Client subscribes to competition updates
socket.emit('subscribe:competition', { competitionId: 'xxx' });
```

### События от сервера

```typescript
// Date events
'date:added' → { competitionId, date: CompetitionDate }
'date:updated' → { competitionId, dateId, changes: Partial<CompetitionDate> }
'date:deleted' → { competitionId, dateId }
'dates:shifted' → { competitionId, shifts: Array<{ dateId, oldDate, newDate }> }

// Event events
'event:added' → { dateId, event: Event }
'event:updated' → { dateId, eventId, changes }
'event:deleted' → { dateId, eventId }

// Group events
'group:added' → { dateId, group: Group }
'group:updated' → { dateId, groupId, changes }
'group:deleted' → { dateId, groupId }

// Schedule events
'schedule:recalculating' → { competitionId, dateIds: string[] }
'schedule:recalculated' → {
  competitionId,
  success: boolean,
  conflicts: Conflict[],
  updatedDates: CompetitionDate[]
}

// Protocol events
'protocol:generated' → { competitionId, protocolId, url }
```

## 8. Export/Import

### Export formats

**Excel (.xlsx):**
- Лист 1: Общая информация о соревновании
- Лист 2: Расписание по дням (таблица с временами)
- Лист 3: Группы и участники
- Лист 4: Стартовый протокол

**PDF:**
- Официальное расписание для печати
- Стартовые протоколы для судей
- Программы для зрителей

**JSON:**
- Полный экспорт данных для бэкапа
- Импорт в другие системы

### Import templates

**Excel шаблон для массового добавления:**
- Участники (ФИО, дата рождения, клуб, группа)
- События (тип, название, время, длительность)
- Группы (название, категория, настройки)

## 9. Performance Optimization

### Кэширование

```typescript
// Cache schedule calculation results
const scheduleCache = new Map<string, ScheduleResult>();

// Invalidate cache on any change
function invalidateScheduleCache(competitionId: string) {
  scheduleCache.delete(competitionId);
}
```

### Debouncing

```typescript
// Debounce recalculation on rapid changes
const debouncedRecalculate = debounce(
  (competitionId: string) => recalculateSchedule(competitionId),
  2000
);
```

### Indexes

```sql
-- Database indexes for performance
CREATE INDEX idx_competition_dates ON competition_dates(competition_id, date);
CREATE INDEX idx_date_items ON date_items(date_id, order);
CREATE INDEX idx_group_athletes ON athletes(group_id);
```

## 10. Security & Permissions

### Role-based access

```typescript
enum Permission {
  CREATE_COMPETITION = 'competitions.create',
  EDIT_COMPETITION = 'competitions.edit',
  DELETE_COMPETITION = 'competitions.delete',
  MANAGE_DATES = 'competitions.dates.manage',
  MANAGE_GROUPS = 'competitions.groups.manage',
  VIEW_SCHEDULE = 'competitions.schedule.view',
  EXPORT_DATA = 'competitions.export'
}

// Check permission before operation
@RequirePermission(Permission.MANAGE_DATES)
async addDate(userId: string, competitionId: string, dto: AddDateDto) {
  // ...
}
```

## 11. Error Handling

### Стандартные ошибки

```typescript
class CompetitionError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

// Specific errors
class DateEditNotAllowedError extends CompetitionError {
  constructor(position: number) {
    super(
      'DATE_EDIT_NOT_ALLOWED',
      `Cannot edit date at position ${position}. Only first and last dates can be edited.`,
      { position }
    );
  }
}

class ScheduleConflictError extends CompetitionError {
  constructor(conflicts: Conflict[]) {
    super(
      'SCHEDULE_CONFLICT',
      'Schedule has conflicts that must be resolved',
      { conflicts }
    );
  }
}
```

## 12. Monitoring & Logging

### Метрики

- Время выполнения пересчета расписания
- Количество конфликтов на соревнование
- Частота редактирования дат
- Время генерации протоколов

### Логирование

```typescript
logger.info('Schedule recalculation started', {
  competitionId,
  datesCount,
  itemsCount
});

logger.warn('Schedule conflicts detected', {
  competitionId,
  conflictsCount,
  conflicts
});

logger.error('Schedule recalculation failed', {
  competitionId,
  error
});
```

## 13. Следующие шаги

1. ✅ Создать Prisma схему
2. ✅ Реализовать ScheduleCalculator (core algorithm)
3. ✅ Создать сервисы и use cases
4. ✅ Создать REST API контроллеры
5. ✅ Реализовать WebSocket gateway
6. ✅ Создать React компоненты
7. ✅ Написать unit тесты
8. ✅ Написать E2E тесты
9. ✅ Создать export/import функционал
