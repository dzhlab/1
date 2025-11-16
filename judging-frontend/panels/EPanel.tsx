// E-Panel (Execution Panel) Component
// For E-brigade judges evaluating execution through deductions

import React, { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// ============================================================================
// TYPES
// ============================================================================

interface Deduction {
  category: string;
  subcategory?: string;
  type: string;
  value: number;
  count: number;
  timestamp?: string;
}

interface CurrentPerformer {
  id: string;
  fullName: string;
  club: string;
  orderNumber: number;
  apparatus: string;
}

interface EPanelProps {
  sessionId: string;
  judgeRole: 'E1' | 'E2' | 'E3' | 'E4';
  socket: Socket;
  token: string;
}

interface EScoreData {
  artisticDeductions: Deduction[];
  technicalDeductions: Deduction[];
  lineFaults: number;
  linePenalty: number;
  totalArtisticDeductions: number;
  totalTechnicalDeductions: number;
  totalDeductions: number;
  finalE: number;
  notes?: string;
}

// ============================================================================
// DEDUCTION PRESETS (FIG 2025-2028)
// ============================================================================

const ARTISTIC_DEDUCTIONS = [
  {
    category: 'BODY',
    subcategory: 'POSTURE',
    label: 'Осанка',
    deductions: [
      { value: 0.1, label: 'Малая (0.1)' },
      { value: 0.2, label: 'Средняя (0.2)' },
      { value: 0.3, label: 'Большая (0.3)' },
    ],
  },
  {
    category: 'BODY',
    subcategory: 'AMPLITUDE',
    label: 'Амплитуда',
    deductions: [
      { value: 0.1, label: 'Малая (0.1)' },
      { value: 0.2, label: 'Средняя (0.2)' },
      { value: 0.3, label: 'Большая (0.3)' },
    ],
  },
  {
    category: 'BODY',
    subcategory: 'FLEXIBILITY',
    label: 'Гибкость',
    deductions: [
      { value: 0.1, label: 'Малая (0.1)' },
      { value: 0.2, label: 'Средняя (0.2)' },
    ],
  },
  {
    category: 'APPARATUS',
    subcategory: 'HANDLING',
    label: 'Владение предметом',
    deductions: [
      { value: 0.1, label: 'Малая (0.1)' },
      { value: 0.2, label: 'Средняя (0.2)' },
      { value: 0.3, label: 'Большая (0.3)' },
    ],
  },
  {
    category: 'APPARATUS',
    subcategory: 'PRECISION',
    label: 'Точность работы',
    deductions: [
      { value: 0.1, label: 'Малая (0.1)' },
      { value: 0.2, label: 'Средняя (0.2)' },
    ],
  },
];

const TECHNICAL_DEDUCTIONS = [
  {
    type: 'BALANCE_LOSS_SMALL',
    label: 'Потеря равновесия (малая)',
    value: 0.1,
  },
  {
    type: 'BALANCE_LOSS_MEDIUM',
    label: 'Потеря равновесия (средняя)',
    value: 0.3,
  },
  {
    type: 'BALANCE_LOSS_LARGE',
    label: 'Потеря равновесия (большая)',
    value: 0.5,
  },
  {
    type: 'FALL',
    label: 'Падение',
    value: 0.5,
  },
  {
    type: 'APPARATUS_LOSS',
    label: 'Потеря предмета',
    value: 0.5,
  },
  {
    type: 'APPARATUS_OUT_OF_BOUNDS',
    label: 'Предмет за площадкой',
    value: 0.3,
  },
  {
    type: 'INCOMPLETE_ELEMENT',
    label: 'Незавершённый элемент',
    value: 0.3,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const EPanel: React.FC<EPanelProps> = ({
  sessionId,
  judgeRole,
  socket,
  token,
}) => {
  // Current performer state
  const [currentPerformer, setCurrentPerformer] = useState<CurrentPerformer | null>(null);

  // Scoring state
  const [artisticDeductions, setArtisticDeductions] = useState<Deduction[]>([]);
  const [technicalDeductions, setTechnicalDeductions] = useState<Deduction[]>([]);
  const [lineFaults, setLineFaults] = useState(0);
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'ARTISTIC' | 'TECHNICAL'>('ARTISTIC');

  // Other judges' status
  const [otherEJudges, setOtherEJudges] = useState<Array<{
    role: string;
    status: 'pending' | 'submitted';
    finalE?: number;
  }>>([]);

  // Calculated totals
  const totalArtisticDeductions = artisticDeductions.reduce(
    (sum, d) => sum + d.value * d.count,
    0
  );
  const totalTechnicalDeductions = technicalDeductions.reduce(
    (sum, d) => sum + d.value * d.count,
    0
  );
  const linePenalty = lineFaults * 0.05;
  const totalDeductions = totalArtisticDeductions + totalTechnicalDeductions + linePenalty;
  const finalE = Math.max(0, 10.0 - totalDeductions);

  // ============================================================================
  // WEBSOCKET HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!socket) return;

    // Session joined - receive current state
    socket.on('session:joined', (data) => {
      setCurrentPerformer(data.currentPerformer);

      if (data.myScore?.ePanelData) {
        setArtisticDeductions(data.myScore.ePanelData.artisticDeductions || []);
        setTechnicalDeductions(data.myScore.ePanelData.technicalDeductions || []);
        setLineFaults(data.myScore.ePanelData.lineFaults || 0);
        setNotes(data.myScore.ePanelData.notes || '');
        setIsSubmitted(data.myScore.status === 'SUBMITTED');
        setIsLocked(data.myScore.status === 'LOCKED');
      }

      if (data.otherEJudges) {
        setOtherEJudges(data.otherEJudges);
      }
    });

    // Performer changed - reset for new athlete
    socket.on('performer:changed', (data) => {
      setCurrentPerformer(data.currentPerformer);
      setArtisticDeductions([]);
      setTechnicalDeductions([]);
      setLineFaults(0);
      setNotes('');
      setIsSubmitted(false);
      setIsLocked(false);
      setActiveTab('ARTISTIC');
    });

    // Other E judge submitted
    socket.on('e:score:submitted', (data) => {
      setOtherEJudges(prev =>
        prev.map(judge =>
          judge.role === data.judgeRole
            ? { ...judge, status: 'submitted', finalE: data.finalE }
            : judge
        )
      );
    });

    // Line faults updated (from line judge)
    socket.on('line:faults:updated', (data) => {
      setLineFaults(data.totalFaults);
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

      if (data.myScore?.ePanelData) {
        setArtisticDeductions(data.myScore.ePanelData.artisticDeductions || []);
        setTechnicalDeductions(data.myScore.ePanelData.technicalDeductions || []);
        setLineFaults(data.myScore.ePanelData.lineFaults || 0);
        setNotes(data.myScore.ePanelData.notes || '');
        setIsSubmitted(data.myScore.status === 'SUBMITTED');
        setIsLocked(data.myScore.status === 'LOCKED');
      }
    });

    return () => {
      socket.off('session:joined');
      socket.off('performer:changed');
      socket.off('e:score:submitted');
      socket.off('line:faults:updated');
      socket.off('score:locked');
      socket.off('score:reopened');
      socket.off('session:sync');
    };
  }, [socket]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddArtisticDeduction = useCallback(
    (category: string, subcategory: string, label: string, value: number) => {
      if (isSubmitted || isLocked) return;

      setArtisticDeductions(prev => {
        const existing = prev.find(
          d => d.category === category && d.subcategory === subcategory && d.value === value
        );

        if (existing) {
          return prev.map(d =>
            d === existing ? { ...d, count: d.count + 1 } : d
          );
        }

        return [
          ...prev,
          {
            category,
            subcategory,
            type: `${category}_${subcategory}_${value}`,
            value,
            count: 1,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    },
    [isSubmitted, isLocked]
  );

  const handleRemoveArtisticDeduction = useCallback((index: number) => {
    if (isSubmitted || isLocked) return;

    setArtisticDeductions(prev =>
      prev
        .map((d, i) =>
          i === index
            ? { ...d, count: d.count - 1 }
            : d
        )
        .filter(d => d.count > 0)
    );
  }, [isSubmitted, isLocked]);

  const handleAddTechnicalDeduction = useCallback((type: string, value: number) => {
    if (isSubmitted || isLocked) return;

    setTechnicalDeductions(prev => {
      const existing = prev.find(d => d.type === type);

      if (existing) {
        return prev.map(d =>
          d === existing ? { ...d, count: d.count + 1 } : d
        );
      }

      return [
        ...prev,
        {
          category: 'TECHNICAL',
          type,
          value,
          count: 1,
          timestamp: new Date().toISOString(),
        },
      ];
    });
  }, [isSubmitted, isLocked]);

  const handleRemoveTechnicalDeduction = useCallback((index: number) => {
    if (isSubmitted || isLocked) return;

    setTechnicalDeductions(prev =>
      prev
        .map((d, i) =>
          i === index
            ? { ...d, count: d.count - 1 }
            : d
        )
        .filter(d => d.count > 0)
    );
  }, [isSubmitted, isLocked]);

  const handleSubmit = useCallback(() => {
    if (isSubmitted || isLocked) return;

    const scoreData: EScoreData = {
      artisticDeductions,
      technicalDeductions,
      lineFaults,
      linePenalty,
      totalArtisticDeductions,
      totalTechnicalDeductions,
      totalDeductions,
      finalE,
      notes,
    };

    socket.emit('e:score:submit', {
      sessionId,
      performerId: currentPerformer?.id,
      scoreData,
    });

    setIsSubmitted(true);
  }, [
    sessionId,
    currentPerformer,
    artisticDeductions,
    technicalDeductions,
    lineFaults,
    linePenalty,
    totalArtisticDeductions,
    totalTechnicalDeductions,
    totalDeductions,
    finalE,
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
      <div className="e-panel loading">
        <div className="spinner"></div>
        <p>Ожидание текущей гимнастки...</p>
      </div>
    );
  }

  return (
    <div className="e-panel">
      {/* Header */}
      <header className="panel-header">
        <div className="panel-title">
          <h1>🎯 E-Panel</h1>
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
        <div className="score-card deductions">
          <span className="score-label">Сбавки</span>
          <span className="score-value">{totalDeductions.toFixed(3)}</span>
        </div>
        <div className="score-card line-penalty">
          <span className="score-label">Линия</span>
          <span className="score-value">{linePenalty.toFixed(3)}</span>
          <span className="score-count">({lineFaults})</span>
        </div>
        <div className="score-card total">
          <span className="score-label">E Score</span>
          <span className="score-value total-value">{finalE.toFixed(3)}</span>
        </div>
      </section>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'ARTISTIC' ? 'active' : ''}`}
          onClick={() => setActiveTab('ARTISTIC')}
          disabled={isLocked}
        >
          Артистические сбавки
        </button>
        <button
          className={`tab ${activeTab === 'TECHNICAL' ? 'active' : ''}`}
          onClick={() => setActiveTab('TECHNICAL')}
          disabled={isLocked}
        >
          Технические сбавки
        </button>
      </div>

      {/* Artistic Deductions Tab */}
      {activeTab === 'ARTISTIC' && (
        <section className="deductions-section">
          <h3>Артистические сбавки</h3>

          {/* Deduction Categories */}
          {ARTISTIC_DEDUCTIONS.map((category) => (
            <div key={`${category.category}_${category.subcategory}`} className="deduction-category">
              <h4>{category.label}</h4>
              <div className="deduction-buttons">
                {category.deductions.map((ded) => (
                  <button
                    key={ded.value}
                    className="deduction-btn"
                    onClick={() =>
                      handleAddArtisticDeduction(
                        category.category,
                        category.subcategory!,
                        category.label,
                        ded.value
                      )
                    }
                    disabled={isSubmitted || isLocked}
                  >
                    {ded.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Current Artistic Deductions */}
          <div className="current-deductions">
            <h4>Текущие сбавки:</h4>
            {artisticDeductions.length === 0 ? (
              <p className="empty-message">Сбавки не добавлены</p>
            ) : (
              artisticDeductions.map((ded, index) => (
                <div key={index} className="deduction-item">
                  <span className="deduction-label">
                    {ded.category} / {ded.subcategory}
                  </span>
                  <span className="deduction-value">
                    {ded.value.toFixed(1)} × {ded.count} = {(ded.value * ded.count).toFixed(1)}
                  </span>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveArtisticDeduction(index)}
                    disabled={isSubmitted || isLocked}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
            <div className="deductions-total">
              <strong>Итого артистические:</strong> {totalArtisticDeductions.toFixed(3)}
            </div>
          </div>
        </section>
      )}

      {/* Technical Deductions Tab */}
      {activeTab === 'TECHNICAL' && (
        <section className="deductions-section">
          <h3>Технические сбавки</h3>

          {/* Technical Deduction Buttons */}
          <div className="technical-deductions">
            {TECHNICAL_DEDUCTIONS.map((ded) => (
              <button
                key={ded.type}
                className="technical-deduction-btn"
                onClick={() => handleAddTechnicalDeduction(ded.type, ded.value)}
                disabled={isSubmitted || isLocked}
              >
                <span className="btn-label">{ded.label}</span>
                <span className="btn-value">{ded.value.toFixed(1)}</span>
              </button>
            ))}
          </div>

          {/* Current Technical Deductions */}
          <div className="current-deductions">
            <h4>Текущие сбавки:</h4>
            {technicalDeductions.length === 0 ? (
              <p className="empty-message">Сбавки не добавлены</p>
            ) : (
              technicalDeductions.map((ded, index) => (
                <div key={index} className="deduction-item">
                  <span className="deduction-label">{ded.type}</span>
                  <span className="deduction-value">
                    {ded.value.toFixed(1)} × {ded.count} = {(ded.value * ded.count).toFixed(1)}
                  </span>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveTechnicalDeduction(index)}
                    disabled={isSubmitted || isLocked}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
            <div className="deductions-total">
              <strong>Итого технические:</strong> {totalTechnicalDeductions.toFixed(3)}
            </div>
          </div>

          {/* Line Faults */}
          <div className="line-faults">
            <h4>Заступы за линию:</h4>
            <div className="line-faults-info">
              <span>Количество: {lineFaults}</span>
              <span>Штраф: {linePenalty.toFixed(3)}</span>
            </div>
            <p className="line-faults-note">
              (Обновляется автоматически судьёй на линии)
            </p>
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

      {/* Other E Judges Status */}
      <section className="other-judges">
        <h4>Другие судьи E-бригады:</h4>
        <div className="judges-list">
          {otherEJudges.map((judge) => (
            <div key={judge.role} className={`judge-status ${judge.status}`}>
              <span className="judge-role">{judge.role}</span>
              <span className="judge-status-badge">
                {judge.status === 'submitted' ? '✓' : '○'}
              </span>
              {judge.finalE !== undefined && (
                <span className="judge-score">{judge.finalE.toFixed(3)}</span>
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

export default EPanel;
