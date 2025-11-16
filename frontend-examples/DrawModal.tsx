// apps/web/src/components/Groups/DrawModal.tsx

'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DrawModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
}

enum DrawStrategy {
  RANDOM = 'random',
  BY_APPARATUS = 'by_apparatus',
  BY_SUBGROUP = 'by_subgroup',
  BY_GROUP = 'by_group',
}

const strategyLabels = {
  [DrawStrategy.RANDOM]: {
    name: 'Случайная жеребьёвка',
    description: 'Полностью случайный порядок выступлений (Fisher-Yates алгоритм)',
    icon: '🎲',
  },
  [DrawStrategy.BY_APPARATUS]: {
    name: 'По видам программ',
    description: 'Чередование участников по видам программ для равномерного распределения',
    icon: '🎯',
  },
  [DrawStrategy.BY_SUBGROUP]: {
    name: 'По подгруппам',
    description: 'Распределение участников по подгруппам с последующей случайной жеребьёвкой',
    icon: '👥',
  },
  [DrawStrategy.BY_GROUP]: {
    name: 'По клубам',
    description: 'Группировка по клубам, затем случайный порядок внутри каждого клуба',
    icon: '🏛️',
  },
};

export const DrawModal: React.FC<DrawModalProps> = ({ groupId, isOpen, onClose }) => {
  const [selectedStrategy, setSelectedStrategy] = useState<DrawStrategy>(DrawStrategy.RANDOM);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const performDrawMutation = useMutation({
    mutationFn: (strategy: DrawStrategy) =>
      api.post(`/api/groups/${groupId}/draw`, { strategy }),
    onSuccess: (response) => {
      setDrawResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    },
  });

  const handleDraw = async () => {
    setIsDrawing(true);

    // Animation delay
    setTimeout(() => {
      performDrawMutation.mutate(selectedStrategy);
      setIsDrawing(false);
    }, 1500);
  };

  const handleClose = () => {
    setDrawResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content draw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Жеребьёвка</h2>
          <button className="close-button" onClick={handleClose}>
            ✕
          </button>
        </div>

        {!drawResult ? (
          <>
            <div className="modal-body">
              <p className="modal-description">
                Выберите стратегию жеребьёвки для определения порядка выступлений участников.
              </p>

              <div className="strategies-grid">
                {Object.entries(strategyLabels).map(([strategy, info]) => (
                  <button
                    key={strategy}
                    className={`strategy-card ${selectedStrategy === strategy ? 'selected' : ''}`}
                    onClick={() => setSelectedStrategy(strategy as DrawStrategy)}
                    disabled={isDrawing}
                  >
                    <div className="strategy-icon">{info.icon}</div>
                    <div className="strategy-name">{info.name}</div>
                    <div className="strategy-description">{info.description}</div>
                  </button>
                ))}
              </div>

              {isDrawing && (
                <div className="drawing-animation">
                  <div className="spinner"></div>
                  <p>Выполняется жеребьёвка...</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleClose}
                disabled={isDrawing}
              >
                Отмена
              </button>
              <button
                className="btn-primary"
                onClick={handleDraw}
                disabled={isDrawing || performDrawMutation.isPending}
              >
                {isDrawing ? 'Жеребьёвка...' : 'Выполнить жеребьёвку'}
              </button>
            </div>
          </>
        ) : (
          <div className="modal-body">
            <div className="draw-result">
              <div className="success-icon">✓</div>
              <h3>Жеребьёвка выполнена!</h3>
              <p>Порядок выступлений обновлен</p>
              <div className="result-stats">
                <div className="stat">
                  <span className="stat-value">{drawResult.athletes?.length || 0}</span>
                  <span className="stat-label">участников</span>
                </div>
                <div className="stat">
                  <span className="stat-value">
                    {strategyLabels[selectedStrategy as DrawStrategy].icon}
                  </span>
                  <span className="stat-label">
                    {strategyLabels[selectedStrategy as DrawStrategy].name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.2s;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideUp 0.3s;
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid #e0e0e0;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 4px 8px;
            transition: color 0.2s;
          }

          .close-button:hover {
            color: #333;
          }

          .modal-body {
            padding: 24px;
          }

          .modal-description {
            margin: 0 0 24px;
            color: #666;
            font-size: 15px;
            line-height: 1.5;
          }

          .strategies-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }

          .strategy-card {
            background: #f8f9fa;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
          }

          .strategy-card:hover {
            border-color: #007aff;
            background: #f0f7ff;
          }

          .strategy-card.selected {
            border-color: #007aff;
            background: #e3f2fd;
            box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
          }

          .strategy-card:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .strategy-icon {
            font-size: 48px;
            margin-bottom: 12px;
          }

          .strategy-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 8px;
          }

          .strategy-description {
            font-size: 13px;
            color: #666;
            line-height: 1.4;
          }

          .drawing-animation {
            text-align: center;
            padding: 40px 20px;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e0e0e0;
            border-top-color: #007aff;
            border-radius: 50%;
            margin: 0 auto 16px;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .drawing-animation p {
            color: #666;
            font-size: 16px;
          }

          .draw-result {
            text-align: center;
            padding: 40px 20px;
          }

          .success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #4caf50;
            color: white;
            font-size: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            animation: scaleIn 0.5s;
          }

          @keyframes scaleIn {
            from {
              transform: scale(0);
            }
            to {
              transform: scale(1);
            }
          }

          .draw-result h3 {
            margin: 0 0 8px;
            font-size: 24px;
            font-weight: 600;
          }

          .draw-result p {
            margin: 0 0 24px;
            color: #666;
          }

          .result-stats {
            display: flex;
            justify-content: center;
            gap: 48px;
          }

          .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .stat-value {
            font-size: 32px;
            font-weight: 600;
            color: #007aff;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 14px;
            color: #666;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 24px;
            border-top: 1px solid #e0e0e0;
          }

          .btn-primary {
            background: #007aff;
            color: white;
            border: none;
            padding: 12px 24px;
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
            padding: 12px 24px;
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
        `}</style>
      </div>
    </div>
  );
};
