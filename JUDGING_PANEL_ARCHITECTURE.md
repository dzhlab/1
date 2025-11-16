# Judging Panel Module - Architecture & Real-time Synchronization

## 1. Overview

Модуль судейской панели для проведения соревнований по художественной гимнастике в реальном времени с автоматической синхронизацией между всеми судьями.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Judging Panel System                        │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Judges     │  │ Organizers/  │  │  Technical   │
    │  (Viewing &  │  │ Chief Judge  │  │  Specialist  │
    │  Scoring)    │  │ (Control)    │  │  (Control)   │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  WebSocket Hub   │
                    │  (Real-time      │
                    │   Sync Server)   │
                    └──────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Judging    │  │    Stream    │  │    Score     │
    │   Session    │  │   Control    │  │  Management  │
    │  Management  │  │   Service    │  │   Service    │
    └──────────────┘  └──────────────┘  └──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    Database      │
                    │   (Prisma ORM)   │
                    └──────────────────┘
```

## 3. User Roles & Permissions

### Judge (Судья)
**Capabilities:**
- ✅ View current performer automatically
- ✅ Enter/edit scores (before closing)
- ✅ Submit scores
- ❌ Cannot control stream (start/stop/next)
- ❌ Cannot edit scores after closing (except secretary)

**View:**
```
┌─────────────────────────────────────────┐
│  Current Performer                      │
│                                         │
│  Имя: Иванова Анна                     │
│  Клуб: СДЮСШОР №1, Москва             │
│  Снаряд: Обруч                         │
│  Время: 1:30                           │
│                                         │
│  ┌─────────────────────────────┐       │
│  │ Your Score: [8.5]           │       │
│  │ [Submit]  [Clear]           │       │
│  └─────────────────────────────┘       │
│                                         │
│  Other Judges:                         │
│  D1: 8.4 ✓  D2: 8.6 ✓  D3: 8.5 ✓     │
│  E1: 7.2 ✓  E2: 7.3 ✓                 │
└─────────────────────────────────────────┘
```

### Organizer / Chief Judge / Secretary
**Capabilities:**
- ✅ All judge capabilities
- ✅ Control stream (start/stop/next/previous)
- ✅ Edit scores after closing (secretary only)
- ✅ Pause/resume judging
- ✅ Override decisions

**View:**
```
┌─────────────────────────────────────────┐
│  Stream Control Panel                   │
│                                         │
│  [◄ Previous] [⏸ Pause] [Next ►]       │
│  [Start Session] [End Session]         │
│                                         │
│  Current: Иванова Анна (3/15)          │
│  Progress: ███████░░░░░░░░ 47%         │
│                                         │
│  Judges Status:                         │
│  D1: ✓ Submitted  D2: ✓ Submitted      │
│  E1: ⏳ Pending   E2: ⏳ Pending        │
│                                         │
│  [Force Next] [Reopen Scores]          │
└─────────────────────────────────────────┘
```

### Technical Specialist
**Capabilities:**
- ✅ Control stream
- ✅ Manage technical issues
- ✅ View all scores
- ❌ Cannot enter scores

## 4. Data Flow Diagrams

### 4.1 Starting a Judging Session

```
Organizer clicks "Start Session"
         │
         ▼
Backend: Create JudgingSession
         │
         ├─→ Set status = ACTIVE
         ├─→ Set currentAthleteIndex = 0
         ├─→ Load first athlete
         │
         ▼
WebSocket: Emit "session:started"
         │
         ▼
All Judges receive event
         │
         ├─→ Update UI to show first athlete
         ├─→ Enable score input
         └─→ Start timer (if applicable)
```

### 4.2 Moving to Next Performer

```
Organizer clicks "Next"
         │
         ▼
Backend: Validate permissions
         │
         ├─→ Check if all judges submitted
         │   (or force next)
         │
         ▼
Backend: Update JudgingSession
         │
         ├─→ currentAthleteIndex++
         ├─→ Close previous scores
         ├─→ Load next athlete
         │
         ▼
