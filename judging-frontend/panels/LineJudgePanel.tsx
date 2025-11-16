// Line Judge Panel Component
// For line judges tracking line faults (заступы за линию)

import React, { useState, useEffect, useCallback } from 'react';
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

interface LineJudgePanelProps {
  sessionId: string;
  socket: Socket;
  token: string;
}

interface LineFault {
  timestamp: string;
  side: 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK';
  type: 'FOOT_OUT' | 'APPARATUS_OUT' | 'BODY_OUT';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LineJudgePanel: React.FC<LineJudgePanelProps> = ({
  sessionId,
  socket,
  token,
}) => {
  // Current performer state
  const [currentPerformer, setCurrentPerformer] = useState<CurrentPerformer | null>(null);

  // Faults state
  const [faults, setFaults] = useState<LineFault[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isPerforming, setIsPerforming] = useState(false);

  // Calculated penalty
  const totalFaults = faults.length;
  const penalty = totalFaults * 0.05;

  // ============================================================================
  // WEBSOCKET HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!socket) return;

    // Session joined
    socket.on('session:joined', (data) => {
      setCurrentPerformer(data.currentPerformer);

      if (data.lineJudgeData) {
        setFaults(data.lineJudgeData.faults || []);
        setIsConfirmed(data.lineJudgeData.confirmed || false);
      }
    });

    // Performer changed
    socket.on('performer:changed', (data) => {
      setCurrentPerformer(data.currentPerformer);
      setFaults([]);
      setIsConfirmed(false);
      setIsPerforming(false);
    });

    // Performance started
    socket.on('performance:started', () => {
      setIsPerforming(true);
    });

    // Performance ended
    socket.on('performance:ended', () => {
      setIsPerforming(false);
    });

    // Session sync
    socket.on('session:sync', (data) => {
      setCurrentPerformer(data.currentPerformer);

      if (data.lineJudgeData) {
        setFaults(data.lineJudgeData.faults || []);
        setIsConfirmed(data.lineJudgeData.confirmed || false);
      }
    });

    return () => {
      socket.off('session:joined');
      socket.off('performer:changed');
      socket.off('performance:started');
      socket.off('performance:ended');
      socket.off('session:sync');
    };
  }, [socket]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddFault = useCallback(
    (side: 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK', type: 'FOOT_OUT' | 'APPARATUS_OUT' | 'BODY_OUT') => {
      if (isConfirmed) return;

      const newFault: LineFault = {
        timestamp: new Date().toISOString(),
        side,
        type,
      };

      setFaults(prev => [...prev, newFault]);

      // Immediately broadcast to E-judges
      socket.emit('line:fault:added', {
        sessionId,
        performerId: currentPerformer?.id,
        fault: newFault,
        totalFaults: faults.length + 1,
        penalty: (faults.length + 1) * 0.05,
      });
    },
    [sessionId, currentPerformer, faults, isConfirmed, socket]
  );

  const handleRemoveFault = useCallback(
    (index: number) => {
      if (isConfirmed) return;

      setFaults(prev => prev.filter((_, i) => i !== index));

      // Broadcast update to E-judges
      socket.emit('line:fault:removed', {
        sessionId,
        performerId: currentPerformer?.id,
        totalFaults: faults.length - 1,
        penalty: (faults.length - 1) * 0.05,
      });
    },
    [sessionId, currentPerformer, faults, isConfirmed, socket]
  );

  const handleConfirm = useCallback(() => {
    socket.emit('line:faults:confirm', {
      sessionId,
      performerId: currentPerformer?.id,
      faults,
      totalFaults,
      penalty,
    });

    setIsConfirmed(true);
  }, [sessionId, currentPerformer, faults, totalFaults, penalty, socket]);

