// Time Keeper Panel Component
// For time keepers tracking performance duration and music timing

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

// ============================================================================
// TYPES
// ============================================================================

interface CurrentPerformer {
  id: string;
  fullName: string;
  club: string;
  orderNumber: number;
  apparatus: string;
}

interface TimeKeeperPanelProps {
  sessionId: string;
  socket: Socket;
  token: string;
}

interface TimeData {
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  musicStartTime: string | null;
  musicEndTime: string | null;
  musicDuration: number | null;
  isOvertime: boolean;
  overtimeSeconds: number | null;
  isUndertime: boolean;
  undertimeSeconds: number | null;
  timePenalty: number;
}

// ============================================================================
// TIME LIMITS (FIG 2025-2028)
// ============================================================================

const TIME_LIMITS = {
  MIN_DURATION: 75000,  // 1:15 (75 seconds)
  MAX_DURATION: 90000,  // 1:30 (90 seconds)
  PENALTY_PER_SECOND: 0.05,
};

// ============================================================================
// COMPONENT
// ============================================================================

export const TimeKeeperPanel: React.FC<TimeKeeperPanelProps> = ({
  sessionId,
  socket,
  token,
}) => {
  // Current performer state
  const [currentPerformer, setCurrentPerformer] = useState<CurrentPerformer | null>(null);

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [isMusicRunning, setIsMusicRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [musicElapsedTime, setMusicElapsedTime] = useState(0);

  // Time data
  const [timeData, setTimeData] = useState<TimeData>({
    startTime: null,
    endTime: null,
    duration: null,
    musicStartTime: null,
    musicEndTime: null,
    musicDuration: null,
    isOvertime: false,
    overtimeSeconds: null,
    isUndertime: false,
    undertimeSeconds: null,
    timePenalty: 0,
  });

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [notes, setNotes] = useState('');

  // Refs for timers
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const musicTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const musicStartTimeRef = useRef<number | null>(null);

  // ============================================================================
  // WEBSOCKET HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!socket) return;

    // Session joined
    socket.on('session:joined', (data) => {
      setCurrentPerformer(data.currentPerformer);

      if (data.timeKeeperData) {
        setTimeData(data.timeKeeperData);
        setIsConfirmed(data.timeKeeperData.confirmed || false);
        setNotes(data.timeKeeperData.notes || '');
      }
    });

    // Performer changed
    socket.on('performer:changed', (data) => {
      handleReset();
      setCurrentPerformer(data.currentPerformer);
    });

    // Session sync
    socket.on('session:sync', (data) => {
      setCurrentPerformer(data.currentPerformer);

      if (data.timeKeeperData) {
        setTimeData(data.timeKeeperData);
        setIsConfirmed(data.timeKeeperData.confirmed || false);
        setNotes(data.timeKeeperData.notes || '');
      }
    });

    return () => {
      socket.off('session:joined');
      socket.off('performer:changed');
      socket.off('session:sync');
    };
  }, [socket]);

  // ============================================================================
  // TIMER LOGIC
  // ============================================================================

  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - (startTimeRef.current || 0);
        setElapsedTime(elapsed);
      }, 10); // Update every 10ms for precision
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (isMusicRunning) {
      musicTimerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - (musicStartTimeRef.current || 0);
        setMusicElapsedTime(elapsed);
      }, 10);
    } else {
      if (musicTimerIntervalRef.current) {
        clearInterval(musicTimerIntervalRef.current);
        musicTimerIntervalRef.current = null;
      }
    }

    return () => {
      if (musicTimerIntervalRef.current) {
        clearInterval(musicTimerIntervalRef.current);
      }
    };
  }, [isMusicRunning]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleStartPerformance = useCallback(() => {
    const now = new Date().toISOString();
    startTimeRef.current = Date.now();

    setIsRunning(true);
    setTimeData(prev => ({ ...prev, startTime: now }));
    setElapsedTime(0);

    // Notify WebSocket
    socket.emit('time:performance:started', {
      sessionId,
      performerId: currentPerformer?.id,
      startTime: now,
    });
  }, [sessionId, currentPerformer, socket]);

  const handleStopPerformance = useCallback(() => {
    const now = new Date().toISOString();
    const duration = elapsedTime;

    setIsRunning(false);

    // Calculate penalties
    let isOvertime = false;
    let overtimeSeconds = null;
    let isUndertime = false;
    let undertimeSeconds = null;
    let timePenalty = 0;

    if (duration > TIME_LIMITS.MAX_DURATION) {
      isOvertime = true;
      overtimeSeconds = Math.ceil((duration - TIME_LIMITS.MAX_DURATION) / 1000);
      timePenalty = overtimeSeconds * TIME_LIMITS.PENALTY_PER_SECOND;
    } else if (duration < TIME_LIMITS.MIN_DURATION) {
      isUndertime = true;
      undertimeSeconds = Math.ceil((TIME_LIMITS.MIN_DURATION - duration) / 1000);
      timePenalty = undertimeSeconds * TIME_LIMITS.PENALTY_PER_SECOND;
    }

    setTimeData(prev => ({
      ...prev,
      endTime: now,
      duration,
      isOvertime,
      overtimeSeconds,
      isUndertime,
      undertimeSeconds,
      timePenalty,
    }));

    // Notify WebSocket
    socket.emit('time:performance:stopped', {
      sessionId,
      performerId: currentPerformer?.id,
      endTime: now,
      duration,
      isOvertime,
      overtimeSeconds,
      isUndertime,
      undertimeSeconds,
      timePenalty,
    });
  }, [sessionId, currentPerformer, elapsedTime, socket]);

  const handleStartMusic = useCallback(() => {
    const now = new Date().toISOString();
    musicStartTimeRef.current = Date.now();

    setIsMusicRunning(true);
    setTimeData(prev => ({ ...prev, musicStartTime: now }));
    setMusicElapsedTime(0);
  }, []);

  const handleStopMusic = useCallback(() => {
    const now = new Date().toISOString();
    const musicDuration = musicElapsedTime;

    setIsMusicRunning(false);
    setTimeData(prev => ({ ...prev, musicEndTime: now, musicDuration }));
  }, [musicElapsedTime]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsMusicRunning(false);
    setElapsedTime(0);
    setMusicElapsedTime(0);
    setIsConfirmed(false);
    setNotes('');

    setTimeData({
      startTime: null,
      endTime: null,
      duration: null,
      musicStartTime: null,
      musicEndTime: null,
      musicDuration: null,
      isOvertime: false,
      overtimeSeconds: null,
      isUndertime: false,
      undertimeSeconds: null,
      timePenalty: 0,
    });

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (musicTimerIntervalRef.current) clearInterval(musicTimerIntervalRef.current);
  }, []);

  const handleConfirm = useCallback(() => {
    socket.emit('time:confirm', {
      sessionId,
      performerId: currentPerformer?.id,
      timeData,
      notes,
    });

    setIsConfirmed(true);
  }, [sessionId, currentPerformer, timeData, notes, socket]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getTimeStatus = (): 'NORMAL' | 'WARNING' | 'OVERTIME' | 'UNDERTIME' => {
    if (!timeData.duration) return 'NORMAL';

    if (timeData.isOvertime) return 'OVERTIME';
    if (timeData.isUndertime) return 'UNDERTIME';
    if (timeData.duration > TIME_LIMITS.MAX_DURATION - 2000) return 'WARNING'; // Warning 2 seconds before limit

    return 'NORMAL';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!currentPerformer) {
    return (
      <div className="time-keeper-panel loading">
        <div className="spinner"></div>
        <p>Ожидание текущей гимнастки...</p>
      </div>
    );
  }

  const timeStatus = getTimeStatus();

  return (
    <div className="time-keeper-panel">
      {/* Header */}
      <header className="panel-header">
        <div className="panel-title">
          <h1>⏱️ Time Keeper</h1>
        </div>
        <div className="session-info">
          <span>Сессия: {sessionId.slice(0, 8)}</span>
        </div>
      </header>

      {/* Current Performer */}
      <section className="current-performer">
        <div className="performer-card">
          <div className="performer-number">{currentPerformer.orderNumber}</div>
          <div className="performer-details">
            <h2 className="performer-name">{currentPerformer.fullName}</h2>
            <p className="performer-club">{currentPerformer.club}</p>
          </div>
        </div>
      </section>

      {/* Main Timer */}
      <section className="main-timer">
        <div className={`timer-display ${timeStatus.toLowerCase()} ${isRunning ? 'running' : ''}`}>
          <span className="timer-label">Performance Time</span>
          <span className="timer-value">{formatTime(elapsedTime)}</span>
          {isRunning && <div className="running-indicator">🔴 REC</div>}
        </div>

        <div className="timer-controls">
          {!isRunning && !timeData.duration && (
            <button
              className="btn btn-success start-btn"
              onClick={handleStartPerformance}
              disabled={isConfirmed}
            >
              ▶ Старт
            </button>
          )}

          {isRunning && (
            <button
              className="btn btn-danger stop-btn"
              onClick={handleStopPerformance}
            >
              ⏹ Стоп
            </button>
          )}

          {!isRunning && timeData.duration && (
            <button className="btn btn-secondary reset-btn" onClick={handleReset} disabled={isConfirmed}>
              🔄 Сброс
            </button>
          )}
        </div>

        {/* Time Limits Reference */}
        <div className="time-limits">
          <span className="limit-min">Min: {formatTime(TIME_LIMITS.MIN_DURATION)}</span>
          <span className="limit-max">Max: {formatTime(TIME_LIMITS.MAX_DURATION)}</span>
        </div>
      </section>

      {/* Music Timer */}
      <section className="music-timer">
        <h3>Music Timing</h3>
        <div className={`timer-display music ${isMusicRunning ? 'running' : ''}`}>
          <span className="timer-value">{formatTime(musicElapsedTime)}</span>
        </div>

        <div className="timer-controls">
          {!isMusicRunning && !timeData.musicDuration && (
            <button
              className="btn btn-primary"
              onClick={handleStartMusic}
              disabled={isConfirmed}
            >
              ▶ Старт музыки
            </button>
          )}

          {isMusicRunning && (
            <button className="btn btn-warning" onClick={handleStopMusic}>
              ⏹ Стоп музыки
            </button>
          )}
        </div>
      </section>

      {/* Results */}
      {timeData.duration && (
        <section className="results-section">
          <h3>Результаты</h3>

          <div className="result-card">
            <span className="result-label">Длительность:</span>
            <span className="result-value">{formatTime(timeData.duration)}</span>
          </div>

          {timeData.musicDuration && (
            <div className="result-card">
              <span className="result-label">Музыка:</span>
              <span className="result-value">{formatTime(timeData.musicDuration)}</span>
            </div>
          )}

          {timeData.isOvertime && (
            <div className="result-card penalty overtime">
              <span className="result-label">⚠️ Превышение:</span>
              <span className="result-value">
                +{timeData.overtimeSeconds}s = -{timeData.timePenalty.toFixed(3)}
              </span>
            </div>
          )}

          {timeData.isUndertime && (
            <div className="result-card penalty undertime">
              <span className="result-label">⚠️ Недостаточно:</span>
              <span className="result-value">
                -{timeData.undertimeSeconds}s = -{timeData.timePenalty.toFixed(3)}
              </span>
            </div>
          )}

          {!timeData.isOvertime && !timeData.isUndertime && (
            <div className="result-card ok">
              <span className="result-label">✓ В пределах нормы</span>
            </div>
          )}
        </section>
      )}

      {/* Notes */}
      <section className="notes-section">
        <label htmlFor="notes">Примечания:</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isConfirmed}
          placeholder="Дополнительные заметки..."
          rows={2}
        />
      </section>

      {/* Action Buttons */}
      <footer className="panel-actions">
        {!isConfirmed && timeData.duration && (
          <button className="btn btn-primary confirm-btn" onClick={handleConfirm}>
            Подтвердить время
          </button>
        )}

        {isConfirmed && (
          <div className="status-badge confirmed">✓ Подтверждено</div>
        )}
      </footer>
    </div>
  );
};

export default TimeKeeperPanel;