WebSocket: Emit "performer:changed"
         │
         ▼
All Judges receive event
         │
         ├─→ Auto-clear previous scores
         ├─→ Display new performer
         ├─→ Reset score inputs
         └─→ Auto-focus on score field
```

### 4.3 Submitting a Score

```
Judge enters score & clicks "Submit"
         │
         ▼
Frontend: Validate score format
         │
         ├─→ Check range (0-10)
         ├─→ Check decimal places
         │
         ▼
Backend: Save score
         │
         ├─→ Create/Update Score record
         ├─→ Set submittedAt timestamp
         ├─→ Mark as submitted
         │
         ▼
WebSocket: Emit "score:submitted"
         │
         ▼
All Users receive event
         │
         ├─→ Organizer sees judge marked as ✓
         ├─→ Other judges see score count
         └─→ Calculate if all submitted → enable Next
```

### 4.4 Judge Reconnects (Page Reload)

```
Judge reloads page / loses connection
         │
         ▼
Frontend: Reconnect to WebSocket
         │
         ▼
Backend: Authenticate & get session
         │
         ├─→ Find active JudgingSession
         ├─→ Get current performer
         ├─→ Get judge's score (if exists)
         │
         ▼
WebSocket: Send "session:sync"
         │
         ▼
Judge receives current state
         │
         ├─→ Display correct performer
         ├─→ Load previous score (if any)
         └─→ Continue from current position
```

## 5. WebSocket Events

### Events from Server → Client

#### Session Events
```typescript
'session:started' → {
  sessionId: string;
  groupId: string;
  athletes: Athlete[];
  currentIndex: 0;
  currentAthlete: Athlete;
  judges: Judge[];
}

'session:paused' → {
  sessionId: string;
  pausedAt: timestamp;
}

'session:resumed' → {
  sessionId: string;
  resumedAt: timestamp;
}

'session:ended' → {
  sessionId: string;
  endedAt: timestamp;
  finalScores: Score[];
}
```

#### Performer Events
```typescript
'performer:changed' → {
  sessionId: string;
  currentIndex: number;
  currentAthlete: {
    id: string;
    fullName: string;
    club: string;
    apparatus: string;
    orderNumber: number;
  };
  previousScores: Score[]; // For reference
}

'performer:skipped' → {
  sessionId: string;
  skippedAthleteId: string;
  reason: string;
}
```

#### Score Events
```typescript
'score:submitted' → {
  sessionId: string;
  athleteId: string;
  judgeId: string;
  judgeRole: 'D1' | 'D2' | 'E1' | 'E2' | ...;
  score: number;
  submittedAt: timestamp;
}

'score:updated' → {
  sessionId: string;
  athleteId: string;
  judgeId: string;
  oldScore: number;
  newScore: number;
  updatedAt: timestamp;
}

'score:closed' → {
  sessionId: string;
  athleteId: string;
  closedAt: timestamp;
  finalScores: Score[];
}

'score:reopened' → {
  sessionId: string;
  athleteId: string;
  reopenedBy: string;
  reason: string;
}
```

#### Judge Status Events
```typescript
'judge:connected' → {
  judgeId: string;
  judgeName: string;
  judgeRole: string;
  connectedAt: timestamp;
}

'judge:disconnected' → {
  judgeId: string;
  disconnectedAt: timestamp;
}

'judges:status' → {
  sessionId: string;
  athleteId: string;
  judges: [{
    id: string;
    role: string;
    status: 'pending' | 'submitted' | 'offline';
    score: number | null;
  }];
}
```

### Events from Client → Server

```typescript
// Join session
'join:session' → { sessionId: string; judgeId: string; }

// Leave session
'leave:session' → { sessionId: string; judgeId: string; }

// Control events (organizer/chief only)
'control:start' → { sessionId: string; }
'control:pause' → { sessionId: string; }
'control:resume' → { sessionId: string; }
'control:next' → { sessionId: string; force?: boolean; }
'control:previous' → { sessionId: string; }
'control:goto' → { sessionId: string; athleteIndex: number; }

