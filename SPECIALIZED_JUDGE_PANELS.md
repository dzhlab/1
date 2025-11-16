# Specialized Judge Panels Documentation

Complete implementation of specialized judging panels for gymnastics competition platform with panel-specific dashboards and real-time synchronization.

## Table of Contents

- [Overview](#overview)
- [Panel Types](#panel-types)
- [Architecture](#architecture)
- [Components](#components)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Usage Guide](#usage-guide)

---

## Overview

This module implements **6 specialized judging panels**, each with unique functionality tailored to their role in gymnastics judging according to FIG 2025-2028 rules:

1. **D-Panel** (📊) - Difficulty scoring (BD/DA)
2. **E-Panel** (🎯) - Execution scoring with deductions
3. **A-Panel** (🎨) - Artistry scoring (5 components)
4. **Line Judge** (📏) - Line fault tracking
5. **Time Keeper** (⏱️) - Performance timing
6. **Chief Judge** (👨‍⚖️) - Master control panel

### Key Features

✅ **Panel-Specific UI** - Each panel has custom interface for their judging criteria
✅ **Real-time Sync** - Instant updates across all connected judges
✅ **Automatic Routing** - Judges are automatically directed to their panel
✅ **Role-Based Permissions** - Only authorized roles can control session flow
✅ **Reconnection Handling** - Automatic state recovery after network loss
✅ **Score Locking** - Prevent edits after chief judge locks scores

---

## Panel Types

### 1. D-Panel (Difficulty Panel)

**Roles:** D1, D2, D3, D4

**Function:** Evaluate difficulty elements (Body Difficulties and Apparatus Difficulties)

**UI Components:**
- BD/AD value buttons (0.1 - 1.0 for BD, 0.1 - 0.8 for AD)
- Element validation toggles
- Live calculation of Total D (BD + AD)
- Other D-judges' status display

**Data Structure:**
```typescript
{
  bodyDifficulties: [
    { code: "BD1", value: 0.3, validated: true },
    { code: "BD2", value: 0.5, validated: true }
  ],
  apparatusDifficulties: [
    { code: "AD1", value: 0.4, validated: true }
  ],
  totalBD: 0.8,
  totalAD: 0.4,
  totalD: 1.2
}
```

**WebSocket Events:**
- `d:score:submit` - Submit D-score
- `d:score:submitted` - Broadcast to other D-judges

---

### 2. E-Panel (Execution Panel)

**Roles:** E1, E2, E3, E4

**Function:** Evaluate execution through deductions system

**UI Components:**
- Artistic deductions (Body posture, amplitude, apparatus handling, etc.)
- Technical deductions (Balance loss, falls, apparatus loss, etc.)
- Line faults display (updated by line judge)
- Final E-score calculation (10.0 - deductions)

**Deduction Categories:**
```typescript
// Artistic Deductions
BODY: {
  POSTURE: [0.1, 0.2, 0.3],
  AMPLITUDE: [0.1, 0.2, 0.3],
  FLEXIBILITY: [0.1, 0.2]
},
APPARATUS: {
  HANDLING: [0.1, 0.2, 0.3],
  PRECISION: [0.1, 0.2]
}

// Technical Deductions
BALANCE_LOSS_SMALL: 0.1,
BALANCE_LOSS_MEDIUM: 0.3,
BALANCE_LOSS_LARGE: 0.5,
FALL: 0.5,
APPARATUS_LOSS: 0.5
```

**WebSocket Events:**
- `e:score:submit` - Submit E-score
- `e:score:submitted` - Broadcast to other E-judges
- `line:faults:updated` - Receive line faults from line judge

---

### 3. A-Panel (Artistry Panel)

**Roles:** A1, A2

**Function:** Evaluate artistry across 5 components (FIG 2025-2028)

**Components:**
1. **Music Relation** (0.00 - 2.00) - Musicality and movement-music correspondence
2. **Body Expression** (0.00 - 2.00) - Expressiveness, emotion, artistry
3. **Space Use** (0.00 - 2.00) - Movements, levels, directions
4. **Composition** (0.00 - 2.00) - Choreography, variety, balance
5. **Unity** (0.00 - 2.00) - Unity of movement and apparatus, harmony

**UI Components:**
- Slider for each component (0.05 increment)
- Quick preset buttons (0.5, 1.0, 1.5, 2.0)
- Live total calculation (max 10.0)
- Progress bars for visual feedback

**WebSocket Events:**
- `a:score:submit` - Submit A-score
- `a:score:submitted` - Broadcast to other A-judges

---

### 4. Line Judge Panel

**Role:** LINE_JUDGE

**Function:** Track line faults (заступы за линию)

**UI Components:**
- Quick buttons for each side (Left, Right, Front, Back)
- Fault type selection (Foot out, Apparatus out, Body out)
- Live fault counter
- Automatic penalty calculation (0.05 per fault)

**Data Structure:**
```typescript
{
  faults: [
    { timestamp: "2025-05-31T10:15:23Z", side: "LEFT", type: "FOOT_OUT" },
    { timestamp: "2025-05-31T10:16:45Z", side: "RIGHT", type: "APPARATUS_OUT" }
  ],
  totalFaults: 2,
  penalty: 0.10
}
```

**WebSocket Events:**
- `line:fault:added` - Add fault and broadcast to E-judges
- `line:fault:removed` - Remove fault
- `line:faults:confirm` - Lock fault count

**Real-time Broadcasting:**
When line judge adds fault → **instant update** to all E-panel judges

---

### 5. Time Keeper Panel

**Role:** TIME_KEEPER

**Function:** Track performance duration and music timing

**UI Components:**
- Main timer with millisecond precision
- Music timer (separate)
- Time limit indicators (1:15 min, 1:30 max)
- Automatic penalty calculation
- Color-coded status (Normal, Warning, Overtime, Undertime)

**Time Limits (FIG 2025-2028):**
- **Minimum:** 1:15 (75 seconds)
- **Maximum:** 1:30 (90 seconds)
- **Penalty:** 0.05 per second over/under

**Data Structure:**
```typescript
{
  startTime: "2025-05-31T10:15:00Z",
  endTime: "2025-05-31T10:16:25Z",
  duration: 85000,  // 1:25 (milliseconds)
  musicDuration: 83500,
  isOvertime: false,
  isUndertime: false,
  timePenalty: 0
}
```

**WebSocket Events:**
- `time:performance:started` - Broadcast performance start
- `time:performance:stopped` - Broadcast performance end with timing data
- `performance:started` - Received by all judges
- `performance:ended` - Received by all judges

---

### 6. Chief Judge Panel

**Role:** CHIEF_JUDGE

**Function:** Master control panel for session management

**UI Components:**
- Session controls (Start, Pause, Resume, Complete)
- Current performer display
- Navigation controls (Next, Previous, Jump to)
- Judge connection status (all panels)
- Score submission tracking
- Score locking controls
- Performer list with status

**Permissions:**
✅ Start/Stop session
✅ Move to next performer
✅ Lock/Reopen scores
✅ Skip performers
✅ View all judges' scores
✅ Invalidate scores

**Judge Status Display:**
```
📊 D-Panel: D1 [🟢 ✓ 1.234], D2 [🟢 ○]
🎯 E-Panel: E1 [🟢 ✓ 8.750], E2 [🟢 ✓ 8.800]
🎨 A-Panel: A1 [🟢 ✓ 7.500], A2 [🔴 ○]
⚙️ Technical: Line Judge [🟢], Time Keeper [🟢]
```

**WebSocket Events:**
- `chief:session:start` - Start session
- `chief:session:pause` - Pause session
- `chief:performer:next` - Move to next performer
- `chief:scores:lock` - Lock all scores for current performer
- `chief:scores:reopen` - Reopen scores for editing
- `chief:score:invalidate` - Invalidate specific judge's score

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      WebSocket Gateway                          │
│                 (judging-panels.gateway.ts)                     │
└───────────────┬─────────────────────────────────────────────────┘
                │
    ┌───────────┼───────────┬───────────┬───────────┬───────────┐
    │           │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼           ▼
┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
│D-Panel│   │E-Panel│   │A-Panel│   │  Line │   │ Time  │   │ Chief │
│  D1   │   │  E1   │   │  A1   │   │ Judge │   │Keeper │   │ Judge │
└───────┘   └───────┘   └───────┘   └───────┘   └───────┘   └───────┘
    │           │           │           │           │           │
    └───────────┴───────────┴───────────┴───────────┴───────────┘
                                │
                         ┌──────▼──────┐
                         │   Prisma    │
                         │  Database   │
                         └─────────────┘
```

### Component Structure

```
judging-frontend/
├── panels/
│   ├── DPanel.tsx              # D-brigade panel
│   ├── EPanel.tsx              # E-brigade panel
│   ├── APanel.tsx              # A-brigade panel
│   ├── LineJudgePanel.tsx      # Line judge panel
│   ├── TimeKeeperPanel.tsx     # Time keeper panel
│   └── ChiefJudgePanel.tsx     # Chief judge control panel
├── JudgingPanelRouter.tsx      # Auto-routing based on role
└── JudgePanel.tsx              # Legacy (deprecated)

judging-backend/
├── judging-panels.gateway.ts   # Updated WebSocket gateway
└── judging.gateway.ts          # Legacy (deprecated)

prisma/
└── judging-schema.prisma       # Updated with panel-specific models
```

---

## WebSocket Events

### Connection Events

```typescript
// Client → Server
'join:session' → { sessionId: string }

// Server → Client
'session:joined' → {
  sessionId: string,
  currentPerformer: Performer,
  myScore?: Score,
  otherDJudges?: JudgeStatus[],  // For D-panel
  otherEJudges?: JudgeStatus[],  // For E-panel
  otherAJudges?: JudgeStatus[]   // For A-panel
}

'judge:connected' → { judgeId, judgeName, judgeRole }
'judge:disconnected' → { judgeId, judgeName, disconnectedAt }
```

### Score Submission Events

```typescript
// D-Panel
'd:score:submit' → { sessionId, performerId, scoreData }
'd:score:submitted' → { judgeId, judgeRole, totalD }

// E-Panel
'e:score:submit' → { sessionId, performerId, scoreData }
'e:score:submitted' → { judgeId, judgeRole, finalE }

// A-Panel
'a:score:submit' → { sessionId, performerId, scoreData }
'a:score:submitted' → { judgeId, judgeRole, totalA }
```

### Performer Control Events

```typescript
// Chief Judge → Server
'chief:performer:next' → { sessionId, force? }
'chief:performer:previous' → { sessionId }
'chief:performer:jump' → { sessionId, performerId }

// Server → All Judges
'performer:changed' → { currentPerformer, currentIndex }
'score:locked' → { performerId }
'score:reopened' → { performerId }
```

### Special Events

```typescript
// Line Judge → E-Panel
'line:fault:added' → { sessionId, performerId, fault, totalFaults, penalty }
'line:faults:updated' → { performerId, totalFaults, penalty }

// Time Keeper → All Judges
'time:performance:started' → { performerId, startTime }
'time:performance:stopped' → { performerId, endTime, duration, timePenalty }
'performance:started' → { performerId, startTime }
'performance:ended' → { performerId, endTime, duration }

// All Scores Submitted
'all:submitted' → { performerId, submittedCount, totalJudges }
```

---

## Database Schema

### Panel-Specific Score Data

```prisma
model DifficultyScoreData {
  scoreId       String   @unique
  bodyDifficulties   Json
  apparatusDifficulties Json
  totalBD       Decimal  @db.Decimal(5, 3)
  totalAD       Decimal  @db.Decimal(5, 3)
  totalD        Decimal  @db.Decimal(5, 3)
  notes         String?
}

model ExecutionScoreData {
  scoreId       String   @unique
  artisticDeductions Json
  technicalDeductions Json
  lineFaults    Int      @default(0)
  linePenalty   Decimal  @db.Decimal(5, 3)
  totalDeductions Decimal @db.Decimal(5, 3)
  finalE        Decimal  @db.Decimal(5, 3)
  notes         String?
}

model ArtistryScoreData {
  scoreId       String   @unique
  musicRelation    Decimal  @db.Decimal(4, 2)
  bodyExpression   Decimal  @db.Decimal(4, 2)
  spaceUse         Decimal  @db.Decimal(4, 2)
  composition      Decimal  @db.Decimal(4, 2)
  unity            Decimal  @db.Decimal(4, 2)
  totalA           Decimal  @db.Decimal(5, 3)
  notes            String?
}

model LineJudgeData {
  sessionId     String
  performerId   String
  faults        Json
  totalFaults   Int      @default(0)
  penalty       Decimal  @db.Decimal(5, 3)
  @@unique([sessionId, performerId])
}

model TimeKeeperData {
  sessionId     String
  performerId   String
  startTime     DateTime?
  endTime       DateTime?
  duration      Int?
  timePenalty   Decimal  @db.Decimal(5, 3)
  @@unique([sessionId, performerId])
}
```

---

## Usage Guide

### 1. Setup

```bash
# Install dependencies
npm install socket.io-client

# Set environment variables
REACT_APP_WS_URL=ws://localhost:3001/judging
```

### 2. Integration

```typescript
import { JudgingPanelRouter } from './judging-frontend/JudgingPanelRouter';

function App() {
  const sessionId = 'session-123';
  const token = 'JWT_TOKEN';

  return (
    <JudgingPanelRouter
      sessionId={sessionId}
      token={token}
    />
  );
}
```

### 3. Authentication

JWT token should contain:
```json
{
  "userId": "user-1",
  "name": "Judge Name",
  "role": "D1"  // D1, D2, E1, E2, A1, A2, LINE_JUDGE, TIME_KEEPER, CHIEF_JUDGE
}
```

### 4. Automatic Routing

The router automatically displays the correct panel based on `role`:

```typescript
D1, D2, D3, D4           → DPanel
E1, E2, E3, E4           → EPanel
A1, A2                   → APanel
LINE_JUDGE               → LineJudgePanel
TIME_KEEPER              → TimeKeeperPanel
CHIEF_JUDGE              → ChiefJudgePanel
```

### 5. Workflow Example

**Session Start:**
1. Chief Judge starts session → `chief:session:start`
2. All judges receive `session:joined` with current performer
3. Judges' panels display first athlete automatically

**During Performance:**
1. Time Keeper starts timer → `performance:started` broadcast
2. Judges enter scores in their panels
3. Line Judge adds faults → instant update to E-panel judges
4. Judges submit scores → broadcast to others in same panel

**Moving to Next Performer:**
1. Chief Judge clicks "Next" → `chief:performer:next`
2. Current scores locked → `score:locked` broadcast
3. Next performer displayed → `performer:changed` broadcast
4. All judges' panels reset for new athlete

**Score Reopening:**
1. Chief Judge clicks "Reopen Scores"
2. All judges can edit again
3. Submit again when ready

---

## Features Summary

### Real-time Synchronization
- ✅ Instant updates when judge submits score
- ✅ Automatic performer change broadcast
- ✅ Live connection status tracking

### Role-Based Access Control
- ✅ D-judges only see D-panel
- ✅ E-judges only see E-panel
- ✅ Only chief judge/organizer can control session

### Offline Support
- ✅ Automatic reconnection
- ✅ State sync after reconnect
- ✅ Offline score queue

### Audit Trail
- ✅ All actions logged
- ✅ Score version history
- ✅ Connection tracking

---

## Files Created

1. **prisma/judging-schema.prisma** - Updated schema with panel-specific models
2. **judging-frontend/panels/DPanel.tsx** - D-Panel component
3. **judging-frontend/panels/EPanel.tsx** - E-Panel component
4. **judging-frontend/panels/APanel.tsx** - A-Panel component
5. **judging-frontend/panels/LineJudgePanel.tsx** - Line Judge panel
6. **judging-frontend/panels/TimeKeeperPanel.tsx** - Time Keeper panel
7. **judging-frontend/panels/ChiefJudgePanel.tsx** - Chief Judge control panel
8. **judging-frontend/JudgingPanelRouter.tsx** - Auto-routing component
9. **judging-backend/judging-panels.gateway.ts** - Updated WebSocket gateway

---

## Next Steps

1. **Backend Services:** Implement JudgingSessionService, ScoreService
2. **Score Calculation:** Implement FIG 2025-2028 score calculation algorithms
3. **Testing:** Unit tests for each panel component
4. **Styling:** CSS for panel-specific UI
5. **Mobile Support:** Responsive design for tablets

---

**Documentation Version:** 1.0
**Last Updated:** 2025-11-16
**FIG Rules:** 2025-2028