  const handleEdit = useCallback(() => {
    setIsConfirmed(false);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!currentPerformer) {
    return (
      <div className="line-judge-panel loading">
        <div className="spinner"></div>
        <p>Ожидание текущей гимнастки...</p>
      </div>
    );
  }

  return (
    <div className="line-judge-panel">
      {/* Header */}
      <header className="panel-header">
        <div className="panel-title">
          <h1>📏 Line Judge</h1>
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
            {isPerforming && <div className="performing-badge">🔴 Выступает</div>}
          </div>
        </div>
      </section>

      {/* Faults Summary */}
      <section className="faults-summary">
        <div className="fault-card total">
          <span className="fault-label">Заступы</span>
          <span className="fault-value">{totalFaults}</span>
        </div>
        <div className="fault-card penalty">
          <span className="fault-label">Штраф</span>
          <span className="fault-value">{penalty.toFixed(3)}</span>
        </div>
      </section>

      {/* Fault Buttons */}
      <section className="fault-buttons-section">
        <h3>Зафиксировать заступ</h3>

        <div className="fault-grid">
          {/* Foot Out */}
          <div className="fault-category">
            <h4>Нога за линией</h4>
            <div className="fault-side-buttons">
              <button
                className="fault-btn left"
                onClick={() => handleAddFault('LEFT', 'FOOT_OUT')}
                disabled={isConfirmed}
              >
                ← Слева
              </button>
              <button
                className="fault-btn right"
                onClick={() => handleAddFault('RIGHT', 'FOOT_OUT')}
                disabled={isConfirmed}
              >
                Справа →
              </button>
              <button
                className="fault-btn front"
                onClick={() => handleAddFault('FRONT', 'FOOT_OUT')}
                disabled={isConfirmed}
              >
                ↑ Спереди
              </button>
              <button
                className="fault-btn back"
                onClick={() => handleAddFault('BACK', 'FOOT_OUT')}
                disabled={isConfirmed}
              >
                ↓ Сзади
              </button>
            </div>
          </div>

          {/* Apparatus Out */}
          <div className="fault-category">
            <h4>Предмет за линией</h4>
            <div className="fault-side-buttons">
              <button
                className="fault-btn apparatus left"
                onClick={() => handleAddFault('LEFT', 'APPARATUS_OUT')}
                disabled={isConfirmed}
              >
                ← Слева
              </button>
              <button
                className="fault-btn apparatus right"
                onClick={() => handleAddFault('RIGHT', 'APPARATUS_OUT')}
                disabled={isConfirmed}
              >
                Справа →
              </button>
              <button
                className="fault-btn apparatus front"
                onClick={() => handleAddFault('FRONT', 'APPARATUS_OUT')}
                disabled={isConfirmed}
              >
                ↑ Спереди
              </button>
              <button
                className="fault-btn apparatus back"
                onClick={() => handleAddFault('BACK', 'APPARATUS_OUT')}
                disabled={isConfirmed}
              >
                ↓ Сзади
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Faults List */}
      <section className="faults-list-section">
        <h4>Зафиксированные заступы:</h4>
        {faults.length === 0 ? (
          <p className="empty-message">Заступов не зафиксировано</p>
        ) : (
          <div className="faults-list">
            {faults.map((fault, index) => (
              <div key={index} className="fault-item">
                <span className="fault-time">
                  {new Date(fault.timestamp).toLocaleTimeString()}
                </span>
                <span className="fault-type">
                  {fault.type === 'FOOT_OUT' && '👟 Нога'}
                  {fault.type === 'APPARATUS_OUT' && '🎾 Предмет'}
                  {fault.type === 'BODY_OUT' && '🤸 Тело'}
                </span>
                <span className="fault-side">{fault.side}</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveFault(index)}
                  disabled={isConfirmed}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <footer className="panel-actions">
        {!isConfirmed && (
          <button
            className="btn btn-primary confirm-btn"
            onClick={handleConfirm}
          >
            Подтвердить ({totalFaults} заступ{totalFaults === 1 ? '' : 'ов'})
          </button>
        )}

        {isConfirmed && (
          <>
            <button className="btn btn-secondary edit-btn" onClick={handleEdit}>
              Редактировать
            </button>
            <div className="status-badge confirmed">
              ✓ Подтверждено
            </div>
          </>
        )}
      </footer>
    </div>
  );
};

export default LineJudgePanel;