// Score events
'score:submit' → {
  sessionId: string;
  athleteId: string;
  score: number;
}

'score:update' → {
  sessionId: string;
  athleteId: string;
  score: number;
}

// Sync request (after reconnect)
'sync:request' → { sessionId: string; judgeId: string; }
```

## 6. State Management

### Session State (Server-side)

```typescript
interface JudgingSessionState {
  id: string;
  groupId: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

  // Current performer
  currentAthleteIndex: number;
  currentAthleteId: string;

  // Athletes queue
  athletes: Athlete[];
  totalAthletes: number;

  // Judges
  judges: Judge[];
  connectedJudges: Set<string>;

  // Scores tracking
  currentScores: Map<string, Score>; // judgeId -> Score
  scoresHistory: Map<string, Score[]>; // athleteId -> Score[]

  // Timing
  startedAt: Date;
  pausedAt?: Date;
  currentPerformerStartedAt: Date;

  // Metadata
  apparatus: string;
  round: 'QUALIFICATION' | 'SEMIFINAL' | 'FINAL';
}
```

### Client State (Judge UI)

```typescript
interface JudgeUIState {
  // Connection
  isConnected: boolean;
  sessionId: string;
  judgeId: string;
  judgeRole: string;

  // Current performer
  currentAthlete: Athlete | null;
  athleteIndex: number;
  totalAthletes: number;

  // Score input
  currentScore: number | null;
  isSubmitted: boolean;
  canEdit: boolean;

  // Other judges status
  otherJudges: {
    id: string;
    role: string;
    status: 'pending' | 'submitted' | 'offline';
    score?: number;
  }[];

  // Timing
  timer: number; // seconds
  isTimerRunning: boolean;
}
```

## 7. Score Validation Rules

### By Judge Type

**D-панель (Difficulty):**
- Range: 0.0 - 10.0
- Precision: 0.1 (one decimal place)
- Example: 8.5, 9.2, 7.8

**E-панель (Execution):**
- Range: 0.0 - 10.0
- Precision: 0.1 or 0.05 (depending on rules)
- Deductions for errors

**Artistic Score:**
- Range: 0.0 - 10.0
- Precision: 0.1

### Validation Logic

```typescript
function validateScore(score: number, judgeType: JudgeType): ValidationResult {
  // Check range
  if (score < 0 || score > 10) {
    return { valid: false, error: 'Score must be between 0 and 10' };
  }

  // Check precision
  const precision = judgeType === 'E' ? 0.05 : 0.1;
  const remainder = score % precision;

  if (Math.abs(remainder) > 0.001) {
    return {
      valid: false,
      error: `Score must be multiple of ${precision}`
    };
  }

  return { valid: true };
}
```

## 8. Automatic Synchronization Scenarios

### Scenario 1: Judge Submits Score

```
Judge A enters 8.5 and clicks Submit
         │
         ▼
Backend saves score with timestamp
         │
         ▼
WebSocket broadcasts "score:submitted"
         │
         ├─→ Organizer sees: "D1: ✓ Submitted (8.5)"
         ├─→ Other judges see: "D1: ✓ Submitted"
         └─→ Check if all submitted → show "Ready for Next"
```

### Scenario 2: Organizer Moves to Next

```
Organizer clicks "Next"
         │
         ▼
Backend checks all judges submitted
         │
         ├─→ If yes: proceed
         ├─→ If no: show warning "2 judges pending"
         │   └─→ Organizer can "Force Next"
         │
         ▼
Backend updates currentAthleteIndex++
         │
         ▼
WebSocket broadcasts "performer:changed"
         │
         ▼
All judges' screens update instantly
         │
         ├─→ Clear previous score input
         ├─→ Show new athlete
         ├─→ Reset "Submitted" status
         └─→ Focus on score field
```

### Scenario 3: Judge Reconnects

```
Judge loses connection and reloads page
         │
         ▼
