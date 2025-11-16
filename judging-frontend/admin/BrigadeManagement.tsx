// Brigade Management Component
// For Technical Specialist, Secretary, Chief Judge to manage judging brigades

import React, { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Brigade {
  id: string;
  name: string;
  number?: number;
  description?: string;
  competitionId?: string;
  specializationType?: string;
  isActive: boolean;
  judgesCount: number;
  createdAt: string;
  createdBy?: string;
}

interface Judge {
  id: string;
  name: string;
  role: string;
  panelType: string;
  email?: string;
  phone?: string;
}

interface BrigadeManagementProps {
  competitionId?: string;
  apiUrl: string;
  token: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BrigadeManagement: React.FC<BrigadeManagementProps> = ({
  competitionId,
  apiUrl,
  token,
}) => {
  // State
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [selectedBrigade, setSelectedBrigade] = useState<Brigade | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    description: '',
    specializationType: '',
  });

  // ============================================================================
  // FETCH BRIGADES
  // ============================================================================

  const fetchBrigades = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const url = competitionId
        ? `${apiUrl}/brigades?competitionId=${competitionId}`
        : `${apiUrl}/brigades`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brigades');
      }

      const data = await response.json();
      setBrigades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrigades();
  }, [competitionId]);

  // ============================================================================
  // CREATE BRIGADE
  // ============================================================================

  const handleCreateBrigade = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError(null);

      const response = await fetch(`${apiUrl}/brigades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          number: formData.number ? parseInt(formData.number) : undefined,
          competitionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create brigade');
      }

      const newBrigade = await response.json();

      setBrigades((prev) => [...prev, newBrigade]);
      setIsCreating(false);
      setFormData({
        name: '',
        number: '',
        description: '',
        specializationType: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ============================================================================
  // UPDATE BRIGADE
  // ============================================================================

  const handleUpdateBrigade = async (brigadeId: string, updates: Partial<Brigade>) => {
    try {
      setError(null);

      const response = await fetch(`${apiUrl}/brigades/${brigadeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update brigade');
      }

      const updatedBrigade = await response.json();

      setBrigades((prev) =>
        prev.map((b) => (b.id === brigadeId ? updatedBrigade : b))
      );

      if (selectedBrigade?.id === brigadeId) {
        setSelectedBrigade(updatedBrigade);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ============================================================================
  // DELETE BRIGADE
  // ============================================================================

  const handleDeleteBrigade = async (brigadeId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту бригаду?')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`${apiUrl}/brigades/${brigadeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete brigade');
      }

      setBrigades((prev) => prev.filter((b) => b.id !== brigadeId));

      if (selectedBrigade?.id === brigadeId) {
        setSelectedBrigade(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ============================================================================
  // TOGGLE ACTIVE STATUS
  // ============================================================================

  const handleToggleActive = async (brigadeId: string, isActive: boolean) => {
    await handleUpdateBrigade(brigadeId, { isActive: !isActive });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="brigade-management loading">
        <div className="spinner"></div>
        <p>Загрузка бригад...</p>
      </div>
    );
  }

  return (
    <div className="brigade-management">
      {/* Header */}
      <header className="management-header">
        <h1>👥 Управление судейскими бригадами</h1>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreating(true)}
        >
          + Создать бригаду
        </button>
      </header>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Create Brigade Modal */}
      {isCreating && (
        <div className="modal-overlay">
          <div className="modal create-brigade-modal">
            <header className="modal-header">
              <h2>Создать новую бригаду</h2>
              <button
                className="close-btn"
                onClick={() => setIsCreating(false)}
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleCreateBrigade}>
              <div className="form-group">
                <label htmlFor="name">Название бригады *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Например: Бригада #1, D-Panel группа A"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="number">Номер бригады</label>
                <input
                  type="number"
                  id="number"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: e.target.value })
                  }
                  placeholder="1, 2, 3..."
                  min="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Описание</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Дополнительная информация о бригаде..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="specializationType">Специализация</label>
                <select
                  id="specializationType"
                  value={formData.specializationType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specializationType: e.target.value,
                    })
                  }
                >
                  <option value="">Не указана</option>
                  <option value="D_PANEL">D-Panel (Трудность)</option>
                  <option value="E_PANEL">E-Panel (Исполнение)</option>
                  <option value="A_PANEL">A-Panel (Артистизм)</option>
                  <option value="TECHNICAL">Технические судьи</option>
                  <option value="MIXED">Смешанная</option>
                </select>
              </div>

              <footer className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Создать бригаду
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Brigades List */}
      <section className="brigades-list">
        <h2>Список бригад</h2>

        {brigades.length === 0 ? (
          <div className="empty-state">
            <p>Бригады ещё не созданы</p>
            <button
              className="btn btn-primary"
              onClick={() => setIsCreating(true)}
            >
              Создать первую бригаду
            </button>
          </div>
        ) : (
          <div className="brigades-grid">
            {brigades.map((brigade) => (
              <div
                key={brigade.id}
                className={`brigade-card ${brigade.isActive ? 'active' : 'inactive'} ${
                  selectedBrigade?.id === brigade.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedBrigade(brigade)}
              >
                <div className="brigade-header">
                  <div className="brigade-title">
                    <h3>{brigade.name}</h3>
                    {brigade.number && (
                      <span className="brigade-number">#{brigade.number}</span>
                    )}
                  </div>
                  <div className="brigade-status">
                    {brigade.isActive ? (
                      <span className="status-badge active">Активна</span>
                    ) : (
                      <span className="status-badge inactive">Неактивна</span>
                    )}
                  </div>
                </div>

                {brigade.specializationType && (
                  <div className="brigade-specialization">
                    {brigade.specializationType === 'D_PANEL' && '📊 D-Panel'}
                    {brigade.specializationType === 'E_PANEL' && '🎯 E-Panel'}
                    {brigade.specializationType === 'A_PANEL' && '🎨 A-Panel'}
                    {brigade.specializationType === 'TECHNICAL' && '⚙️ Technical'}
                    {brigade.specializationType === 'MIXED' && '🔀 Mixed'}
                  </div>
                )}

                {brigade.description && (
                  <p className="brigade-description">{brigade.description}</p>
                )}

                <div className="brigade-stats">
                  <span className="judges-count">
                    👤 {brigade.judgesCount} судей
                  </span>
                  <span className="created-date">
                    Создана: {new Date(brigade.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="brigade-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBrigade(brigade);
                    }}
                    title="Просмотр и редактирование"
                  >
                    ✏️
                  </button>

                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(brigade.id, brigade.isActive);
                    }}
                    title={brigade.isActive ? 'Деактивировать' : 'Активировать'}
                  >
                    {brigade.isActive ? '🔒' : '🔓'}
                  </button>

                  <button
                    className="btn-icon danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBrigade(brigade.id);
                    }}
                    title="Удалить бригаду"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Selected Brigade Details */}
      {selectedBrigade && (
        <section className="brigade-details">
          <header className="details-header">
            <h2>Детали бригады: {selectedBrigade.name}</h2>
            <button onClick={() => setSelectedBrigade(null)}>✕</button>
          </header>

          <div className="details-content">
            <div className="detail-item">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{selectedBrigade.id}</span>
            </div>

            {selectedBrigade.number && (
              <div className="detail-item">
                <span className="detail-label">Номер:</span>
                <span className="detail-value">#{selectedBrigade.number}</span>
              </div>
            )}

            {selectedBrigade.specializationType && (
              <div className="detail-item">
                <span className="detail-label">Специализация:</span>
                <span className="detail-value">
                  {selectedBrigade.specializationType}
                </span>
              </div>
            )}

            <div className="detail-item">
              <span className="detail-label">Судей в бригаде:</span>
              <span className="detail-value">{selectedBrigade.judgesCount}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Создана:</span>
              <span className="detail-value">
                {new Date(selectedBrigade.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Link to Judge Assignment */}
            <div className="detail-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  // Navigate to judge assignment page
                  window.location.href = `/admin/brigades/${selectedBrigade.id}/judges`;
                }}
              >
                👥 Назначить судей
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default BrigadeManagement;
