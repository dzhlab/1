# Judging Panel API Documentation

## WebSocket Events

### Connect to Judging Session

**Namespace:** `/judging`

**Authentication:**
```javascript
const socket = io('wss://api.example.com/judging', {
  auth: {
    token: 'JWT_TOKEN_HERE'
  }
});
```

### Client → Server Events

#### 1. Join Session
```javascript
socket.emit('join:session', {
  sessionId: 'session-123'
});
```

**Response:**
```javascript
socket.on('session:joined', (data) => {
  // data.session - full session info
  // data.currentPerformer - current athlete
  // data.myScore - judge's score (if already entered)
  // data.otherJudgesStatus - status of other judges
});
```

#### 2. Submit Score
```javascript
socket.emit('score:submit', {
  sessionId: 'session-123',
  performerId: 'performer-456',
  score: 8.5
});
```

**Response:**
```javascript
socket.on('score:confirmed', (data) => {
  // data.scoreId - ID of saved score
  // data.success - true/false
});

// All judges receive:
socket.on('score:submitted', (data) => {
  // data.judgeId
  // data.judgeRole - 'D1', 'E1', etc.
  // data.score
  // data.submittedAt
});
```

#### 3. Control: Next Performer (Organizer/Chief only)
```javascript
socket.emit('control:next', {
  sessionId: 'session-123',
  force: false // Set to true to skip pending scores
});
```

**Response:**
```javascript
// All judges receive:
socket.on('performer:changed', (data) => {
  // data.currentPerformer - new athlete
  // data.currentIndex - position in queue
  // data.previousPerformer - previous athlete
});

socket.on('score:closed', (data) => {
  // data.performerId - previous performer
  // data.finalScores - all scores for previous performer
});
```

#### 4. Sync Request (After Reconnect)
```javascript
socket.emit('sync:request', {
  sessionId: 'session-123'
});
```

**Response:**
```javascript
socket.on('session:sync', (data) => {
  // Full current state of session
  // Use this to restore UI after disconnect
});
```

### Server → Client Events

#### Automatic Updates

**When another judge submits:**
```javascript
socket.on('score:submitted', (data) => {
  console.log(`${data.judgeRole} submitted: ${data.score}`);
  updateJudgeStatus(data.judgeRole, 'submitted');
});
```

**When all judges submitted:**
```javascript
socket.on('all:submitted', (data) => {
  console.log('All judges submitted for performer:', data.performerId);
  enableNextButton();
});
```

**When organizer moves to next:**
```javascript
socket.on('performer:changed', (data) => {
  clearCurrentScore();
  displayPerformer(data.currentPerformer);
  focusScoreInput();
});
```

**When session starts:**
```javascript
socket.on('session:started', (data) => {
  console.log('Session started at:', data.startedAt);
  displayPerformer(data.currentPerformer);
});
```

**When session paused/resumed:**
```javascript
socket.on('session:paused', (data) => {
  disableScoring();
  showMessage('Session paused');
});

socket.on('session:resumed', (data) => {
  enableScoring();
  showMessage('Session resumed');
});
```

**Judge connection status:**
```javascript
socket.on('judge:connected', (data) => {
  console.log(`${data.judgeName} (${data.judgeRole}) connected`);
  updateJudgesList();
});

socket.on('judge:disconnected', (data) => {
  console.log(`${data.judgeName} disconnected`);
  updateJudgesList();
});
```

## REST API Endpoints

### 1. Create Judging Session
```
POST /api/judging/sessions
```

**Request:**
```json
{
  "competitionId": "comp-123",
  "groupId": "group-456",
  "apparatus": "HOOP",
  "round": "QUALIFICATION",
  "judges": [
    { "judgeId": "user-1", "role": "D1", "panelType": "D_PANEL" },
    { "judgeId": "user-2", "role": "D2", "panelType": "D_PANEL" },
    { "judgeId": "user-3", "role": "E1", "panelType": "E_PANEL" },
    { "judgeId": "user-4", "role": "E2", "panelType": "E_PANEL" }
  ]
}
```

**Response:**
```json
{
  "id": "session-789",
  "status": "PENDING",
  "athletes": [...],
  "judges": [...]
}
```

### 2. Get Session State
```
GET /api/judging/sessions/:sessionId
```

**Response:**
```json
{
  "id": "session-789",
  "status": "ACTIVE",
  "currentAthleteIndex": 5,
  "currentAthlete": {
    "id": "performer-10",
    "fullName": "Иванова Анна",
    "club": "СДЮСШОР №1",
    "orderNumber": 6
  },
  "judges": [
    {
      "id": "judge-1",
      "role": "D1",
      "isConnected": true,
      "hasSubmitted": true
    }
  ]
}
```

### 3. Get Scores for Performer
```
GET /api/judging/sessions/:sessionId/performers/:performerId/scores
```

**Response:**
```json
{
  "performerId": "performer-10",
  "scores": [
    {
      "judgeRole": "D1",
      "value": 8.5,
      "status": "SUBMITTED",
      "submittedAt": "2025-01-16T10:30:00Z"
    },
    {
      "judgeRole": "D2",
      "value": 8.6,
      "status": "SUBMITTED",
      "submittedAt": "2025-01-16T10:30:05Z"
    }
  ],
  "finalScore": {
    "dScore": 8.55,
    "eScore": 7.25,
    "totalScore": 15.80
  }
}
```

### 4. Reopen Scores (Secretary only)
```
POST /api/judging/sessions/:sessionId/performers/:performerId/reopen
```

**Request:**
```json
{
  "reason": "Calculation error found"
}
```

**Response:**
```json
{
  "success": true,
  "reopenedAt": "2025-01-16T11:00:00Z"
}
```

## Error Codes

- `400` - Invalid score value
- `403` - Insufficient permissions
- `404` - Session or performer not found
- `409` - Scores already closed
- `500` - Server error

## Example Usage (React)

```typescript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function JudgePanel({ sessionId, judgeRole }) {
  const [socket, setSocket] = useState(null);
  const [currentAthlete, setCurrentAthlete] = useState(null);
  const [score, setScore] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('wss://api.example.com/judging', {
      auth: { token: localStorage.getItem('token') }
    });

    // Join session
    newSocket.emit('join:session', { sessionId });

    // Listen for session joined
    newSocket.on('session:joined', (data) => {
      setCurrentAthlete(data.currentPerformer);
      if (data.myScore) {
        setScore(data.myScore.value);
        setIsSubmitted(true);
      }
    });

    // Listen for performer changed
    newSocket.on('performer:changed', (data) => {
      setCurrentAthlete(data.currentPerformer);
      setScore('');
      setIsSubmitted(false);
    });

    // Listen for score confirmed
    newSocket.on('score:confirmed', () => {
      setIsSubmitted(true);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  const handleSubmit = () => {
    if (!score || isSubmitted) return;

    socket.emit('score:submit', {
      sessionId,
      performerId: currentAthlete.id,
      score: parseFloat(score)
    });
  };

  return (
    <div className="judge-panel">
      <h2>Current Performer</h2>
      {currentAthlete && (
        <div className="performer-info">
          <p><strong>{currentAthlete.fullName}</strong></p>
          <p>{currentAthlete.club}</p>
          <p>Order: {currentAthlete.orderNumber}</p>
        </div>
      )}

      <div className="score-input">
        <label>Your Score ({judgeRole})</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          disabled={isSubmitted}
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitted || !score}
        >
          {isSubmitted ? '✓ Submitted' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
```