Frontend reconnects to WebSocket
         │
         ├─→ Authenticate with JWT
         ├─→ Send "sync:request"
         │
         ▼
Backend finds active session
         │
         ├─→ Get currentAthleteIndex
         ├─→ Get judge's score for current athlete
         │
         ▼
Backend sends "session:sync"
         │
         ▼
Judge's UI updates to current state
         │
         ├─→ Show correct athlete
         ├─→ Load previous score (if submitted)
         └─→ Continue judging
```

### Scenario 4: Secretary Reopens Scores

```
Secretary notices error and clicks "Reopen Scores"
         │
         ▼
Backend validates permission (secretary only)
         │
         ▼
Backend updates Score records
         │
         ├─→ Set reopened = true
         ├─→ Set canEdit = true
         │
         ▼
WebSocket broadcasts "score:reopened"
         │
         ▼
All judges can now edit scores
         │
         ├─→ Enable score input fields
         ├─→ Show "Reopened" indicator
         └─→ Allow resubmission
```

## 9. Conflict Resolution

### Multiple Judges Edit Same Score Simultaneously

**Problem:** Judge A and Judge B both edit the same score at the same time.

**Solution: Last-Write-Wins with Optimistic Locking**

```typescript
interface Score {
  id: string;
  value: number;
  version: number; // Optimistic lock
  updatedAt: Date;
}

