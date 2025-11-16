// A-Panel (Artistry Panel) Component
// For A-brigade judges evaluating artistry components

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

interface APanelProps {
  sessionId: string;
  judgeRole: 'A1' | 'A2';
  socket: Socket;
  token: string;
}

interface AScoreData {
  musicRelation: number;
  bodyExpression: number;
  spaceUse: number;
  composition: number;
  unity: number;
  totalA: number;
  notes?: string;
}

interface ComponentScore {
  name: string;
  label: string;
  value: number;
  maxValue: number;
}

// ============================================================================
// ARTISTRY COMPONENTS (FIG 2025-2028)
// ============================================================================

const ARTISTRY_COMPONENTS = [
  {
    name: 'musicRelation',
    label: 'Связь с музыкой',
    description: 'Музыкальность и соответствие движений музыке',
    maxValue: 2.0,
    icon: '🎵',
  },
  {
    name: 'bodyExpression',
    label: 'Выразительность тела',
    description: 'Экспрессия, эмоциональность, артистизм',
    maxValue: 2.0,
    icon: '💃',
  },
  {
    name: 'spaceUse',
    label: 'Использование пространства',
    description: 'Перемещения, уровни, направления',
    maxValue: 2.0,
    icon: '🌐',
  },
  {
    name: 'composition',
    label: 'Композиция',
    description: 'Хореография, разнообразие, баланс',
    maxValue: 2.0,
    icon: '🎨',
  },
  {
    name: 'unity',
    label: 'Целостность',
    description: 'Единство движений и предмета, гармония',
    maxValue: 2.0,
    icon: '✨',
  },
];

const SCORE_INCREMENT = 0.05; // Increment for slider (0.05 precision)

// ============================================================================
// COMPONENT
// ============================================================================

