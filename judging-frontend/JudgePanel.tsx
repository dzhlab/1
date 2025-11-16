// apps/web/src/components/Judging/JudgePanel.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Performer {
  id: string;
  fullName: string;
  club: string;
  birthDate: string;
  orderNumber: number;
  apparatus?: string;
}

interface JudgeStatus {
  id: string;
  role: string;
  status: 'pending' | 'submitted' | 'offline';
  score?: number;
}

interface JudgePanelProps {
  sessionId: string;
  judgeRole: string;
  userId: string;
  token: string;
}

export const JudgePanel: React.FC<JudgePanelProps> = ({
  sessionId,
  judgeRole,
  userId,
  token,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Current state
  const [currentPerformer, setCurrentPerformer] = useState<Performer | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalPerformers, setTotalPerformers] = useState(0);

  // Score input
  const [scoreValue, setScoreValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  // Other judges
  const [otherJudges, setOtherJudges] = useState<JudgeStatus[]>([]);

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);

  // ============================================================================
  // WebSocket Connection
  // ============================================================================

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const newSocket = io(`${API_URL}/judging`, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      showNotification('Connected to judging session', 'success');

      // Join session
      newSocket.emit('join:session', { sessionId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      showNotification('Disconnected. Trying to reconnect...', 'warning');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      showNotification('Connection error', 'error');
    });

    // Session joined
    newSocket.on('session:joined', (data) => {
      console.log('Joined session:', data);

      setCurrentPerformer(data.currentPerformer);
      setOtherJudges(data.otherJudgesStatus || []);

      if (data.myScore) {
        setScoreValue(data.myScore.value.toString());
        setIsSubmitted(data.myScore.status === 'SUBMITTED');
      }

      showNotification('Joined session successfully', 'success');
    });

    // Performer changed
    newSocket.on('performer:changed', (data) => {
      console.log('Performer changed:', data);

      setCurrentPerformer(data.currentPerformer);
      setCurrentIndex(data.currentIndex);
      setTotalPerformers(data.totalPerformers);

      // Reset score input
      setScoreValue('');
      setIsSubmitted(false);
      setCanEdit(true);
      setElapsedTime(0);
      setTimerRunning(true);

      // Auto-focus on score input
      setTimeout(() => {
        document.getElementById('score-input')?.focus();
      }, 100);

      showNotification(`New performer: ${data.currentPerformer.fullName}`, 'info');
    });

    // Score submitted
    newSocket.on('score:submitted', (data) => {
      console.log('Score submitted:', data);

      // Update other judges status
      setOtherJudges((prev) =>
        prev.map((judge) =>
          judge.role === data.judgeRole
            ? { ...judge, status: 'submitted' as const, score: data.score }
            : judge
        )
      );
    });

    // Score confirmed (my score)
    newSocket.on('score:confirmed', (data) => {
      if (data.success) {
        setIsSubmitted(true);
        showNotification('Score submitted successfully', 'success');
      }
    });

    // Score error
    newSocket.on('score:error', (data) => {
      showNotification(data.message, 'error');
    });

    // All judges submitted
    newSocket.on('all:submitted', (data) => {
      showNotification('All judges have submitted scores', 'info');
    });

    // Score closed
    newSocket.on('score:closed', (data) => {
      setCanEdit(false);
      setTimerRunning(false);
    });

    // Score reopened
    newSocket.on('score:reopened', (data) => {
      setCanEdit(true);
      setIsSubmitted(false);
      showNotification('Scores reopened for editing', 'info');
    });

    // Session paused
    newSocket.on('session:paused', () => {
      setTimerRunning(false);
      showNotification('Session paused', 'warning');
    });

    // Session resumed
    newSocket.on('session:resumed', () => {
      setTimerRunning(true);
      showNotification('Session resumed', 'info');
    });

    // Sync response (after reconnect)
    newSocket.on('session:sync', (data) => {
      console.log('Synced state:', data);
      setCurrentPerformer(data.currentPerformer);
      if (data.myScore) {
        setScoreValue(data.myScore.value.toString());
        setIsSubmitted(data.myScore.status === 'SUBMITTED');
      }
      setOtherJudges(data.otherJudgesStatus || []);
    });

    // Ping/pong heartbeat
    setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000); // Every 30 seconds

    newSocket.on('pong', () => {
      // Connection is alive
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave:session', { sessionId });
        newSocket.disconnect();
      }
    };
  }, [sessionId, token]);

  // ============================================================================
  // Timer
  // ============================================================================

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerRunning]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSubmitScore = () => {
    if (!socket || !currentPerformer || !scoreValue || isSubmitted) {
      return;
    }

    const score = parseFloat(scoreValue);

    // Validate score
    if (isNaN(score) || score < 0 || score > 10) {
      showNotification('Score must be between 0 and 10', 'error');
      return;
    }

    // Check precision (0.1)
    if ((score * 10) % 1 !== 0) {
      showNotification('Score must have at most 1 decimal place', 'error');
      return;
    }

    // Submit
    socket.emit('score:submit', {
      sessionId,
      performerId: currentPerformer.id,
      score,
    });
  };

  const handleClearScore = () => {
    if (isSubmitted || !canEdit) {
      return;
    }

    setScoreValue('');
  };

  const handleScoreChange = (value: string) => {
    if (isSubmitted || !canEdit) {
      return;
    }

    // Allow only numbers and one decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setScoreValue(value);
    }
  };

  const showNotification = (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error'
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="judge-panel">
      {/* Connection Status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="status-indicator"></div>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Header */}
      <div className="panel-header">
        <h1>Judge Panel - {judgeRole}</h1>
        {currentPerformer && (
          <div className="progress">
            Performer {currentIndex + 1} of {totalPerformers || '...'}
          </div>
        )}
      </div>

      {/* Current Performer */}
      {currentPerformer ? (
        <div className="current-performer">
          <div className="performer-header">
            <h2>Current Performer</h2>
            <div className="timer">{formatTime(elapsedTime)}</div>
          </div>

          <div className="performer-details">
            <div className="detail-row">
              <span className="label">Name:</span>
              <span className="value">{currentPerformer.fullName}</span>
            </div>
            <div className="detail-row">
              <span className="label">Club:</span>
              <span className="value">{currentPerformer.club}</span>
            </div>
            <div className="detail-row">
              <span className="label">Order:</span>
              <span className="value">#{currentPerformer.orderNumber}</span>
            </div>
            {currentPerformer.apparatus && (
              <div className="detail-row">
                <span className="label">Apparatus:</span>
                <span className="value">{currentPerformer.apparatus}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-performer">
          <p>Waiting for session to start...</p>
        </div>
      )}

      {/* Score Input */}
      {currentPerformer && (
        <div className="score-section">
          <h3>Your Score</h3>
          <div className="score-input-group">
            <input
              id="score-input"
              type="text"
              inputMode="decimal"
              value={scoreValue}
              onChange={(e) => handleScoreChange(e.target.value)}
              disabled={isSubmitted || !canEdit}
              placeholder="0.0"
              className="score-input"
            />

            <div className="score-actions">
              <button
                onClick={handleSubmitScore}
                disabled={isSubmitted || !scoreValue || !canEdit}
                className="btn-submit"
              >
                {isSubmitted ? '✓ Submitted' : 'Submit'}
              </button>

              <button
                onClick={handleClearScore}
                disabled={isSubmitted || !canEdit}
                className="btn-clear"
              >
                Clear
              </button>
            </div>
          </div>

          {isSubmitted && (
            <div className="submitted-indicator">
              <span className="checkmark">✓</span>
              Score submitted successfully
            </div>
          )}

          {!canEdit && !isSubmitted && (
            <div className="locked-indicator">
              <span>🔒</span>
              Scores are locked for this performer
            </div>
          )}
        </div>
      )}

      {/* Other Judges Status */}
      <div className="other-judges">
        <h3>Other Judges</h3>
        <div className="judges-grid">
          {otherJudges.map((judge) => (
            <div
              key={judge.id}
              className={`judge-card ${judge.status}`}
            >
              <div className="judge-role">{judge.role}</div>
              <div className="judge-status">
                {judge.status === 'submitted' && <span className="icon">✓</span>}
                {judge.status === 'pending' && <span className="icon">⏳</span>}
                {judge.status === 'offline' && <span className="icon">⚠</span>}
                <span className="status-text">
                  {judge.status === 'submitted' && 'Submitted'}
                  {judge.status === 'pending' && 'Pending'}
                  {judge.status === 'offline' && 'Offline'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-message">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="notification-close">
            ✕
          </button>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .judge-panel {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .connection-status.connected {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .connection-status.disconnected {
          background: #ffebee;
          color: #c62828;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .panel-header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }

        .progress {
          font-size: 14px;
          color: #666;
        }

        .current-performer {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .performer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .performer-header h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .timer {
          font-size: 24px;
          font-weight: 600;
          color: #007aff;
          font-variant-numeric: tabular-nums;
        }

        .performer-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-row {
          display: flex;
          gap: 12px;
        }

        .detail-row .label {
          font-weight: 600;
          min-width: 80px;
          color: #666;
        }

        .detail-row .value {
          color: #333;
        }

        .no-performer {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        .score-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .score-section h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px;
        }

        .score-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .score-input {
          flex: 1;
          font-size: 48px;
          font-weight: 600;
          text-align: center;
          padding: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          outline: none;
          transition: border-color 0.2s;
        }

        .score-input:focus {
          border-color: #007aff;
        }

        .score-input:disabled {
          background: #f5f5f5;
          color: #999;
        }

        .score-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .btn-submit,
        .btn-clear {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-submit {
          background: #007aff;
          color: white;
        }

        .btn-submit:hover:not(:disabled) {
          background: #0051d5;
        }

        .btn-submit:disabled {
          background: #e0e0e0;
          color: #999;
          cursor: not-allowed;
        }

        .btn-clear {
          background: #f5f5f5;
          color: #333;
        }

        .btn-clear:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .submitted-indicator {
          margin-top: 16px;
          padding: 12px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 8px;
          text-align: center;
        }

        .checkmark {
          font-size: 20px;
          margin-right: 8px;
        }

        .locked-indicator {
          margin-top: 16px;
          padding: 12px;
          background: #fff3e0;
          color: #e65100;
          border-radius: 8px;
          text-align: center;
        }

        .other-judges {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .other-judges h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px;
        }

        .judges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }

        .judge-card {
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          border: 2px solid #e0e0e0;
        }

        .judge-card.submitted {
          border-color: #4caf50;
          background: #e8f5e9;
        }

        .judge-card.pending {
          border-color: #ff9800;
          background: #fff3e0;
        }

        .judge-card.offline {
          border-color: #f44336;
          background: #ffebee;
        }

        .judge-role {
          font-weight: 600;
          font-size: 18px;
          margin-bottom: 8px;
        }

        .judge-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 14px;
        }

        .notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideIn 0.3s;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .notification.success {
          background: #4caf50;
          color: white;
        }

        .notification.error {
          background: #f44336;
          color: white;
        }

        .notification.warning {
          background: #ff9800;
          color: white;
        }

        .notification.info {
          background: #2196f3;
          color: white;
        }

        .notification-close {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
        }
      `}</style>
    </div>
  );
};