async function updateScore(scoreId: string, newValue: number, version: number) {
  const result = await prisma.score.updateMany({
    where: {
      id: scoreId,
      version: version, // Only update if version matches
    },
    data: {
      value: newValue,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  if (result.count === 0) {
    // Version conflict - score was updated by someone else
    throw new ConflictError('Score was updated by another user');
  }

  return result;
}
```

### Network Interruption

**Problem:** Judge loses network connection during scoring.

**Solution: Offline Queue + Auto-Sync**

```typescript
class OfflineScoreQueue {
  private queue: Score[] = [];

  async submitScore(score: Score) {
    if (navigator.onLine) {
      // Online: send immediately
      await api.submitScore(score);
    } else {
      // Offline: queue for later
      this.queue.push(score);
      this.saveToLocalStorage();
    }
  }

  async syncWhenOnline() {
    window.addEventListener('online', async () => {
      // Sync queued scores
      for (const score of this.queue) {
        try {
          await api.submitScore(score);
          this.removeFromQueue(score);
        } catch (error) {
          console.error('Failed to sync score:', error);
        }
      }
    });
  }
}
```

## 10. Performance Optimizations

### WebSocket Connection Pooling

```typescript
// Reuse connections per session
const connectionPool = new Map<string, WebSocket>();

function getConnection(sessionId: string): WebSocket {
  if (!connectionPool.has(sessionId)) {
    const ws = new WebSocket(`wss://api.example.com/judging/${sessionId}`);
    connectionPool.set(sessionId, ws);
  }
  return connectionPool.get(sessionId)!;
}
```

### Event Batching

```typescript
// Batch multiple score updates into single broadcast
class EventBatcher {
  private batch: Event[] = [];
  private timeout: NodeJS.Timeout | null = null;

  add(event: Event) {
    this.batch.push(event);

    if (!this.timeout) {
      this.timeout = setTimeout(() => {
        this.flush();
      }, 100); // 100ms window
    }
  }

  flush() {
    if (this.batch.length > 0) {
      this.broadcast(this.batch);
      this.batch = [];
      this.timeout = null;
    }
  }
}
```

### Caching Current State

```typescript
// Cache session state in Redis
const sessionCache = new RedisCache();

async function getCurrentAthlete(sessionId: string): Promise<Athlete> {
  const cached = await sessionCache.get(`session:${sessionId}:current`);

  if (cached) {
    return JSON.parse(cached);
  }

  const athlete = await db.getCurrentAthlete(sessionId);
  await sessionCache.set(`session:${sessionId}:current`, JSON.stringify(athlete), 60);

  return athlete;
}
```

## 11. Security Considerations

### Role-Based Access Control

```typescript
function canControlStream(user: User): boolean {
  const allowedRoles = [
    'ORGANIZER',
    'CHIEF_JUDGE',
    'SECRETARY',
    'TECHNICAL_SPECIALIST'
  ];

  return allowedRoles.includes(user.role);
}

function canEditClosedScore(user: User): boolean {
  return user.role === 'SECRETARY';
}

function canViewAllScores(user: User): boolean {
  const allowedRoles = [
    'ORGANIZER',
    'CHIEF_JUDGE',
    'SECRETARY',
    'TECHNICAL_SPECIALIST'
  ];

  return allowedRoles.includes(user.role);
}
```

### WebSocket Authentication

```typescript
// Authenticate WebSocket connections
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const user = await verifyJWT(token);
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});
```

## 12. Monitoring & Logging

### Metrics to Track

- Active judging sessions
- Connected judges per session
- Scores submitted per minute
- Average time to submit score
- Network reconnections per session
- Failed score submissions

### Audit Log

```typescript
interface AuditLogEntry {
  timestamp: Date;
  action: 'SCORE_SUBMITTED' | 'SCORE_REOPENED' | 'PERFORMER_CHANGED';
  userId: string;
  sessionId: string;
  details: any;
}

async function logAction(action: string, details: any) {
  await db.auditLog.create({
    data: {
      timestamp: new Date(),
      action,
      userId: currentUser.id,
      sessionId: currentSession.id,
      details: JSON.stringify(details),
    },
  });
}
```

## 13. Error Handling

### Client-Side Errors

```typescript
// Handle WebSocket disconnection
socket.on('disconnect', () => {
  showNotification('Connection lost. Attempting to reconnect...', 'warning');
  startReconnectTimer();
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  showNotification('Cannot connect to server', 'error');
});

// Handle score submission errors
async function submitScore(score: number) {
  try {
    await api.submitScore(sessionId, athleteId, score);
    showNotification('Score submitted successfully', 'success');
  } catch (error) {
    if (error.code === 'SCORE_ALREADY_CLOSED') {
      showNotification('Scores are already closed for this performer', 'error');
    } else if (error.code === 'INVALID_SCORE') {
      showNotification('Invalid score value', 'error');
    } else {
      showNotification('Failed to submit score. Try again.', 'error');
    }
  }
}
```

### Server-Side Errors

```typescript
// Handle concurrent modifications
try {
  await updateScore(scoreId, newValue, version);
} catch (error) {
  if (error instanceof ConflictError) {
    // Retry with latest version
    const latestScore = await getScore(scoreId);
    await updateScore(scoreId, newValue, latestScore.version);
  } else {
    throw error;
  }
}
```

## 14. Testing Strategy

### Unit Tests
- Score validation logic
- Permission checks
- Event handlers

### Integration Tests
- WebSocket connection flow
- Score submission flow
- Session state synchronization

### E2E Tests
- Complete judging session from start to end
- Judge reconnection scenarios
- Multiple judges scoring simultaneously

## 15. Deployment Considerations

### Horizontal Scaling

Use Redis Pub/Sub for WebSocket synchronization across multiple servers:

```typescript
// Server 1
await redis.publish('judging:score:submitted', JSON.stringify(scoreData));

// Server 2
redis.subscribe('judging:score:submitted', (message) => {
  const scoreData = JSON.parse(message);
  io.to(scoreData.sessionId).emit('score:submitted', scoreData);
});
```

### Load Balancing

Use sticky sessions to keep judges connected to same server:

```nginx
upstream judging_backend {
  ip_hash; # Sticky sessions
  server backend1:4000;
  server backend2:4000;
  server backend3:4000;
}
```

---

**Next Steps:**
1. ✅ Create Prisma schema for judging entities
2. ✅ Implement WebSocket gateway
3. ✅ Create backend services
4. ✅ Build React components
5. ✅ Add comprehensive tests
