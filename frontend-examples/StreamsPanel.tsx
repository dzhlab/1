// apps/web/src/components/Groups/StreamsPanel.tsx

'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Stream {
  id: string;
  orderNumber: number;
  subgroup: string;
  startTime: string;
  athletesCount: number;
  athletes: Array<{
    id: string;
    fullName: string;
    orderNumber: number;
    streamTime: string;
  }>;
}

interface StreamsPanelProps {
  groupId: string;
  streams: Stream[];
  performanceDuration: number;
}

export const StreamsPanel: React.FC<StreamsPanelProps> = ({
  groupId,
  streams: initialStreams,
  performanceDuration,
}) => {
  const [expandedStreams, setExpandedStreams] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Mutations
  const generateStreamsMutation = useMutation({
    mutationFn: () => api.post(`/api/groups/${groupId}/streams/generate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  const deleteStreamMutation = useMutation({
    mutationFn: (streamId: string) =>
      api.delete(`/api/groups/${groupId}/streams/${streamId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  const clearStreamsMutation = useMutation({
    mutationFn: () => api.delete(`/api/groups/${groupId}/streams`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  // Handlers
  const toggleStream = (streamId: string) => {
    const newExpanded = new Set(expandedStreams);
    if (newExpanded.has(streamId)) {
      newExpanded.delete(streamId);
    } else {
      newExpanded.add(streamId);
    }
    setExpandedStreams(newExpanded);
  };

  const handleGenerate = () => {
    if (confirm('Сгенерировать потоки? Существующие потоки будут удалены.')) {
      generateStreamsMutation.mutate();
    }
  };

  const handleDeleteStream = (streamId: string) => {
    if (confirm('Удалить поток?')) {
      deleteStreamMutation.mutate(streamId);
    }
  };

  const handleClearAll = () => {
    if (confirm('Удалить все потоки?')) {
      clearStreamsMutation.mutate();
    }
  };

  const calculateEndTime = (startTime: string, athletesCount: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startSeconds = hours * 3600 + minutes * 60;
    const endSeconds = startSeconds + (athletesCount * performanceDuration);

    const endHours = Math.floor(endSeconds / 3600);
    const endMinutes = Math.floor((endSeconds % 3600) / 60);

    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  if (initialStreams.length === 0) {
    return (
      <div className="streams-empty">
        <p>Потоки не созданы</p>
        <button
          onClick={handleGenerate}
          disabled={generateStreamsMutation.isPending}
          className="btn-primary"
        >
          {generateStreamsMutation.isPending ? 'Генерация...' : 'Сгенерировать потоки'}
        </button>
      </div>
    );
  }

  return (
    <div className="streams-panel">
      <div className="streams-header">
        <h3>Потоки ({initialStreams.length})</h3>
        <div className="streams-actions">
          <button
            onClick={handleGenerate}
            disabled={generateStreamsMutation.isPending}
            className="btn-secondary"
          >
            {generateStreamsMutation.isPending ? 'Генерация...' : 'Пересоздать потоки'}
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearStreamsMutation.isPending}
            className="btn-danger"
          >
            Удалить все
          </button>
        </div>
      </div>

      <div className="streams-list">
        {initialStreams.map((stream) => {
          const isExpanded = expandedStreams.has(stream.id);
          const endTime = calculateEndTime(stream.startTime, stream.athletesCount);

          return (
            <div key={stream.id} className="stream-card">
              <div
                className="stream-header"
                onClick={() => toggleStream(stream.id)}
              >
                <div className="stream-info">
                  <span className="stream-number">Поток {stream.orderNumber}</span>
                  <span className={`stream-badge subgroup-${stream.subgroup.toLowerCase()}`}>
                    {stream.subgroup}
                  </span>
                  <span className="stream-time">
                    {stream.startTime} - {endTime}
                  </span>
                  <span className="stream-count">
                    {stream.athletesCount} участников
                  </span>
                </div>
                <div className="stream-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStream(stream.id);
                    }}
                    className="btn-icon btn-delete"
                    title="Удалить поток"
                  >
                    ✕
                  </button>
                  <button className="btn-icon">
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="stream-athletes">
                  <table className="athletes-mini-table">
                    <thead>
                      <tr>
                        <th>№</th>
                        <th>ФИО</th>
                        <th>Время</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stream.athletes.map((athlete) => (
                        <tr key={athlete.id}>
                          <td>{athlete.orderNumber}</td>
                          <td>{athlete.fullName}</td>
                          <td>{athlete.streamTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .streams-panel {
          padding: 20px;
        }

        .streams-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .streams-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .streams-actions {
          display: flex;
          gap: 12px;
        }

        .streams-empty {
          padding: 60px 20px;
          text-align: center;
        }

        .streams-empty p {
          margin-bottom: 20px;
          color: #888;
        }

        .streams-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stream-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .stream-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .stream-header:hover {
          background-color: #f5f5f5;
        }

        .stream-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .stream-number {
          font-weight: 600;
          font-size: 16px;
        }

        .stream-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .subgroup-a {
          background: #e3f2fd;
          color: #1976d2;
        }

        .subgroup-b {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .subgroup-c {
          background: #e8f5e9;
          color: #388e3c;
        }

        .stream-time {
          color: #666;
          font-size: 14px;
        }

        .stream-count {
          color: #888;
          font-size: 14px;
        }

        .stream-actions {
          display: flex;
          gap: 8px;
        }

        .stream-athletes {
          padding: 0 16px 16px;
          background: #fafafa;
        }

        .athletes-mini-table {
          width: 100%;
          border-collapse: collapse;
        }

        .athletes-mini-table th {
          text-align: left;
          padding: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          border-bottom: 2px solid #e0e0e0;
        }

        .athletes-mini-table td {
          padding: 8px;
          font-size: 14px;
          border-bottom: 1px solid #e0e0e0;
        }

        .athletes-mini-table tbody tr:last-child td {
          border-bottom: none;
        }

        .btn-primary {
          background: #007aff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-primary:hover {
          background: #0051d5;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #333;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-danger {
          background: #ff3b30;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-danger:hover {
          background: #d32f2f;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 16px;
          color: #666;
          transition: color 0.2s;
        }

        .btn-icon:hover {
          color: #333;
        }

        .btn-delete {
          color: #ff3b30;
        }

        .btn-delete:hover {
          color: #d32f2f;
        }
      `}</style>
    </div>
  );
};
