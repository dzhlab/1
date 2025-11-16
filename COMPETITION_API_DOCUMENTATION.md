# Competition Setup Module - API Documentation

## Base URL
```
http://localhost:4000/api/competitions
```

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer {token}` header.

---

## Competitions

### 1. Create Competition
Create a new competition.

**Endpoint:** `POST /api/competitions`

**Request Body:**
```json
{
  "name": "Чемпионат России по художественной гимнастике 2025",
  "shortName": "ЧР-2025",
  "description": "Национальный чемпионат по художественной гимнастике",
  "city": "Москва",
  "venue": "Дворец спорта Лужники",
  "address": "Лужнецкая наб., 24, стр. 1",
  "organizer": "Федерация художественной гимнастики России",
  "organizers": [
    "Федерация художественной гимнастики России",
    "Министерство спорта РФ"
  ],
  "contacts": {
    "phone": "+7 (495) 123-45-67",
    "email": "info@rusgymnastics.ru",
    "website": "https://rusgymnastics.ru"
  },
  "logoUrl": "https://example.com/logo.png",
  "status": "DRAFT",
  "scheduleSettings": {
    "defaultBreakBetweenGroups": 300,
    "defaultBreakBetweenStreams": 180,
    "minBreakBeforeEvent": 600,
    "maxDayEndTime": "22:00",
    "autoRecalculate": true
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "clx123abc456",
  "name": "Чемпионат России по художественной гимнастике 2025",
  "shortName": "ЧР-2025",
  "description": "Национальный чемпионат по художественной гимнастике",
  "city": "Москва",
  "venue": "Дворец спорта Лужники",
  "address": "Лужнецкая наб., 24, стр. 1",
  "organizer": "Федерация художественной гимнастики России",
  "organizers": [
    "Федерация художественной гимнастики России",
    "Министерство спорта РФ"
  ],
  "contacts": {
    "phone": "+7 (495) 123-45-67",
    "email": "info@rusgymnastics.ru",
    "website": "https://rusgymnastics.ru"
  },
  "logoUrl": "https://example.com/logo.png",
  "status": "DRAFT",
  "scheduleSettings": {
    "defaultBreakBetweenGroups": 300,
    "defaultBreakBetweenStreams": 180,
    "minBreakBeforeEvent": 600,
    "maxDayEndTime": "22:00",
    "autoRecalculate": true
  },
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z",
  "deleted": false
}
```

**Error Codes:**
- `400` - Invalid request data
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)

---

### 2. Get Competition
Get competition details with schedule.

**Endpoint:** `GET /api/competitions/:id`

**Response:** `200 OK`
```json
{
  "id": "clx123abc456",
  "name": "Чемпионат России по художественной гимнастике 2025",
  "shortName": "ЧР-2025",
  "city": "Москва",
  "venue": "Дворец спорта Лужники",
  "status": "PLANNING",
  "dates": [
    {
      "id": "date-1",
      "date": "2025-06-01",
      "dayNumber": 1,
      "order": 1,
      "startTime": "09:00",
      "endTime": "18:30",
      "scheduleStatus": "CALCULATED",
      "lastRecalculatedAt": "2025-01-15T10:30:00.000Z",
      "items": [
        {
          "id": "item-1",
          "type": "EVENT",
          "order": 1,
          "startTime": "09:00",
          "endTime": "09:30",
          "duration": 1800,
          "event": {
            "id": "event-1",
            "type": "OPENING",
            "name": "Открытие соревнований",
            "duration": 1800,
            "isFixedTime": false
          }
        },
        {
          "id": "item-2",
          "type": "GROUP",
          "order": 2,
          "startTime": "09:40",
          "endTime": "11:10",
          "duration": 5400,
          "group": {
            "id": "group-1",
            "name": "Девочки 10-11 лет, КМС",
            "discipline": "INDIVIDUAL",
            "ageCategory": "AGE_10_11",
            "programLevel": "KMS",
            "timePerPerformance": 90,
            "apparatus": ["ROPE", "HOOP", "BALL"],
            "useStreams": true,
            "numberOfStreams": 2,
            "totalAthletes": 30
          }
        }
      ]
    },
    {
      "id": "date-2",
      "date": "2025-06-02",
      "dayNumber": 2,
      "order": 2,
      "startTime": "10:00",
      "endTime": "17:00",
      "scheduleStatus": "CALCULATED",
      "items": []
    }
  ],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Error Codes:**
- `404` - Competition not found
- `401` - Unauthorized

---

### 3. Update Competition
Update competition information.

**Endpoint:** `PUT /api/competitions/:id`

**Request Body:**
```json
{
  "status": "REGISTRATION_OPEN",
  "description": "Обновленное описание"
}
```

**Response:** `200 OK`
```json
{
  "id": "clx123abc456",
  "name": "Чемпионат России по художественной гимнастике 2025",
  "status": "REGISTRATION_OPEN",
  "description": "Обновленное описание",
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

---

### 4. Delete Competition
Delete a competition (soft delete).

**Endpoint:** `DELETE /api/competitions/:id`

**Query Parameters:**
- `hard` (optional, boolean) - If true, performs hard delete. Default: false (soft delete)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Competition deleted successfully"
}
```

**Error Codes:**
- `404` - Competition not found
- `403` - Cannot delete competition (has started or completed)

---

## Dates Management

### 5. Add Date to Competition
Add a new date to competition.

**Endpoint:** `POST /api/competitions/:id/dates`

**Request Body:**
```json
{
  "date": "2025-06-03",
  "startTime": "09:00",
  "position": "afterLast",
  "notes": "Финальный день"
}
```

**Positions:**
- `beforeFirst` - Insert before the first date
- `afterLast` - Append after the last date
- `afterDateId` - Insert after specific date (requires `targetDateId`)

**Example with `afterDateId`:**
```json
{
  "date": "2025-06-02",
  "startTime": "10:00",
  "position": "afterDateId",
  "targetDateId": "date-1"
}
```

**Response:** `201 Created`
```json
{
  "id": "date-3",
  "competitionId": "clx123abc456",
  "date": "2025-06-03",
  "dayNumber": 3,
  "order": 3,
  "startTime": "09:00",
  "endTime": null,
  "scheduleStatus": "DRAFT",
  "items": [],
  "createdAt": "2025-01-15T11:00:00.000Z",
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

**Error Codes:**
- `400` - Invalid position or missing targetDateId
- `404` - Competition or target date not found

---

### 6. Edit Date (First or Last Only!)
Edit competition date. **Only first and last dates can be edited directly.**

**Endpoint:** `PUT /api/competitions/:competitionId/dates/:dateId`

**Request Body:**
```json
{
  "date": "2025-06-05",
  "startTime": "10:00"
}
```

**Response:** `200 OK`
```json
{
  "date": {
    "id": "date-3",
    "date": "2025-06-05",
    "startTime": "10:00",
    "updatedAt": "2025-01-15T12:00:00.000Z"
  },
  "shifts": [
    {
      "dateId": "date-2",
      "oldDate": "2025-06-02",
      "newDate": "2025-06-04",
      "daysDifference": 2
    }
  ],
  "recalculation": {
    "success": true,
    "conflicts": [],
    "statistics": {
      "totalDays": 3,
      "totalItems": 5,
      "conflictsCount": 0
    }
  }
}
```

**Error Codes:**
- `400` - Cannot edit middle date (only first/last allowed)
- `404` - Date not found

---

### 7. Delete Date
Delete a competition date.

**Endpoint:** `DELETE /api/competitions/:competitionId/dates/:dateId`

**Response:** `200 OK`
```json
{
  "success": true,
  "deletedItems": {
    "items": 5,
    "groups": 2,
    "events": 3,
    "athletes": 45
  }
}
```

**Warning:** This will delete all groups, events, and athletes associated with this date.

---

## Events Management

### 8. Add Event to Date
Add an event to a specific date.

**Endpoint:** `POST /api/dates/:dateId/events`

**Request Body:**
```json
{
  "type": "AWARDS",
  "name": "Награждение победителей",
  "description": "Церемония награждения",
  "duration": 1800,
  "isFixedTime": true,
  "fixedStartTime": "18:00",
  "participants": ["Группа 10-11 лет", "Группа 12-13 лет"],
  "location": "Центральная арена",
  "order": 10
}
```

**Event Types:**
- `OPENING` - Открытие
- `BREAK` - Перерыв
- `PARADE` - Парад
- `AWARDS` - Награждение
- `SHOWCASE` - Показательное выступление
- `JUDGES_MEETING` - Совещание судей
- `ARRIVAL_DEPARTURE` - Приезд/отъезд
- `FLOOR_TRAINING` - Опробование площадки
- `OTHER` - Другое

**Response:** `201 Created`
```json
{
  "id": "event-5",
  "type": "AWARDS",
  "name": "Награждение победителей",
  "description": "Церемония награждения",
  "duration": 1800,
  "isFixedTime": true,
  "fixedStartTime": "18:00",
  "participants": ["Группа 10-11 лет", "Группа 12-13 лет"],
  "location": "Центральная арена",
  "dateItem": {
    "id": "item-10",
    "type": "EVENT",
    "order": 10,
    "startTime": "18:00",
    "endTime": "18:30",
    "duration": 1800
  },
  "createdAt": "2025-01-15T13:00:00.000Z"
}
```

---

### 9. Update Event
Update event details.

**Endpoint:** `PUT /api/events/:eventId`

**Request Body:**
```json
{
  "duration": 2400,
  "fixedStartTime": "18:30"
}
```

**Response:** `200 OK`

---

### 10. Delete Event
Delete an event.

**Endpoint:** `DELETE /api/events/:eventId`

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Groups Management

### 11. Add Group to Date
Add a group of athletes to a date.

**Endpoint:** `POST /api/dates/:dateId/groups`

**Request Body:**
```json
{
  "name": "Девочки 12-13 лет, КМС",
  "discipline": "INDIVIDUAL",
  "ageCategory": "AGE_12_13",
  "programLevel": "KMS",
  "timePerPerformance": 90,
  "apparatus": ["ROPE", "HOOP", "BALL"],
  "apparatusOrder": ["ROPE", "HOOP", "BALL"],
  "useStreams": true,
  "numberOfStreams": 2,
  "order": 3
}
```

**Response:** `201 Created`
```json
{
  "id": "group-3",
  "name": "Девочки 12-13 лет, КМС",
  "discipline": "INDIVIDUAL",
  "ageCategory": "AGE_12_13",
  "programLevel": "KMS",
  "timePerPerformance": 90,
  "apparatus": ["ROPE", "HOOP", "BALL"],
  "apparatusOrder": ["ROPE", "HOOP", "BALL"],
  "useStreams": true,
  "numberOfStreams": 2,
  "totalAthletes": 0,
  "calculatedDuration": null,
  "dateItem": {
    "id": "item-3",
    "type": "GROUP",
    "order": 3
  },
  "createdAt": "2025-01-15T14:00:00.000Z"
}
```

---

### 12. Update Group
Update group settings.

**Endpoint:** `PUT /api/groups/:groupId`

**Request Body:**
```json
{
  "numberOfStreams": 3,
  "useStreams": true
}
```

**Response:** `200 OK`

---

### 13. Delete Group
Delete a group.

**Endpoint:** `DELETE /api/groups/:groupId`

**Response:** `200 OK`

---

## Schedule Recalculation

### 14. Recalculate Schedule
Trigger manual schedule recalculation for a competition or specific date.

**Endpoint:** `POST /api/competitions/:id/recalculate`

**Request Body:**
```json
{
  "mode": "relaxed",
  "breakBetweenItems": 300,
  "breakBetweenStreams": 180,
  "minBreakBeforeEvent": 600,
  "maxDayEndTime": "22:00",
  "autoSave": true
}
```

**Modes:**
- `strict` - Stop on first conflict (ERROR severity)
- `relaxed` - Automatically resolve conflicts when possible

**Response:** `200 OK`
```json
{
  "success": true,
  "conflicts": [
    {
      "type": "DAY_OVERFLOW",
      "severity": "WARNING",
      "dateId": "date-1",
      "message": "День заканчивается слишком поздно (23:15). Превышение: 75 минут.",
      "details": {
        "calculatedEndTime": "23:15",
        "maxEndTime": "22:00",
        "overflowSeconds": 4500,
        "overflowMinutes": 75
      },
      "suggestions": [
        {
          "type": "ADD_STREAMS",
          "description": "Разделить самую длинную группу \"Девочки 10-11 лет\" на 3 потока",
          "action": {
            "groupId": "group-1",
            "numberOfStreams": 3
          },
          "impact": "Сократит время группы на 45 минут",
          "estimatedImprovement": 2700
        },
        {
          "type": "REDUCE_BREAKS",
          "description": "Сократить перерывы между элементами до 3 минут",
          "action": {
            "newBreakDuration": 180
          },
          "impact": "Сократит общее время дня"
        }
      ]
    }
  ],
  "updatedDates": [
    {
      "id": "date-1",
      "date": "2025-06-01",
      "startTime": "09:00",
      "endTime": "23:15",
      "items": [
        {
          "id": "item-1",
          "startTime": "09:00",
          "endTime": "09:30",
          "duration": 1800
        }
      ]
    }
  ],
  "statistics": {
    "totalDays": 3,
    "totalItems": 15,
    "totalDuration": 36000,
    "conflictsCount": 1,
    "suggestionsCount": 2
  },
  "executionTime": 245
}
```

**Conflict Types:**
- `FIXED_TIME_CONFLICT` - Event with fixed time doesn't fit
- `DAY_OVERFLOW` - Day ends too late
- `OVERLAP` - Items overlap
- `NEGATIVE_BREAK` - Negative break between items
- `INSUFFICIENT_TIME` - Not enough time

**Suggestion Types:**
- `EXTEND_DAY` - Extend day end time
- `REDUCE_BREAKS` - Reduce breaks between items
- `ADD_STREAMS` - Split group into more streams
- `MOVE_TO_NEXT_DAY` - Move items to next day
- `CHANGE_EVENT_TIME` - Change event start time
- `REMOVE_EVENT` - Remove event

---

### 15. Get Current Schedule
Get the current calculated schedule.

**Endpoint:** `GET /api/competitions/:id/schedule`

**Response:** `200 OK`
```json
{
  "competitionId": "clx123abc456",
  "dates": [
    {
      "id": "date-1",
      "date": "2025-06-01",
      "dayNumber": 1,
      "startTime": "09:00",
      "endTime": "18:30",
      "scheduleStatus": "CALCULATED",
      "items": [
        {
          "id": "item-1",
          "type": "EVENT",
          "startTime": "09:00",
          "endTime": "09:30",
          "duration": 1800,
          "event": {
            "type": "OPENING",
            "name": "Открытие"
          }
        },
        {
          "id": "item-2",
          "type": "GROUP",
          "startTime": "09:40",
          "endTime": "11:10",
          "duration": 5400,
          "group": {
            "name": "Девочки 10-11 лет",
            "totalAthletes": 30
          }
        }
      ]
    }
  ],
  "conflicts": [],
  "lastRecalculatedAt": "2025-01-15T10:30:00.000Z"
}
```

---

## Export

### 16. Export Competition
Export competition data in various formats.

**Endpoint:** `POST /api/competitions/:id/export`

**Request Body:**
```json
{
  "format": "xlsx",
  "includeAthletes": true,
  "includeSchedule": true,
  "includeProtocols": true
}
```

**Formats:**
- `xlsx` - Excel file
- `pdf` - PDF document
- `json` - JSON file (for backup/import)

**Response:** `200 OK`
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (for xlsx)
- Content-Type: `application/pdf` (for pdf)
- Content-Type: `application/json` (for json)

File download with filename: `competition_{name}_{date}.{format}`

---

## Items Reordering

### 17. Reorder Items in Date
Change the order of groups and events within a date.

**Endpoint:** `POST /api/dates/:dateId/reorder`

**Request Body:**
```json
{
  "itemIds": [
    "item-1",
    "item-3",
    "item-2",
    "item-5",
    "item-4"
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "updatedItems": [
    {
      "id": "item-1",
      "order": 1
    },
    {
      "id": "item-3",
      "order": 2
    }
  ],
  "recalculation": {
    "success": true,
    "conflicts": []
  }
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "statusCode": 400,
  "message": "Invalid request data",
  "error": "Bad Request",
  "details": {
    "field": "startTime",
    "issue": "must be in HH:MM format"
  }
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., trying to delete competition in progress)
- `500` - Internal Server Error

---

## Rate Limiting
- 100 requests per minute per user
- 1000 requests per hour per user

Exceeded rate limit returns `429 Too Many Requests`.

---

## Pagination
List endpoints support pagination via query parameters:

```
GET /api/competitions?page=1&limit=20&sortBy=createdAt&order=desc
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Field to sort by (default: createdAt)
- `order` - Sort order: `asc` or `desc` (default: desc)

Response includes pagination metadata:

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```
