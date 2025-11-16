// D-Panel (Difficulty Panel) Component
// For D-brigade judges evaluating Body Difficulties (BD) and Apparatus Difficulties (AD)

import React, { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// ============================================================================
// TYPES
// ============================================================================

interface DifficultyElement {
  code: string;
  value: number;
  validated: boolean;
  timestamp?: string;
}

interface CurrentPerformer {
  id: string;
  fullName: string;
  club: string;
  orderNumber: number;
  apparatus: string;
}

interface DPanelProps {
  sessionId: string;
  judgeRole: 'D1' | 'D2' | 'D3' | 'D4';
  socket: Socket;
  token: string;
}

interface DScoreData {
  bodyDifficulties: DifficultyElement[];
  apparatusDifficulties: DifficultyElement[];
  totalBD: number;
  totalAD: number;
  totalD: number;
  notes?: string;
}

// ============================================================================
// DIFFICULTY VALUES (FIG 2025-2028)
// ============================================================================

const BD_VALUES = [
  { value: 0.1, label: '0.1' },
  { value: 0.2, label: '0.2' },
  { value: 0.3, label: '0.3' },
  { value: 0.4, label: '0.4' },
  { value: 0.5, label: '0.5' },
  { value: 0.6, label: '0.6' },
  { value: 0.7, label: '0.7' },
  { value: 0.8, label: '0.8' },
  { value: 0.9, label: '0.9' },
  { value: 1.0, label: '1.0' },
];

const AD_VALUES = [
  { value: 0.1, label: '0.1' },
  { value: 0.2, label: '0.2' },
  { value: 0.3, label: '0.3' },
  { value: 0.4, label: '0.4' },
  { value: 0.5, label: '0.5' },
  { value: 0.6, label: '0.6' },
  { value: 0.7, label: '0.7' },
  { value: 0.8, label: '0.8' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const DPanel: React.FC<DPanelProps> = ({
  sessionId,
  judgeRole,
  socket,
  token,
}) => {
  // Current performer state
  const [currentPerformer, setCurrentPerformer] = useState<CurrentPerformer | null>(null);

  // Scoring state
  const [bodyDifficulties, setBodyDifficulties] = useState<DifficultyElement[]>([]);
  const [apparatusDifficulties, setApparatusDifficulties] = useState<DifficultyElement[]>([]);
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'BD' | 'AD'>('BD');

  // Other judges' status
  const [otherDJudges, setOtherDJudges] = useState<Array<{
    role: string;
    status: 'pending' | 'submitted';
    totalD?: number;
  }>>([]);

  // Calculated totals
  const totalBD = bodyDifficulties.reduce((sum, el) => sum + el.value, 0);
  const totalAD = apparatusDifficulties.reduce((sum, el) => sum + el.value, 0);
  const totalD = totalBD + totalAD;

  // ============================================================================
  // WEBSOCKET HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!socket) return;

    // Session joined - receive current state
    socket.on('session:joined', (data) => {
      setCurrentPerformer(data.currentPerformer);

      if (data.myScore?.dPanelData) {
        setBodyDifficulties(data.myScore.dPanelData.bodyDifficulties || []);
        setApparatusDifficulties(data.myScore.dPanelData.apparatusDifficulties || []);
        setNotes(data.myScore.dPanelData.notes || '');
        setIsSubmitted(data.myScore.status === 'SUBMITTED');
        setIsLocked(data.myScore.status === 'LOCKED');
      }

      // Other D judges status
      if (data.otherDJudges) {
        setOtherDJudges(data.otherDJudges);
      }
    });

    // Performer changed - reset for new athlete
    socket.on('performer:changed', (data) => {
      setCurrentPerformer(data.currentPerformer);
      setBodyDifficulties([]);
      setApparatusDifficulties([]);
      setNotes('');
      setIsSubmitted(false);
      setIsLocked(false);
      setActiveTab('BD');
    });

    // Other D judge submitted
    socket.on('d:score:submitted', (data) => {
      setOtherDJudges(prev =>
        prev.map(judge =>
          judge.role === data.judgeRole
            ? { ...judge, status: 'submitted', totalD: data.totalD }
            : judge
        )
      );
    });

    // Score locked by chief judge
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

      if (data.myScore?.dPanelData) {
        setBodyDifficulties(data.myScore.dPanelData.bodyDifficulties || []);
        setApparatusDifficulties(data.myScore.dPanelData.apparatusDifficulties || []);
        setNotes(data.myScore.dPanelData.notes || '');
        setIsSubmitted(data.myScore.status === 'SUBMITTED');
        setIsLocked(data.myScore.status === 'LOCKED');
      }
    });

    return () => {
      socket.off('session:joined');
      socket.off('performer:changed');
      socket.off('d:score:submitted');
      socket.off('score:locked');
      socket.off('score:reopened');
      socket.off('session:sync');
    };
  }, [socket]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddBD = useCallback((value: number) => {
    if (isSubmitted || isLocked) return;

    const newElement: DifficultyElement = {
      code: `BD${bodyDifficulties.length + 1}`,
      value,
      validated: false,
      timestamp: new Date().toISOString(),
    };

    setBodyDifficulties(prev => [...prev, newElement]);
  }, [bodyDifficulties, isSubmitted, isLocked]);

  const handleRemoveBD = useCallback((index: number) => {
    if (isSubmitted || isLocked) return;
    setBodyDifficulties(prev => prev.filter((_, i) => i !== index));
  }, [isSubmitted, isLocked]);

  const handleToggleBDValidation = useCallback((index: number) => {
    if (isSubmitted || isLocked) return;
    setBodyDifficulties(prev =>
      prev.map((el, i) =>
        i === index ? { ...el, validated: !el.validated } : el
      )
    );
  }, [isSubmitted, isLocked]);

  const handleAddAD = useCallback((value: number) => {
    if (isSubmitted || isLocked) return;

    const newElement: DifficultyElement = {
      code: `AD${apparatusDifficulties.length + 1}`,
      value,
      validated: false,
      timestamp: new Date().toISOString(),
    };

    setApparatusDifficulties(prev => [...prev, newElement]);
  }, [apparatusDifficulties, isSubmitted, isLocked]);

  const handleRemoveAD = useCallback((index: number) => {
    if (isSubmitted || isLocked) return;
    setApparatusDifficulties(prev => prev.filter((_, i) => i !== index));
  }, [isSubmitted, isLocked]);

  const handleToggleADValidation = useCallback((index: number) => {
    if (isSubmitted || isLocked) return;
    setApparatusDifficulties(prev =>
      prev.map((el, i) =>
        i === index ? { ...el, validated: !el.validated } : el
      )
    );
  }, [isSubmitted, isLocked]);

  const handleSubmit = useCallback(() => {
    if (isSubmitted || isLocked) return;

    const scoreData: DScoreData = {
      bodyDifficulties,
      apparatusDifficulties,
      totalBD,
      totalAD,
      totalD,
      notes,
    };

    socket.emit('d:score:submit', {
      sessionId,
      performerId: currentPerformer?.id,
      scoreData,
    });

    setIsSubmitted(true);
  }, [
    sessionId,
    currentPerformer,
    bodyDifficulties,
    apparatusDifficulties,
    totalBD,
    totalAD,
    totalD,
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
      <div className="d-panel loading">
        <div className="spinner"></div>
        <p>Ожидание текущей гимнастки...</p>
      </div>
    );
  }

  return (
    <div className="d-panel">
      {/* Header */}
      <header className="panel-header">
        <div className="panel-title">
          <h1>📊 D-Panel</h1>
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

      {/* Score Summary */}
      <section className="score-summary">
        <div className="score-card bd">
          <span className="score-label">BD</span>
          <span className="score-value">{totalBD.toFixed(3)}</span>
          <span className="score-count">({bodyDifficulties.length})</span>
        </div>
        <div className="score-card ad">
          <span className="score-label">AD</span>
          <span className="score-value">{totalAD.toFixed(3)}</span>
          <span className="score-count">({apparatusDifficulties.length})</span>
        </div>
        <div className="score-card total">
          <span className="score-label">D Total</span>
          <span className="score-value total-value">{totalD.toFixed(3)}</span>
        </div>
      </section>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'BD' ? 'active' : ''}`}
          onClick={() => setActiveTab('BD')}
          disabled={isLocked}
        >
          Body Difficulties (BD)
        </button>
        <button
          className={`tab ${activeTab === 'AD' ? 'active' : ''}`}
          onClick={() => setActiveTab('AD')}
          disabled={isLocked}
        >
          Apparatus Difficulties (AD)
        </button>
      </div>

      {/* BD Tab */}
      {activeTab === 'BD' && (
        <section className="difficulty-section">
          <h3>Body Difficulties</h3>

          {/* BD Value Buttons */}
          <div className="value-buttons">
            {BD_VALUES.map(({ value, label }) => (
              <button
                key={value}
                className="value-btn"
                onClick={() => handleAddBD(value)}
                disabled={isSubmitted || isLocked}
              >
                {label}
              </button>
            ))}
          </div>

          {/* BD Elements List */}
          <div className="elements-list">
            {bodyDifficulties.length === 0 ? (
              <p className="empty-message">Нажмите кнопку выше для добавления элемента BD</p>
            ) : (
              bodyDifficulties.map((element, index) => (
                <div
                  key={index}
                  className={`element-item ${element.validated ? 'validated' : ''}`}
                >
                  <span className="element-code">{element.code}</span>
                  <span className="element-value">{element.value.toFixed(1)}</span>
                  <button
                    className="toggle-validation-btn"
                    onClick={() => handleToggleBDValidation(index)}
                    disabled={isSubmitted || isLocked}
                    title={element.validated ? 'Отменить валидацию' : 'Валидировать'}
                  >
                    {element.validated ? '✓' : '○'}
                  </button>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveBD(index)}
                    disabled={isSubmitted || isLocked}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* AD Tab */}
      {activeTab === 'AD' && (
        <section className="difficulty-section">
          <h3>Apparatus Difficulties</h3>

          {/* AD Value Buttons */}
          <div className="value-buttons">
            {AD_VALUES.map(({ value, label }) => (
              <button
                key={value}
                className="value-btn"
                onClick={() => handleAddAD(value)}
                disabled={isSubmitted || isLocked}
              >
                {label}
              </button>
            ))}
          </div>

          {/* AD Elements List */}
          <div className="elements-list">
            {apparatusDifficulties.length === 0 ? (
              <p className="empty-message">Нажмите кнопку выше для добавления элемента AD</p>
            ) : (
              apparatusDifficulties.map((element, index) => (
                <div
                  key={index}
                  className={`element-item ${element.validated ? 'validated' : ''}`}
                >
                  <span className="element-code">{element.code}</span>
                  <span className="element-value">{element.value.toFixed(1)}</span>
                  <button
                    className="toggle-validation-btn"
                    onClick={() => handleToggleADValidation(index)}
                    disabled={isSubmitted || isLocked}
                    title={element.validated ? 'Отменить валидацию' : 'Валидировать'}
                  >
                    {element.validated ? '✓' : '○'}
                  </button>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveAD(index)}
                    disabled={isSubmitted || isLocked}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

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

      {/* Other D Judges Status */}
      <section className="other-judges">
        <h4>Другие судьи D-бригады:</h4>
        <div className="judges-list">
          {otherDJudges.map((judge) => (
            <div key={judge.role} className={`judge-status ${judge.status}`}>
              <span className="judge-role">{judge.role}</span>
              <span className="judge-status-badge">
                {judge.status === 'submitted' ? '✓' : '○'}
              </span>
              {judge.totalD !== undefined && (
                <span className="judge-score">{judge.totalD.toFixed(3)}</span>
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
            disabled={bodyDifficulties.length === 0 && apparatusDifficulties.length === 0}
          >
            Отправить оценку
          </button>
        )}

        {isSubmitted && !isLocked && (
          <button
            className="btn btn-secondary edit-btn"
            onClick={handleEdit}
          >
            Редактировать
          </button>
        )}

        {isSubmitted && (
          <div className="status-badge submitted">
            ✓ Оценка отправлена
          </div>
        )}

        {isLocked && (
          <div className="status-badge locked">
            🔒 Оценка заблокирована
          </div>
        )}
      </footer>
    </div>
  );
};

export default DPanel;
