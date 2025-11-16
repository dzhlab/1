// Chief Judge Panel Component
// Master control panel for chief judge to manage entire judging session

import React, { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// ============================================================================
// TYPES
// ============================================================================

interface Performer {
  id: string;
  fullName: string;
  club: string;
  orderNumber: number;
  status: 'WAITING' | 'PERFORMING' | 'COMPLETED' | 'SKIPPED';
  finalScore?: number;
  dScore?: number;
  eScore?: number;
  aScore?: number;
}

interface JudgeStatus {
  judgeId: string;
  judgeName: string;
  judgeRole: string;
  panelType: string;
  isConnected: boolean;
  lastSeen: string;
  hasSubmitted: boolean;
  scoreValue?: number;
}

interface ChiefJudgePanelProps {
  sessionId: string;
  socket: Socket;
  token: string;
}

interface SessionState {
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  currentAthleteIndex: number;
  currentPerformer: Performer | null;
  allPerformers: Performer[];
  judges: JudgeStatus[];
  totalSubmitted: number;
  totalJudges: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ChiefJudgePanel: React.FC<ChiefJudgePanelProps> = ({
  sessionId,
  socket,
  token,
}) => {
  const [sessionState, setSessionState] = useState<SessionState>({
    status: 'PENDING',
    currentAthleteIndex: 0,
    currentPerformer: null,
    allPerformers: [],
    judges: [],
    totalSubmitted: 0,
    totalJudges: 0,
  });

  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [selectedPerformer, setSelectedPerformer] = useState<Performer | null>(null);

  // ============================================================================
  // WEBSOCKET HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!socket) return;

    // Chief judge session state
    socket.on('chief:session:state', (data) => {
      setSessionState(data);
    });

    // Judge connected
    socket.on('judge:connected', (data) => {
      setSessionState(prev => ({
        ...prev,
        judges: prev.judges.map(judge =>
          judge.judgeId === data.judgeId
            ? { ...judge, isConnected: true, lastSeen: new Date().toISOString() }
            : judge
        ),
      }));
    });

    // Judge disconnected
    socket.on('judge:disconnected', (data) => {
      setSessionState(prev => ({
        ...prev,
        judges: prev.judges.map(judge =>
          judge.judgeId === data.judgeId
            ? { ...judge, isConnected: false }
            : judge
        ),
      }));
    });

    // Score submitted
    socket.on('score:submitted', (data) => {
      setSessionState(prev => ({
        ...prev,
        judges: prev.judges.map(judge =>
          judge.judgeRole === data.judgeRole
            ? { ...judge, hasSubmitted: true, scoreValue: data.scoreValue }
            : judge
        ),
        totalSubmitted: prev.totalSubmitted + 1,
      }));
    });

    // All scores submitted
    socket.on('all:submitted', () => {
      // Can auto-advance or show notification
      console.log('All judges have submitted scores');
    });

    return () => {
      socket.off('chief:session:state');
      socket.off('judge:connected');
      socket.off('judge:disconnected');
      socket.off('score:submitted');
      socket.off('all:submitted');
    };
  }, [socket]);

  // ============================================================================
  // SESSION CONTROL HANDLERS
  // ============================================================================

  const handleStartSession = useCallback(() => {
    socket.emit('chief:session:start', { sessionId });
  }, [sessionId, socket]);

  const handlePauseSession = useCallback(() => {
    socket.emit('chief:session:pause', { sessionId });
  }, [sessionId, socket]);

  const handleResumeSession = useCallback(() => {
    socket.emit('chief:session:resume', { sessionId });
  }, [sessionId, socket]);

  const handleCompleteSession = useCallback(() => {
    if (window.confirm('Вы уверены, что хотите завершить сессию?')) {
      socket.emit('chief:session:complete', { sessionId });
    }
  }, [sessionId, socket]);

  // ============================================================================
  // PERFORMER CONTROL HANDLERS
  // ============================================================================

  const handleNextPerformer = useCallback(() => {
    const allSubmitted = sessionState.totalSubmitted === sessionState.totalJudges;

    if (!allSubmitted) {
      const confirmed = window.confirm(
        'Не все судьи отправили оценки. Продолжить?'
      );
      if (!confirmed) return;
    }

    socket.emit('chief:performer:next', {
      sessionId,
      force: !allSubmitted,
    });
  }, [sessionId, sessionState, socket]);

  const handlePreviousPerformer = useCallback(() => {
    if (window.confirm('Вернуться к предыдущей гимнастке?')) {
      socket.emit('chief:performer:previous', { sessionId });
    }
  }, [sessionId, socket]);

  const handleJumpToPerformer = useCallback(
    (performerId: string) => {
      if (window.confirm('Перейти к выбранной гимнастке?')) {
        socket.emit('chief:performer:jump', { sessionId, performerId });
      }
    },
    [sessionId, socket]
  );

  const handleSkipPerformer = useCallback(
    (performerId: string) => {
      const reason = window.prompt('Причина пропуска:');
      if (reason) {
        socket.emit('chief:performer:skip', {
          sessionId,
          performerId,
          reason,
        });
      }
    },
    [sessionId, socket]
  );

  // ============================================================================
  // SCORE CONTROL HANDLERS
  // ============================================================================

  const handleLockScores = useCallback(() => {
    socket.emit('chief:scores:lock', {
      sessionId,
      performerId: sessionState.currentPerformer?.id,
    });
  }, [sessionId, sessionState, socket]);

  const handleReopenScores = useCallback(() => {
    if (window.confirm('Разблокировать оценки для редактирования?')) {
      socket.emit('chief:scores:reopen', {
        sessionId,
        performerId: sessionState.currentPerformer?.id,
      });
    }
  }, [sessionId, sessionState, socket]);

  const handleInvalidateScore = useCallback(
    (judgeRole: string) => {
      const reason = window.prompt('Причина аннулирования оценки:');
      if (reason) {
        socket.emit('chief:score:invalidate', {
          sessionId,
          performerId: sessionState.currentPerformer?.id,
          judgeRole,
          reason,
        });
      }
    },
    [sessionId, sessionState, socket]
  );

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getJudgesByPanel = (panelType: string) => {
    return sessionState.judges.filter(j => j.panelType === panelType);
  };

  const calculateProgress = () => {
    const completed = sessionState.allPerformers.filter(
      p => p.status === 'COMPLETED'
    ).length;
    return (completed / sessionState.allPerformers.length) * 100;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="chief-judge-panel">
      {/* Header */}
      <header className="panel-header">
        <div className="panel-title">
          <h1>👨‍⚖️ Chief Judge Control Panel</h1>
        </div>
        <div className="session-info">
          <span className="session-id">Сессия: {sessionId.slice(0, 8)}</span>
          <span className={`session-status ${sessionState.status.toLowerCase()}`}>
            {sessionState.status}
          </span>
        </div>
      </header>

      {/* Session Controls */}
      <section className="session-controls">
        <h2>Управление сессией</h2>
        <div className="control-buttons">
          {sessionState.status === 'PENDING' && (
            <button
              className="btn btn-success"
              onClick={handleStartSession}
            >
              ▶ Начать сессию
            </button>
          )}

          {sessionState.status === 'ACTIVE' && (
            <button
              className="btn btn-warning"
              onClick={handlePauseSession}
            >
              ⏸ Пауза
            </button>
          )}

          {sessionState.status === 'PAUSED' && (
            <button
              className="btn btn-success"
              onClick={handleResumeSession}
            >
              ▶ Продолжить
            </button>
          )}

          {sessionState.status !== 'COMPLETED' && (
            <button
              className="btn btn-danger"
              onClick={handleCompleteSession}
            >
              ⏹ Завершить сессию
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="session-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          <span className="progress-text">
            {sessionState.allPerformers.filter(p => p.status === 'COMPLETED').length} /{' '}
            {sessionState.allPerformers.length} завершено
          </span>
        </div>
      </section>

      {/* Current Performer */}
      {sessionState.currentPerformer && (
        <section className="current-performer">
          <h2>Текущая гимнастка</h2>
          <div className="performer-card large">
            <div className="performer-number">
              {sessionState.currentPerformer.orderNumber}
            </div>
            <div className="performer-details">
              <h3>{sessionState.currentPerformer.fullName}</h3>
              <p>{sessionState.currentPerformer.club}</p>
            </div>
          </div>

          <div className="performer-controls">
            <button
              className="btn btn-secondary"
              onClick={handlePreviousPerformer}
              disabled={sessionState.currentAthleteIndex === 0}
            >
              ← Назад
            </button>

            <button
              className="btn btn-primary"
              onClick={handleNextPerformer}
              disabled={
                sessionState.currentAthleteIndex ===
                sessionState.allPerformers.length - 1
              }
            >
              Следующая →
            </button>
          </div>
        </section>
      )}

      {/* Judges Status */}
      <section className="judges-status">
        <h2>Статус судей</h2>

        {/* D-Panel */}
        <div className="panel-group">
          <h3>📊 D-Panel (Трудность)</h3>
          <div className="judges-grid">
            {getJudgesByPanel('D_PANEL').map(judge => (
              <div
                key={judge.judgeId}
                className={`judge-card ${judge.isConnected ? 'connected' : 'disconnected'} ${
                  judge.hasSubmitted ? 'submitted' : ''
                }`}
              >
                <span className="judge-role">{judge.judgeRole}</span>
                <span className="judge-name">{judge.judgeName}</span>
                <div className="judge-indicators">
                  <span className="connection-indicator">
                    {judge.isConnected ? '🟢' : '🔴'}
                  </span>
                  <span className="submission-indicator">
                    {judge.hasSubmitted ? '✓' : '○'}
                  </span>
                </div>
                {judge.scoreValue !== undefined && (
                  <span className="judge-score">{judge.scoreValue.toFixed(3)}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* E-Panel */}
        <div className="panel-group">
          <h3>🎯 E-Panel (Исполнение)</h3>
          <div className="judges-grid">
            {getJudgesByPanel('E_PANEL').map(judge => (
              <div
                key={judge.judgeId}
                className={`judge-card ${judge.isConnected ? 'connected' : 'disconnected'} ${
                  judge.hasSubmitted ? 'submitted' : ''
                }`}
              >
                <span className="judge-role">{judge.judgeRole}</span>
                <span className="judge-name">{judge.judgeName}</span>
                <div className="judge-indicators">
                  <span className="connection-indicator">
                    {judge.isConnected ? '🟢' : '🔴'}
                  </span>
                  <span className="submission-indicator">
                    {judge.hasSubmitted ? '✓' : '○'}
                  </span>
                </div>
                {judge.scoreValue !== undefined && (
                  <span className="judge-score">{judge.scoreValue.toFixed(3)}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* A-Panel */}
        <div className="panel-group">
          <h3>🎨 A-Panel (Артистизм)</h3>
          <div className="judges-grid">
            {getJudgesByPanel('A_PANEL').map(judge => (
              <div
                key={judge.judgeId}
                className={`judge-card ${judge.isConnected ? 'connected' : 'disconnected'} ${
                  judge.hasSubmitted ? 'submitted' : ''
                }`}
              >
                <span className="judge-role">{judge.judgeRole}</span>
                <span className="judge-name">{judge.judgeName}</span>
                <div className="judge-indicators">
                  <span className="connection-indicator">
                    {judge.isConnected ? '🟢' : '🔴'}
                  </span>
                  <span className="submission-indicator">
                    {judge.hasSubmitted ? '✓' : '○'}
                  </span>
                </div>
                {judge.scoreValue !== undefined && (
                  <span className="judge-score">{judge.scoreValue.toFixed(3)}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Technical Panel */}
        <div className="panel-group">
          <h3>⚙️ Technical Panel</h3>
          <div className="judges-grid">
            {getJudgesByPanel('TECHNICAL').map(judge => (
              <div
                key={judge.judgeId}
                className={`judge-card ${judge.isConnected ? 'connected' : 'disconnected'}`}
              >
                <span className="judge-role">{judge.judgeRole}</span>
                <span className="judge-name">{judge.judgeName}</span>
                <div className="judge-indicators">
                  <span className="connection-indicator">
                    {judge.isConnected ? '🟢' : '🔴'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submission Summary */}
        <div className="submission-summary">
          <span className="summary-text">
            Отправлено оценок: {sessionState.totalSubmitted} / {sessionState.totalJudges}
          </span>
          {sessionState.totalSubmitted === sessionState.totalJudges && (
            <span className="all-submitted">✓ Все оценки получены</span>
          )}
        </div>
      </section>

      {/* Score Actions */}
      <section className="score-actions">
        <h2>Управление оценками</h2>
        <div className="action-buttons">
          <button
            className="btn btn-warning"
            onClick={handleLockScores}
            disabled={sessionState.totalSubmitted !== sessionState.totalJudges}
          >
            🔒 Заблокировать оценки
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleReopenScores}
          >
            🔓 Разблокировать оценки
          </button>

          <button
            className="btn btn-info"
            onClick={() => setShowScoreDetails(!showScoreDetails)}
          >
            {showScoreDetails ? '▼ Скрыть детали' : '▶ Показать детали'}
          </button>
        </div>
      </section>

      {/* All Performers List */}
      <section className="all-performers">
        <h2>Все участники</h2>
        <div className="performers-list">
          {sessionState.allPerformers.map((performer) => (
            <div
              key={performer.id}
              className={`performer-item ${performer.status.toLowerCase()} ${
                performer.id === sessionState.currentPerformer?.id ? 'current' : ''
              }`}
              onClick={() => setSelectedPerformer(performer)}
            >
              <span className="performer-order">{performer.orderNumber}</span>
              <span className="performer-name">{performer.fullName}</span>
              <span className="performer-club">{performer.club}</span>
              <span className={`performer-status ${performer.status.toLowerCase()}`}>
                {performer.status}
              </span>
              {performer.finalScore !== undefined && (
                <span className="performer-score">
                  {performer.finalScore.toFixed(3)}
                </span>
              )}
              <div className="performer-actions">
                <button
                  className="btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJumpToPerformer(performer.id);
                  }}
                >
                  →
                </button>
                <button
                  className="btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipPerformer(performer.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ChiefJudgePanel;
