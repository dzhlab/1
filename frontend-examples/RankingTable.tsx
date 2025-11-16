// apps/web/src/components/Results/RankingTable.tsx

'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

interface ParticipantResult {
  rank: number;
  participantId: string;
  participant: {
    id: string;
    fullName: string;
    club: string;
    city: string;
  };
  totalScore: number;
  avgD: number;
  avgE: number;
  avgA: number;
  scores: any[];
}

interface RankingTableProps {
  competitionId: string;
}

export function RankingTable({ competitionId }: RankingTableProps) {
  const queryClient = useQueryClient();
  const socket = useSocket();

  // Fetch results
  const { data: results, isLoading } = useQuery({
    queryKey: ['results', competitionId],
    queryFn: () => api.get(`/competitions/${competitionId}/results`).then((res) => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket) return;

    // Join competition room
    socket.emit('competition:join', { competitionId });

    // Listen for score updates
    socket.on('score:submitted', (data) => {
      if (data.competitionId === competitionId) {
        queryClient.invalidateQueries({ queryKey: ['results', competitionId] });
      }
    });

    // Listen for recalculation
    socket.on('results:recalculated', (data) => {
      if (data.competitionId === competitionId) {
        queryClient.setQueryData(['results', competitionId], data.results);
      }
    });

    return () => {
      socket.emit('competition:leave', { competitionId });
      socket.off('score:submitted');
      socket.off('results:recalculated');
    };
  }, [socket, competitionId, queryClient]);

  if (isLoading) {
    return <div className="loading">Загрузка результатов...</div>;
  }

  if (!results || results.length === 0) {
    return (
      <div className="empty-state">
        <p>Результаты пока не доступны</p>
      </div>
    );
  }

  return (
    <div className="ranking-container">
      <div className="ranking-header">
        <h2>Турнирная таблица</h2>
        <div className="live-indicator">
          <span className="pulse-dot"></span>
          <span>Live</span>
        </div>
      </div>

      {/* Podium for top 3 */}
      {results.length >= 3 && (
        <div className="podium">
          {/* 2nd place */}
          <div className="podium-place podium-second">
            <div className="podium-rank">2</div>
            <div className="podium-info">
              <div className="podium-name">{results[1].participant.fullName}</div>
              <div className="podium-club">{results[1].participant.club}</div>
              <div className="podium-score">{results[1].totalScore.toFixed(3)}</div>
            </div>
            <div className="podium-stand">
              <div className="stand-height stand-silver"></div>
            </div>
          </div>

          {/* 1st place */}
          <div className="podium-place podium-first">
            <div className="podium-rank">1</div>
            <div className="podium-info">
              <div className="podium-name">{results[0].participant.fullName}</div>
              <div className="podium-club">{results[0].participant.club}</div>
              <div className="podium-score">{results[0].totalScore.toFixed(3)}</div>
            </div>
            <div className="podium-stand">
              <div className="stand-height stand-gold"></div>
            </div>
          </div>

          {/* 3rd place */}
          <div className="podium-place podium-third">
            <div className="podium-rank">3</div>
            <div className="podium-info">
              <div className="podium-name">{results[2].participant.fullName}</div>
              <div className="podium-club">{results[2].participant.club}</div>
              <div className="podium-score">{results[2].totalScore.toFixed(3)}</div>
            </div>
            <div className="podium-stand">
              <div className="stand-height stand-bronze"></div>
            </div>
          </div>
        </div>
      )}

      {/* Full results table */}
      <div className="table-container">
        <table className="ranking-table">
          <thead>
            <tr>
              <th className="col-rank">Место</th>
              <th className="col-name">Спортсмен</th>
              <th className="col-club">Клуб</th>
              <th className="col-city">Город</th>
              <th className="col-score">D</th>
              <th className="col-score">E</th>
              <th className="col-score">A</th>
              <th className="col-total">Итого</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result: ParticipantResult, index: number) => (
              <tr
                key={result.participantId}
                className={`
                  ${result.rank === 1 ? 'rank-gold' : ''}
                  ${result.rank === 2 ? 'rank-silver' : ''}
                  ${result.rank === 3 ? 'rank-bronze' : ''}
                  ${index % 2 === 0 ? 'row-even' : 'row-odd'}
                `}
              >
                <td className="col-rank">
                  <div className="rank-badge">
                    {result.rank}
                    {result.rank === 1 && <span className="medal">🥇</span>}
                    {result.rank === 2 && <span className="medal">🥈</span>}
                    {result.rank === 3 && <span className="medal">🥉</span>}
                  </div>
                </td>
                <td className="col-name">
                  <div className="participant-name">{result.participant.fullName}</div>
                </td>
                <td className="col-club">{result.participant.club}</td>
                <td className="col-city">{result.participant.city}</td>
                <td className="col-score">
                  <span className="score-value">{result.avgD.toFixed(3)}</span>
                </td>
                <td className="col-score">
                  <span className="score-value">{result.avgE.toFixed(3)}</span>
                </td>
                <td className="col-score">
                  <span className="score-value">{result.avgA.toFixed(3)}</span>
                </td>
                <td className="col-total">
                  <span className="total-score">{result.totalScore.toFixed(3)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="ranking-legend">
        <div className="legend-item">
          <strong>D</strong> - Difficulty (Трудность)
        </div>
        <div className="legend-item">
          <strong>E</strong> - Execution (Исполнение)
        </div>
        <div className="legend-item">
          <strong>A</strong> - Artistry (Артистизм)
        </div>
      </div>
    </div>
  );
}

// Additional CSS needed (add to styles.css)
const styles = `
.ranking-container {
  padding: 24px;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ios-green);
  font-weight: 600;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--ios-green);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 48px;
  padding: 32px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 20px;
}

.podium-place {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.podium-first { order: 2; }
.podium-second { order: 1; }
.podium-third { order: 3; }

.podium-rank {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.podium-first .podium-rank {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.podium-second .podium-rank {
  background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
  box-shadow: 0 4px 12px rgba(192, 192, 192, 0.4);
}

.podium-third .podium-rank {
  background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%);
  box-shadow: 0 4px 12px rgba(205, 127, 50, 0.4);
}

.podium-info {
  text-align: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  min-width: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.podium-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.podium-club {
  font-size: 14px;
  color: var(--ios-gray-1);
  margin-bottom: 8px;
}

.podium-score {
  font-size: 28px;
  font-weight: 700;
  color: var(--ios-blue);
}

.stand-height {
  width: 120px;
  border-radius: 8px 8px 0 0;
}

.stand-gold {
  height: 140px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
}

.stand-silver {
  height: 100px;
  background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
}

.stand-bronze {
  height: 80px;
  background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%);
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
}

.ranking-table thead {
  background: var(--ios-gray-6);
  position: sticky;
  top: 0;
  z-index: 10;
}

.ranking-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: var(--ios-gray-1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ranking-table td {
  padding: 16px;
  border-bottom: 1px solid var(--ios-gray-5);
}

.row-even {
  background: var(--ios-bg-primary);
}

.row-odd {
  background: var(--ios-gray-6);
}

.rank-gold {
  background: rgba(255, 215, 0, 0.1) !important;
}

.rank-silver {
  background: rgba(192, 192, 192, 0.1) !important;
}

.rank-bronze {
  background: rgba(205, 127, 50, 0.1) !important;
}

.rank-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
}

.medal {
  font-size: 20px;
}

.col-rank { width: 80px; }
.col-name { width: auto; }
.col-club { width: 200px; }
.col-city { width: 150px; }
.col-score { width: 80px; text-align: center; }
.col-total { width: 100px; text-align: center; }

.score-value {
  display: inline-block;
  padding: 4px 8px;
  background: var(--ios-gray-6);
  border-radius: 6px;
  font-weight: 500;
}

.total-score {
  display: inline-block;
  padding: 8px 12px;
  background: var(--ios-blue);
  color: white;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
}

.ranking-legend {
  display: flex;
  gap: 24px;
  margin-top: 24px;
  padding: 16px;
  background: var(--ios-gray-6);
  border-radius: 12px;
}

.legend-item {
  font-size: 14px;
  color: var(--ios-gray-1);
}
`;