export const APanel: React.FC<APanelProps> = ({
  sessionId,
  judgeRole,
  socket,
  token,
}) => {
  // Current performer state
  const [currentPerformer, setCurrentPerformer] = useState<CurrentPerformer | null>(null);

  // Scoring state
  const [scores, setScores] = useState<Record<string, number>>({
    musicRelation: 0,
    bodyExpression: 0,
    spaceUse: 0,
    composition: 0,
    unity: 0,
  });
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Other judges' status
  const [otherAJudges, setOtherAJudges] = useState<Array<{
    role: string;
    status: 'pending' | 'submitted';
    totalA?: number;
  }>>([]);

  // Calculated total
  const totalA = Object.values(scores).reduce((sum, value) => sum + value, 0);

  // ============================================================================
  // WEBSOCKET HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!socket) return;

    // Session joined - receive current state
    socket.on('session:joined', (data) => {
      setCurrentPerformer(data.currentPerformer);

      if (data.myScore?.aPanelData) {
        const { aPanelData } = data.myScore;
        setScores({
          musicRelation: aPanelData.musicRelation || 0,
          bodyExpression: aPanelData.bodyExpression || 0,
          spaceUse: aPanelData.spaceUse || 0,
          composition: aPanelData.composition || 0,
          unity: aPanelData.unity || 0,
        });
        setNotes(aPanelData.notes || '');
        setIsSubmitted(data.myScore.status === 'SUBMITTED');
        setIsLocked(data.myScore.status === 'LOCKED');
      }

      if (data.otherAJudges) {
        setOtherAJudges(data.otherAJudges);
      }
    });

    // Performer changed - reset for new athlete
    socket.on('performer:changed', (data) => {
      setCurrentPerformer(data.currentPerformer);
      setScores({
        musicRelation: 0,
        bodyExpression: 0,
        spaceUse: 0,
        composition: 0,
        unity: 0,
      });
      setNotes('');
      setIsSubmitted(false);
      setIsLocked(false);
    });

    // Other A judge submitted
    socket.on('a:score:submitted', (data) => {
      setOtherAJudges(prev =>
        prev.map(judge =>
          judge.role === data.judgeRole
            ? { ...judge, status: 'submitted', totalA: data.totalA }
            : judge
        )
      );
    });

    // Score locked
    socket.on('score:locked', () => {
      setIsLocked(true);
    });

    // Score reopened
    socket.on('score:reopened', () => {
      setIsLocked(false);
      setIsSubmitted(false);
    });

    // Session sync after reconnect
    socket.on('session:sync', (data) => {
      setCurrentPerformer(data.currentPerformer);

      if (data.myScore?.aPanelData) {
        const { aPanelData } = data.myScore;
        setScores({
          musicRelation: aPanelData.musicRelation || 0,
          bodyExpression: aPanelData.bodyExpression || 0,
          spaceUse: aPanelData.spaceUse || 0,
          composition: aPanelData.composition || 0,
          unity: aPanelData.unity || 0,
        });
        setNotes(aPanelData.notes || '');
        setIsSubmitted(data.myScore.status === 'SUBMITTED');
        setIsLocked(data.myScore.status === 'LOCKED');
      }
    });

    return () => {
      socket.off('session:joined');
      socket.off('performer:changed');
      socket.off('a:score:submitted');
      socket.off('score:locked');
      socket.off('score:reopened');
      socket.off('session:sync');
    };
  }, [socket]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleScoreChange = useCallback(
    (componentName: string, value: number) => {
      if (isSubmitted || isLocked) return;

      // Round to 2 decimal places
      const roundedValue = Math.round(value * 100) / 100;

      setScores(prev => ({
        ...prev,
        [componentName]: Math.max(0, Math.min(2.0, roundedValue)),
      }));
    },
    [isSubmitted, isLocked]
  );

  const handleIncrement = useCallback(
    (componentName: string) => {
      if (isSubmitted || isLocked) return;
      const currentValue = scores[componentName];
      handleScoreChange(componentName, currentValue + SCORE_INCREMENT);
    },
    [scores, isSubmitted, isLocked, handleScoreChange]
  );

  const handleDecrement = useCallback(
    (componentName: string) => {
      if (isSubmitted || isLocked) return;
      const currentValue = scores[componentName];
      handleScoreChange(componentName, currentValue - SCORE_INCREMENT);
    },
    [scores, isSubmitted, isLocked, handleScoreChange]
  );

  const handleSubmit = useCallback(() => {
    if (isSubmitted || isLocked) return;

    const scoreData: AScoreData = {
      musicRelation: scores.musicRelation,
      bodyExpression: scores.bodyExpression,
      spaceUse: scores.spaceUse,
      composition: scores.composition,
      unity: scores.unity,
      totalA,
      notes,
    };

    socket.emit('a:score:submit', {
      sessionId,
      performerId: currentPerformer?.id,
      scoreData,
    });

    setIsSubmitted(true);
  }, [
    sessionId,
    currentPerformer,
    scores,
    totalA,
    notes,
    isSubmitted,
    isLocked,
    socket,
  ]);

  const handleEdit = useCallback(() => {
    if (isLocked) return;
    setIsSubmitted(false);
  }, [isLocked]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!currentPerformer) {
    return (
      <div className="a-panel loading">
        <div className="spinner"></div>
        <p>Ожидание текущей гимнастки...</p>
      </div>
    );
  }

  return (
    <div className="a-panel">
      {/* Header */}
      <header className="panel-header">
        <div className="panel-title">
          <h1>🎨 A-Panel</h1>
          <span className="judge-role">{judgeRole}</span>
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
            <p className="performer-apparatus">
              <strong>Снаряд:</strong> {currentPerformer.apparatus}
            </p>
          </div>
        </div>
      </section>

      {/* Total Score */}
      <section className="score-summary">
        <div className="score-card total">
          <span className="score-label">Total Artistry</span>
          <span className="score-value total-value">{totalA.toFixed(3)}</span>
          <span className="score-max">/ 10.000</span>
        </div>
      </section>

      {/* Artistry Components */}
      <section className="components-section">
        <h3>Компоненты артистизма</h3>

        {ARTISTRY_COMPONENTS.map((component) => (
          <div key={component.name} className="component-card">
            <div className="component-header">
              <span className="component-icon">{component.icon}</span>
              <div className="component-info">
                <h4 className="component-label">{component.label}</h4>
                <p className="component-description">{component.description}</p>
              </div>
            </div>

            <div className="component-scoring">
              {/* Decrement Button */}
              <button
                className="adjust-btn decrement"
                onClick={() => handleDecrement(component.name)}
                disabled={isSubmitted || isLocked || scores[component.name] <= 0}
              >
                −
              </button>

              {/* Slider */}
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max={component.maxValue}
                  step={SCORE_INCREMENT}
                  value={scores[component.name]}
                  onChange={(e) =>
                    handleScoreChange(component.name, parseFloat(e.target.value))
                  }
                  disabled={isSubmitted || isLocked}
                  className="score-slider"
                />
                <div className="slider-value">{scores[component.name].toFixed(2)}</div>
                <div className="slider-max">/ {component.maxValue.toFixed(2)}</div>
              </div>

              {/* Increment Button */}
              <button
                className="adjust-btn increment"
                onClick={() => handleIncrement(component.name)}
                disabled={
                  isSubmitted ||
                  isLocked ||
                  scores[component.name] >= component.maxValue
                }
              >
                +
              </button>

              {/* Direct Input */}
              <input
                type="number"
                min="0"
                max={component.maxValue}
                step={SCORE_INCREMENT}
                value={scores[component.name].toFixed(2)}
                onChange={(e) =>
                  handleScoreChange(component.name, parseFloat(e.target.value) || 0)
                }
                disabled={isSubmitted || isLocked}
                className="score-input"
              />
            </div>

            {/* Progress Bar */}
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(scores[component.name] / component.maxValue) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        ))}
      </section>

      {/* Quick Presets */}
      <section className="presets-section">
        <h4>Быстрые значения:</h4>
        <div className="preset-buttons">
          {[0.5, 1.0, 1.5, 2.0].map((preset) => (
            <button
              key={preset}
              className="preset-btn"
              onClick={() => {
                if (isSubmitted || isLocked) return;
                setScores(prev => ({
                  musicRelation: preset,
                  bodyExpression: preset,
                  spaceUse: preset,
                  composition: preset,
                  unity: preset,
                }));
              }}
              disabled={isSubmitted || isLocked}
            >
              Все × {preset.toFixed(1)}
            </button>
          ))}
          <button
            className="preset-btn reset"
            onClick={() => {
              if (isSubmitted || isLocked) return;
              setScores({
                musicRelation: 0,
                bodyExpression: 0,
                spaceUse: 0,
                composition: 0,
                unity: 0,
              });
            }}
            disabled={isSubmitted || isLocked}
          >
            Сбросить
          </button>
        </div>
      </section>

      {/* Notes */}
      <section className="notes-section">
        <label htmlFor="notes">Примечания:</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitted || isLocked}
          placeholder="Дополнительные заметки..."
          rows={3}
        />
      </section>

      {/* Other A Judges Status */}
      <section className="other-judges">
        <h4>Другие судьи A-бригады:</h4>
        <div className="judges-list">
          {otherAJudges.map((judge) => (
            <div key={judge.role} className={`judge-status ${judge.status}`}>
              <span className="judge-role">{judge.role}</span>
              <span className="judge-status-badge">
                {judge.status === 'submitted' ? '✓' : '○'}
              </span>
              {judge.totalA !== undefined && (
                <span className="judge-score">{judge.totalA.toFixed(3)}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Action Buttons */}
      <footer className="panel-actions">
        {!isSubmitted && !isLocked && (
          <button
            className="btn btn-primary submit-btn"
            onClick={handleSubmit}
            disabled={totalA === 0}
          >
            Отправить оценку
          </button>
        )}

        {isSubmitted && !isLocked && (
          <button className="btn btn-secondary edit-btn" onClick={handleEdit}>
            Редактировать
          </button>
        )}

        {isSubmitted && (
          <div className="status-badge submitted">✓ Оценка отправлена</div>
        )}

        {isLocked && (
          <div className="status-badge locked">🔒 Оценка заблокирована</div>
        )}
      </footer>
    </div>
  );
};

export default APanel;
