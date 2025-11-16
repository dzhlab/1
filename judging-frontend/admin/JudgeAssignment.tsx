// Judge Assignment Component
// Assign judges to a specific brigade

import React, { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Judge {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category?: string;
}

interface JudgeInBrigade {
  id: string;
  judgeId: string;
  judgeName: string;
  judgeRole: string;
  panelType: string;
  isPrimary: boolean;
  isActive: boolean;
  assignedAt: string;
}

interface Brigade {
  id: string;
  name: string;
  number?: number;
  specializationType?: string;
  judges: JudgeInBrigade[];
}

interface JudgeAssignmentProps {
  brigadeId: string;
  apiUrl: string;
  token: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const JudgeAssignment: React.FC<JudgeAssignmentProps> = ({
  brigadeId,
  apiUrl,
  token,
}) => {
  const [brigade, setBrigade] = useState<Brigade | null>(null);
  const [availableJudges, setAvailableJudges] = useState<Judge[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding judge
  const [assignmentForm, setAssignmentForm] = useState({
    judgeRole: 'D1',
    panelType: 'D_PANEL',
    isPrimary: true,
  });

  // Judge roles options
  const judgeRoles = [
    { value: 'D1', label: 'D1', panel: 'D_PANEL' },
    { value: 'D2', label: 'D2', panel: 'D_PANEL' },
    { value: 'D3', label: 'D3', panel: 'D_PANEL' },
    { value: 'D4', label: 'D4', panel: 'D_PANEL' },
    { value: 'E1', label: 'E1', panel: 'E_PANEL' },
    { value: 'E2', label: 'E2', panel: 'E_PANEL' },
    { value: 'E3', label: 'E3', panel: 'E_PANEL' },
    { value: 'E4', label: 'E4', panel: 'E_PANEL' },
    { value: 'A1', label: 'A1', panel: 'A_PANEL' },
    { value: 'A2', label: 'A2', panel: 'A_PANEL' },
    { value: 'LINE_JUDGE', label: 'Line Judge', panel: 'TECHNICAL' },
    { value: 'TIME_KEEPER', label: 'Time Keeper', panel: 'TECHNICAL' },
    { value: 'CHIEF_JUDGE', label: 'Chief Judge', panel: 'CONTROL' },
  ];

  // ============================================================================
  // FETCH DATA
  // ============================================================================

  const fetchBrigadeDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/brigades/${brigadeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brigade details');
      }

      const data = await response.json();
      setBrigade(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableJudges = async () => {
    try {
      const response = await fetch(`${apiUrl}/judges`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch judges');
      }

      const data = await response.json();
      setAvailableJudges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetchBrigadeDetails();
    fetchAvailableJudges();
  }, [brigadeId]);

  // ============================================================================
  // ASSIGN JUDGE
  // ============================================================================

  const handleAssignJudge = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJudge) {
      setError('Пожалуйста, выберите судью');
      return;
    }

    try {
      setError(null);

      const response = await fetch(`${apiUrl}/brigades/${brigadeId}/judges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          judgeId: selectedJudge.id,
          judgeName: selectedJudge.name,
          judgeRole: assignmentForm.judgeRole,
          panelType: assignmentForm.panelType,
          isPrimary: assignmentForm.isPrimary,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign judge');
      }

      const newAssignment = await response.json();

      setBrigade((prev) =>
        prev
          ? {
              ...prev,
              judges: [...prev.judges, newAssignment],
            }
          : null
      );

      setIsAdding(false);
      setSelectedJudge(null);
      setAssignmentForm({
        judgeRole: 'D1',
        panelType: 'D_PANEL',
        isPrimary: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ============================================================================
  // REMOVE JUDGE
  // ============================================================================

  const handleRemoveJudge = async (assignmentId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого судью из бригады?')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(
        `${apiUrl}/brigades/${brigadeId}/judges/${assignmentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove judge');
      }

      setBrigade((prev) =>
        prev
          ? {
              ...prev,
              judges: prev.judges.filter((j) => j.id !== assignmentId),
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ============================================================================
  // UPDATE ASSIGNMENT
  // ============================================================================

  const handleTogglePrimary = async (assignmentId: string, isPrimary: boolean) => {
    try {
      setError(null);

      const response = await fetch(
        `${apiUrl}/brigades/${brigadeId}/judges/${assignmentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isPrimary: !isPrimary }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }

      const updatedAssignment = await response.json();

      setBrigade((prev) =>
        prev
          ? {
              ...prev,
              judges: prev.judges.map((j) =>
                j.id === assignmentId ? updatedAssignment : j
              ),
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getAssignedJudgeIds = (): string[] => {
    return brigade?.judges.map((j) => j.judgeId) || [];
  };

  const getUnassignedJudges = (): Judge[] => {
    const assignedIds = getAssignedJudgeIds();
    return availableJudges.filter((judge) => !assignedIds.includes(judge.id));
  };

  const getJudgesByPanel = (panel: string) => {
    return brigade?.judges.filter((j) => j.panelType === panel) || [];
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="judge-assignment loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!brigade) {
    return (
      <div className="judge-assignment error">
        <p>Бригада не найдена</p>
      </div>
    );
  }

  return (
    <div className="judge-assignment">
      {/* Header */}
      <header className="assignment-header">
        <div className="header-content">
          <button
            className="back-btn"
            onClick={() => window.history.back()}
          >
            ← Назад
          </button>
          <div className="brigade-info">
            <h1>{brigade.name}</h1>
            {brigade.number && <span className="brigade-number">#{brigade.number}</span>}
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsAdding(true)}
        >
          + Добавить судью
        </button>
      </header>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Add Judge Modal */}
      {isAdding && (
        <div className="modal-overlay">
          <div className="modal add-judge-modal">
            <header className="modal-header">
              <h2>Добавить судью в бригаду</h2>
              <button className="close-btn" onClick={() => setIsAdding(false)}>
                ✕
              </button>
            </header>

            <form onSubmit={handleAssignJudge}>
              {/* Judge Selection */}
              <div className="form-group">
                <label>Выберите судью *</label>
                <div className="judges-list">
                  {getUnassignedJudges().length === 0 ? (
                    <p className="no-judges">Все судьи уже назначены</p>
                  ) : (
                    getUnassignedJudges().map((judge) => (
                      <div
                        key={judge.id}
                        className={`judge-item ${
                          selectedJudge?.id === judge.id ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedJudge(judge)}
                      >
                        <div className="judge-name">{judge.name}</div>
                        {judge.email && (
                          <div className="judge-email">{judge.email}</div>
                        )}
                        {judge.category && (
                          <div className="judge-category">{judge.category}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Role Selection */}
              <div className="form-group">
                <label htmlFor="judgeRole">Роль в бригаде *</label>
                <select
                  id="judgeRole"
                  value={assignmentForm.judgeRole}
                  onChange={(e) => {
                    const selectedRole = judgeRoles.find(
                      (r) => r.value === e.target.value
                    );
                    setAssignmentForm({
                      ...assignmentForm,
                      judgeRole: e.target.value,
                      panelType: selectedRole?.panel || 'D_PANEL',
                    });
                  }}
                  required
                >
                  {judgeRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Primary/Backup */}
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={assignmentForm.isPrimary}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        isPrimary: e.target.checked,
                      })
                    }
                  />
                  <span>Основной судья (не запасной)</span>
                </label>
              </div>

              <footer className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAdding(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedJudge}
                >
                  Назначить судью
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Judges by Panel */}
      <section className="judges-by-panel">
        {/* D-Panel */}
        <div className="panel-section">
          <h2>📊 D-Panel (Трудность)</h2>
          <div className="judges-grid">
            {getJudgesByPanel('D_PANEL').length === 0 ? (
              <p className="no-judges">Судьи не назначены</p>
            ) : (
              getJudgesByPanel('D_PANEL').map((judge) => (
                <div key={judge.id} className="judge-card">
                  <div className="judge-header">
                    <span className="judge-role">{judge.judgeRole}</span>
                    {judge.isPrimary ? (
                      <span className="badge primary">Основной</span>
                    ) : (
                      <span className="badge backup">Запасной</span>
                    )}
                  </div>
                  <div className="judge-name">{judge.judgeName}</div>
                  <div className="judge-assigned">
                    Назначен: {new Date(judge.assignedAt).toLocaleDateString()}
                  </div>
                  <div className="judge-actions">
                    <button
                      className="btn-sm"
                      onClick={() => handleTogglePrimary(judge.id, judge.isPrimary)}
                      title={
                        judge.isPrimary
                          ? 'Сделать запасным'
                          : 'Сделать основным'
                      }
                    >
                      {judge.isPrimary ? '🔽' : '🔼'}
                    </button>
                    <button
                      className="btn-sm danger"
                      onClick={() => handleRemoveJudge(judge.id)}
                      title="Удалить из бригады"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* E-Panel */}
        <div className="panel-section">
          <h2>🎯 E-Panel (Исполнение)</h2>
          <div className="judges-grid">
            {getJudgesByPanel('E_PANEL').length === 0 ? (
              <p className="no-judges">Судьи не назначены</p>
            ) : (
              getJudgesByPanel('E_PANEL').map((judge) => (
                <div key={judge.id} className="judge-card">
                  <div className="judge-header">
                    <span className="judge-role">{judge.judgeRole}</span>
                    {judge.isPrimary ? (
                      <span className="badge primary">Основной</span>
                    ) : (
                      <span className="badge backup">Запасной</span>
                    )}
                  </div>
                  <div className="judge-name">{judge.judgeName}</div>
                  <div className="judge-assigned">
                    Назначен: {new Date(judge.assignedAt).toLocaleDateString()}
                  </div>
                  <div className="judge-actions">
                    <button
                      className="btn-sm"
                      onClick={() => handleTogglePrimary(judge.id, judge.isPrimary)}
                    >
                      {judge.isPrimary ? '🔽' : '🔼'}
                    </button>
                    <button
                      className="btn-sm danger"
                      onClick={() => handleRemoveJudge(judge.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* A-Panel */}
        <div className="panel-section">
          <h2>🎨 A-Panel (Артистизм)</h2>
          <div className="judges-grid">
            {getJudgesByPanel('A_PANEL').length === 0 ? (
              <p className="no-judges">Судьи не назначены</p>
            ) : (
              getJudgesByPanel('A_PANEL').map((judge) => (
                <div key={judge.id} className="judge-card">
                  <div className="judge-header">
                    <span className="judge-role">{judge.judgeRole}</span>
                    {judge.isPrimary ? (
                      <span className="badge primary">Основной</span>
                    ) : (
                      <span className="badge backup">Запасной</span>
                    )}
                  </div>
                  <div className="judge-name">{judge.judgeName}</div>
                  <div className="judge-assigned">
                    Назначен: {new Date(judge.assignedAt).toLocaleDateString()}
                  </div>
                  <div className="judge-actions">
                    <button
                      className="btn-sm"
                      onClick={() => handleTogglePrimary(judge.id, judge.isPrimary)}
                    >
                      {judge.isPrimary ? '🔽' : '🔼'}
                    </button>
                    <button
                      className="btn-sm danger"
                      onClick={() => handleRemoveJudge(judge.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Technical Panel */}
        <div className="panel-section">
          <h2>⚙️ Technical Panel</h2>
          <div className="judges-grid">
            {getJudgesByPanel('TECHNICAL').length === 0 ? (
              <p className="no-judges">Судьи не назначены</p>
            ) : (
              getJudgesByPanel('TECHNICAL').map((judge) => (
                <div key={judge.id} className="judge-card">
                  <div className="judge-header">
                    <span className="judge-role">{judge.judgeRole}</span>
                  </div>
                  <div className="judge-name">{judge.judgeName}</div>
                  <div className="judge-assigned">
                    Назначен: {new Date(judge.assignedAt).toLocaleDateString()}
                  </div>
                  <div className="judge-actions">
                    <button
                      className="btn-sm danger"
                      onClick={() => handleRemoveJudge(judge.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="assignment-summary">
          <h3>Итого судей в бригаде: {brigade.judges.length}</h3>
          <div className="summary-breakdown">
            <span>D-Panel: {getJudgesByPanel('D_PANEL').length}</span>
            <span>E-Panel: {getJudgesByPanel('E_PANEL').length}</span>
            <span>A-Panel: {getJudgesByPanel('A_PANEL').length}</span>
            <span>Technical: {getJudgesByPanel('TECHNICAL').length}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JudgeAssignment;
