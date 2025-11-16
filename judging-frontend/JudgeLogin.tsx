// Simplified Judge Login Interface
// Judges select their name from a list to automatically enter their panel

import React, { useState, useEffect } from 'react';
import { JudgingPanelRouter } from './JudgingPanelRouter';

// ============================================================================
// TYPES
// ============================================================================

interface Judge {
  id: string;
  name: string;
  role: string;
  panelType: string;
  brigadeId: string;
  brigadeName: string;
  sessionId?: string;
}

interface Brigade {
  id: string;
  name: string;
  number?: number;
  judges: Judge[];
}

interface JudgeLoginProps {
  competitionId?: string;
  apiUrl: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const JudgeLogin: React.FC<JudgeLoginProps> = ({
  competitionId,
  apiUrl,
}) => {
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'brigades' | 'judges'>('judges');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FETCH BRIGADES AND JUDGES
  // ============================================================================

  const fetchBrigadesWithJudges = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const url = competitionId
        ? `${apiUrl}/brigades?competitionId=${competitionId}&includeJudges=true`
        : `${apiUrl}/brigades?includeJudges=true`;

      const response = await fetch(url);

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
    fetchBrigadesWithJudges();
  }, [competitionId]);

  // ============================================================================
  // JUDGE LOGIN
  // ============================================================================

  const handleJudgeLogin = async (judge: Judge) => {
    try {
      setError(null);

      // Request auth token for this judge
      const response = await fetch(`${apiUrl}/auth/judge-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          judgeId: judge.id,
          brigadeId: judge.brigadeId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to login');
      }

      const { token, sessionId } = await response.json();

      setAuthToken(token);
      setSelectedJudge({ ...judge, sessionId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  // ============================================================================
  // LOGOUT
  // ============================================================================

  const handleLogout = () => {
    setSelectedJudge(null);
    setAuthToken(null);
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getAllJudges = (): Judge[] => {
    return brigades.flatMap((brigade) =>
      brigade.judges.map((judge) => ({
        ...judge,
        brigadeId: brigade.id,
        brigadeName: brigade.name,
      }))
    );
  };

  const getFilteredJudges = (): Judge[] => {
    const allJudges = getAllJudges();

    if (!searchQuery) {
      return allJudges;
    }

    const query = searchQuery.toLowerCase();
    return allJudges.filter(
      (judge) =>
        judge.name.toLowerCase().includes(query) ||
        judge.brigadeName.toLowerCase().includes(query) ||
        judge.role.toLowerCase().includes(query)
    );
  };

  const getRoleIcon = (role: string): string => {
    if (role.startsWith('D')) return '📊';
    if (role.startsWith('E')) return '🎯';
    if (role.startsWith('A')) return '🎨';
    if (role === 'LINE_JUDGE') return '📏';
    if (role === 'TIME_KEEPER') return '⏱️';
    if (role === 'CHIEF_JUDGE') return '👨‍⚖️';
    return '👤';
  };

  const getRoleLabel = (role: string): string => {
    if (role === 'LINE_JUDGE') return 'Судья на линии';
    if (role === 'TIME_KEEPER') return 'Хронометрист';
    if (role === 'CHIEF_JUDGE') return 'Главный судья';
    return role;
  };

  // ============================================================================
  // RENDER - IF LOGGED IN
  // ============================================================================

  if (selectedJudge && authToken) {
    return (
      <div className="judge-logged-in">
        {/* Header with logout */}
        <header className="logged-in-header">
          <div className="judge-info">
            <span className="welcome">Добро пожаловать,</span>
            <span className="judge-name">{selectedJudge.name}</span>
            <span className="judge-role">
              {getRoleIcon(selectedJudge.role)} {getRoleLabel(selectedJudge.role)}
            </span>
            <span className="brigade-name">({selectedJudge.brigadeName})</span>
          </div>
          <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
            Выйти
          </button>
        </header>

        {/* Render appropriate judging panel */}
        <JudgingPanelRouter
          sessionId={selectedJudge.sessionId || 'default-session'}
          token={authToken}
        />
      </div>
    );
  }

  // ============================================================================
  // RENDER - LOGIN SCREEN
  // ============================================================================

  if (isLoading) {
    return (
      <div className="judge-login loading">
        <div className="spinner"></div>
        <p>Загрузка списка судей...</p>
      </div>
    );
  }

  return (
    <div className="judge-login">
      {/* Header */}
      <header className="login-header">
        <h1>👨‍⚖️ Вход для судей</h1>
        <p className="subtitle">Выберите свою фамилию из списка</p>
      </header>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="view-mode-toggle">
        <button
          className={`toggle-btn ${viewMode === 'judges' ? 'active' : ''}`}
          onClick={() => setViewMode('judges')}
        >
          📋 Список судей
        </button>
        <button
          className={`toggle-btn ${viewMode === 'brigades' ? 'active' : ''}`}
          onClick={() => setViewMode('brigades')}
        >
          👥 По бригадам
        </button>
      </div>

      {/* Search */}
      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по фамилии, бригаде или роли..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery('')}>
            ✕
          </button>
        )}
      </div>

      {/* Judges List View */}
      {viewMode === 'judges' && (
        <section className="judges-list-view">
          {getFilteredJudges().length === 0 ? (
            <div className="empty-state">
              <p>
                {searchQuery
                  ? 'Судьи не найдены'
                  : 'Судьи ещё не назначены в бригады'}
              </p>
            </div>
          ) : (
            <div className="judges-grid">
              {getFilteredJudges().map((judge) => (
                <div
                  key={judge.id}
                  className="judge-card clickable"
                  onClick={() => handleJudgeLogin(judge)}
                >
                  <div className="judge-icon">{getRoleIcon(judge.role)}</div>
                  <div className="judge-details">
                    <h3 className="judge-name">{judge.name}</h3>
                    <div className="judge-role">
                      {getRoleLabel(judge.role)}
                    </div>
                    <div className="judge-brigade">
                      Бригада: {judge.brigadeName}
                    </div>
                  </div>
                  <div className="login-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Brigades View */}
      {viewMode === 'brigades' && (
        <section className="brigades-view">
          {brigades.length === 0 ? (
            <div className="empty-state">
              <p>Бригады ещё не созданы</p>
            </div>
          ) : (
            brigades.map((brigade) => (
              <div key={brigade.id} className="brigade-section">
                <h2 className="brigade-title">
                  {brigade.name}
                  {brigade.number && (
                    <span className="brigade-number">#{brigade.number}</span>
                  )}
                </h2>

                {brigade.judges.length === 0 ? (
                  <p className="no-judges">Судьи не назначены</p>
                ) : (
                  <div className="brigade-judges-grid">
                    {brigade.judges
                      .filter((judge) => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          judge.name.toLowerCase().includes(query) ||
                          judge.role.toLowerCase().includes(query)
                        );
                      })
                      .map((judge) => (
                        <div
                          key={judge.id}
                          className="judge-card-small clickable"
                          onClick={() =>
                            handleJudgeLogin({
                              ...judge,
                              brigadeId: brigade.id,
                              brigadeName: brigade.name,
                            })
                          }
                        >
                          <div className="judge-icon-small">
                            {getRoleIcon(judge.role)}
                          </div>
                          <div className="judge-info-small">
                            <div className="judge-name-small">{judge.name}</div>
                            <div className="judge-role-small">
                              {getRoleLabel(judge.role)}
                            </div>
                          </div>
                          <div className="login-arrow-small">→</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* Instructions */}
      <footer className="login-instructions">
        <h3>Инструкция:</h3>
        <ol>
          <li>Найдите свою фамилию в списке</li>
          <li>Нажмите на свою карточку</li>
          <li>Вы автоматически попадёте в свой судейский интерфейс</li>
        </ol>
        <p className="help-text">
          Если вы не видите свою фамилию, обратитесь к техническому специалисту или
          секретарю
        </p>
      </footer>
    </div>
  );
};

export default JudgeLogin;
