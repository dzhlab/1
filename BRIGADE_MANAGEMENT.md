// Brigade Management System Documentation

Complete system for managing judging brigades with simplified judge login.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [User Roles](#user-roles)
- [Workflow](#workflow)
- [Components](#components)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Usage Guide](#usage-guide)

---

## Overview

The Brigade Management System allows Technical Specialists, Secretaries, and Chief Judges to:

1. **Create** judging brigades
2. **Assign** judges to brigades with specific roles
3. **Manage** brigade composition (add/remove judges)
4. **Provide** simplified login for judges (select name from list)

Judges can then easily log in by selecting their name, automatically entering their assigned panel.

---

## Features

### ✅ Brigade Creation
- Create named brigades (e.g., "Бригада #1", "D-Panel группа A")
- Optional brigade numbering
- Specialization types (D_PANEL, E_PANEL, A_PANEL, TECHNICAL, MIXED)
- Description and notes

### ✅ Judge Assignment
- Assign judges to specific roles (D1, D2, E1, E2, etc.)
- Mark judges as primary or backup
- Prevent duplicate role assignments
- View judges by panel type

### ✅ Simplified Judge Login
- **Two view modes:**
  - **Judge List** - All judges alphabetically
  - **By Brigades** - Grouped by brigade
- **Search functionality** - Find judge by name, brigade, or role
- **One-click login** - Select name → automatic panel entry
- **Auto-routing** - Automatically directed to correct panel (D/E/A/Line/Time/Chief)

### ✅ Brigade Management
- View all brigades
- Edit brigade details
- Activate/deactivate brigades
- Delete brigades (with safety checks)
- View statistics (judges count, sessions count)

---

## User Roles

### **Technical Specialist / Secretary / Chief Judge**
**Can:**
- Create and manage brigades
- Assign judges to brigades
- View brigade statistics
- Manage judge assignments

**Cannot:**
- Enter judging panels (they manage, not judge)

### **Judges (D1-D4, E1-E4, A1-A2, Line, Time, Chief)**
**Can:**
- Select their name from simplified login
- Automatically enter their assigned panel
- Submit scores in their panel

**Cannot:**
- Create or manage brigades
- Assign other judges

---

## Workflow

### 1. Brigade Creation (Technical Specialist)

```
Technical Specialist opens Brigade Management
  ↓
Clicks "Create Brigade"
  ↓
Fills form:
  - Name: "Бригада #1"
  - Number: 1
  - Description: "Main judging brigade for competition"
  - Specialization: "MIXED"
  ↓
Saves brigade
  ↓
Brigade appears in list
```

### 2. Judge Assignment (Technical Specialist)

```
Technical Specialist opens brigade "Бригада #1"
  ↓
Clicks "Assign Judges"
  ↓
For each judge:
  1. Selects judge from available list
  2. Assigns role (D1, D2, E1, E2, etc.)
  3. Marks as primary/backup
  4. Saves assignment
  ↓
All judges assigned and visible in panel groups
```

### 3. Judge Login (Judge)

```
Judge opens Judge Login page
  ↓
Judge sees two options:
  - "List of Judges" (📋)
  - "By Brigades" (👥)
  ↓
Judge selects "List of Judges"
  ↓
Judge searches for their name: "Ivanova Maria"
  ↓
Clicks on their card:
  📊 Ivanova Maria
  D1
  Brigade: Бригада #1
  →
  ↓
System generates auth token
  ↓
Judge automatically enters D-Panel
  ↓
Judge sees current performer and scoring interface
```

---

## Components

### **Frontend Components**

#### 1. BrigadeManagement.tsx
**Location:** `judging-frontend/admin/BrigadeManagement.tsx`

**Purpose:** Main interface for creating and managing brigades

**Features:**
- Create brigade modal
- Brigades grid display
- Edit/delete/activate/deactivate
- Brigade details panel
- Link to judge assignment

**UI Example:**
```
┌────────────────────────────────────────────────────┐
│ 👥 Управление судейскими бригадами  [+ Создать]   │
├────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐               │
│  │ Бригада #1   │  │ Бригада #2   │               │
│  │ [Активна]    │  │ [Неактивна]  │               │
│  │ 📊 D-Panel   │  │ 🔀 Mixed     │               │
│  │ 👤 8 судей   │  │ 👤 6 судей   │               │
│  │ [✏️][🔒][🗑️] │  │ [✏️][🔓][🗑️] │               │
│  └──────────────┘  └──────────────┘               │
└────────────────────────────────────────────────────┘
```

#### 2. JudgeAssignment.tsx
**Location:** `judging-frontend/admin/JudgeAssignment.tsx`

**Purpose:** Assign judges to specific roles within a brigade

**Features:**
- View available judges
- Assign role (D1, E1, A1, etc.)
- Mark primary/backup
- Remove judges
- View by panel (D/E/A/Technical)

**UI Example:**
```
┌────────────────────────────────────────────────────┐
│ [← Назад]  Бригада #1    [+ Добавить судью]       │
├────────────────────────────────────────────────────┤
│ 📊 D-Panel (Трудность)                            │
│  ┌────────────┐  ┌────────────┐                   │
│  │ D1         │  │ D2         │                   │
│  │ Иванова М. │  │ Петрова А. │                   │
│  │ [Основной] │  │ [Основной] │                   │
│  │ [🔽][🗑️]  │  │ [🔽][🗑️]  │                   │
│  └────────────┘  └────────────┘                   │
│                                                    │
│ 🎯 E-Panel (Исполнение)                           │
│  ...                                               │
└────────────────────────────────────────────────────┘
```

#### 3. JudgeLogin.tsx
**Location:** `judging-frontend/JudgeLogin.tsx`

**Purpose:** Simplified login interface for judges

**Features:**
- Two view modes (list/brigades)
- Search functionality
- One-click login
- Auto-routing to correct panel

**UI Example:**
```
┌────────────────────────────────────────────────────┐
│ 👨‍⚖️ Вход для судей                                │
│ Выберите свою фамилию из списка                    │
├────────────────────────────────────────────────────┤
│ [📋 Список судей] [👥 По бригадам]                │
│                                                    │
│ [Поиск: ____________  ✕]                          │
│                                                    │
│  ┌──────────────────────────────┐                 │
│  │ 📊 Иванова Мария       →    │                 │
│  │ D1                            │                 │
│  │ Бригада: Бригада #1          │                 │
│  └──────────────────────────────┘                 │
│                                                    │
│  ┌──────────────────────────────┐                 │
│  │ 🎯 Петрова Анна        →    │                 │
│  │ E1                            │                 │
│  │ Бригада: Бригада #1          │                 │
│  └──────────────────────────────┘                 │
└────────────────────────────────────────────────────┘
```

### **Backend Services**

#### 1. brigade.service.ts
**Location:** `judging-backend/services/brigade.service.ts`

**Methods:**
- `findAll()` - Get all brigades
- `findOne(id)` - Get brigade details
- `create(dto)` - Create new brigade
- `update(id, dto)` - Update brigade
- `delete(id)` - Delete brigade
- `assignJudge(brigadeId, dto)` - Assign judge to brigade
- `updateJudgeAssignment()` - Update assignment
- `removeJudge()` - Remove judge from brigade
- `getBrigadeJudges()` - Get all judges in brigade
- `getJudgeBrigade()` - Get judge's brigade assignment
- `getBrigadeStats()` - Get brigade statistics

#### 2. brigade.controller.ts
**Location:** `judging-backend/controllers/brigade.controller.ts`

**Endpoints:** See [API Endpoints](#api-endpoints) section

---

## API Endpoints

### **Brigade CRUD**

```
GET    /brigades
GET    /brigades/:id
POST   /brigades
PATCH  /brigades/:id
DELETE /brigades/:id
```

### **Judge Assignment**

```
GET    /brigades/:id/judges
POST   /brigades/:id/judges
PATCH  /brigades/:id/judges/:assignmentId
DELETE /brigades/:id/judges/:assignmentId
```

### **Statistics**

```
GET    /brigades/:id/stats
```

### **Judge Login**

```
POST   /auth/judge-login
GET    /auth/judge-brigades/:judgeId
```

---

## Database Schema

### **JudgingBrigade**

```prisma
model JudgingBrigade {
  id                  String   @id @default(cuid())
  name                String   @db.VarChar(200)
  number              Int?
  description         String?  @db.VarChar(500)
  competitionId       String?
  specializationType  String?  @db.VarChar(50)
  isActive            Boolean  @default(true)
  judges              JudgeInBrigade[]
  sessions            JudgingSession[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           String?
}
```

### **JudgeInBrigade**

```prisma
model JudgeInBrigade {
  id          String          @id @default(cuid())
  brigade     JudgingBrigade  @relation(...)
  brigadeId   String
  judgeId     String
  judgeName   String          @db.VarChar(200)
  judgeRole   JudgeRole       // D1, D2, E1, E2, etc.
  panelType   JudgePanelType  // D_PANEL, E_PANEL, etc.
  isPrimary   Boolean         @default(false)
  isActive    Boolean         @default(true)
  assignedAt  DateTime        @default(now())
  assignedBy  String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}
```

### **JudgingSession (updated)**

```prisma
model JudgingSession {
  id          String   @id @default(cuid())
  // ... existing fields ...
  brigade     JudgingBrigade? @relation(...)
  brigadeId   String?
  // ... existing fields ...
}
```

---

## Usage Guide

### **For Technical Specialists / Secretaries**

#### 1. Create Brigade

```typescript
POST /brigades
{
  "name": "Бригада #1",
  "number": 1,
  "description": "Main judging brigade",
  "specializationType": "MIXED",
  "competitionId": "comp-123"
}
```

#### 2. Assign Judges

```typescript
POST /brigades/{brigadeId}/judges
{
  "judgeId": "user-1",
  "judgeName": "Иванова Мария",
  "judgeRole": "D1",
  "panelType": "D_PANEL",
  "isPrimary": true
}
```

#### 3. View Brigade

```typescript
GET /brigades/{brigadeId}?includeJudges=true

Response:
{
  "id": "brigade-1",
  "name": "Бригада #1",
  "number": 1,
  "judges": [
    {
      "id": "assignment-1",
      "judgeId": "user-1",
      "judgeName": "Иванова Мария",
      "judgeRole": "D1",
      "panelType": "D_PANEL",
      "isPrimary": true
    }
  ],
  "judgesCount": 8,
  "sessionsCount": 3
}
```

### **For Judges**

#### 1. Open Judge Login Page

Navigate to: `https://app.example.com/judge-login`

#### 2. Find Your Name

Use search or scroll through list:
- View mode: "List of Judges" or "By Brigades"
- Search: Type your last name

#### 3. Click Your Card

```
┌──────────────────────────────┐
│ 📊 Иванова Мария       →    │
│ D1                            │
│ Бригада: Бригада #1          │
└──────────────────────────────┘
```

#### 4. Auto-Login

System will:
1. Generate auth token
2. Determine your panel (D-Panel for D1)
3. Redirect to D-Panel interface
4. Load current judging session

#### 5. Start Judging

You'll see:
- Current performer
- Your scoring interface (BD/AD for D-Panel)
- Other judges' status

---

## Security Considerations

### **Simplified Login**

The simplified judge login uses a **single-click authentication** without passwords. This is suitable for:

✅ **Local networks** - Competition venue with controlled access
✅ **Temporary sessions** - Short-term judging events
✅ **Known participants** - Pre-registered judges only

For **production environments**, consider:
- Adding PIN codes for judges
- Using QR code authentication
- Implementing full JWT with refresh tokens

### **Role-Based Access**

- **Judges** can only access their assigned panel
- **Technical Specialists** can manage brigades
- **Chief Judges** can control sessions

---

## Example Scenarios

### **Scenario 1: Create Brigade for Regional Competition**

```
1. Technical Specialist logs in
2. Opens Brigade Management
3. Clicks "Create Brigade"
4. Fills:
   - Name: "Regional Cup - Main Brigade"
   - Number: 1
   - Specialization: MIXED
5. Saves brigade
6. Clicks "Assign Judges"
7. Assigns 8 judges (D1, D2, E1-E4, A1, A2)
8. All judges can now log in via simplified login
```

### **Scenario 2: Judge Login and Score Submission**

```
1. Judge "Иванова Мария" arrives at venue
2. Opens tablet, navigates to judge login
3. Searches for "Иванова"
4. Sees her card: "📊 Иванова Мария, D1, Бригада #1"
5. Clicks card
6. Automatically enters D-Panel
7. Sees current performer: "Петрова Анна (#5)"
8. Enters BD elements: BD1 (0.3), BD2 (0.5)
9. Enters AD elements: AD1 (0.4)
10. Total D: 1.2
11. Clicks "Submit"
12. Other D-judges see her submission
```

### **Scenario 3: Replace Judge Mid-Competition**

```
1. Judge D2 gets sick
2. Technical Specialist opens Brigade Management
3. Opens "Бригада #1"
4. Clicks "Assign Judges"
5. Removes old D2
6. Assigns replacement judge as D2
7. Replacement judge can immediately log in
8. New D2 sees current session and continues judging
```

---

## Files Created

### **Frontend:**
- `judging-frontend/admin/BrigadeManagement.tsx` - Brigade management UI
- `judging-frontend/admin/JudgeAssignment.tsx` - Judge assignment UI
- `judging-frontend/JudgeLogin.tsx` - Simplified judge login

### **Backend:**
- `judging-backend/services/brigade.service.ts` - Brigade service
- `judging-backend/controllers/brigade.controller.ts` - API endpoints

### **Database:**
- `prisma/judging-schema.prisma` - Updated with brigade models

### **Documentation:**
- `BRIGADE_MANAGEMENT.md` - This file

---

## Next Steps

1. **Styling:** Add CSS for all components
2. **Mobile Optimization:** Responsive design for tablets
3. **QR Code Login:** Generate QR codes for judges
4. **PIN Protection:** Add optional PIN for judges
5. **Brigade Templates:** Pre-configured brigade setups

---

**Documentation Version:** 1.0
**Last Updated:** 2025-11-16
