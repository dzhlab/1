// apps/web/src/components/Groups/AthletesTable.tsx

'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';

interface Athlete {
  id: string;
  orderNumber: number;
  fullName: string;
  birthDate: string;
  city: string;
  club: string;
  coach: string;
  rank: string;
  streamId?: string;
  streamTime?: string;
  subgroup?: string;
  apparatusNumber?: number;
}

interface AthletesTableProps {
  groupId: string;
  athletes: Athlete[];
}

// Sortable row component
const SortableRow: React.FC<{
  athlete: Athlete;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}> = ({ athlete, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: athlete.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU');
  };

  const translateRank = (rank: string): string => {
    const translations: Record<string, string> = {
      YOUTH_3: '3 юн',
      YOUTH_2: '2 юн',
      YOUTH_1: '1 юн',
      RANK_3: '3 разряд',
      RANK_2: '2 разряд',
      RANK_1: '1 разряд',
      KMS: 'КМС',
      MS: 'МС',
      MSMK: 'МСМК',
    };
    return translations[rank] || rank;
  };

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'dragging' : ''}>
      <td>
        <button
          type="button"
          className="drag-handle"
          {...attributes}
          {...listeners}
          aria-label="Перетащить"
        >
          ⋮⋮
        </button>
      </td>
      <td className="text-center">{athlete.orderNumber}</td>
      <td>{athlete.fullName}</td>
      <td className="text-center">{formatDate(athlete.birthDate)}</td>
      <td>{athlete.city}</td>
      <td>{athlete.club}</td>
      <td>{athlete.coach}</td>
      <td className="text-center">{translateRank(athlete.rank)}</td>
      <td className="text-center">{athlete.subgroup || '-'}</td>
      <td className="text-center">{athlete.streamTime || '-'}</td>
      <td className="text-center">{athlete.apparatusNumber || '-'}</td>
      <td>
        <div className="action-buttons">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="btn-icon"
            title="Переместить вверх"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="btn-icon"
            title="Переместить вниз"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="btn-icon btn-edit"
            title="Редактировать"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn-icon btn-delete"
            title="Удалить"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
};

export const AthletesTable: React.FC<AthletesTableProps> = ({ groupId, athletes: initialAthletes }) => {
  const [athletes, setAthletes] = useState(initialAthletes);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update local state when initialAthletes change
  React.useEffect(() => {
    setAthletes(initialAthletes);
  }, [initialAthletes]);

  // Mutations
  const bulkReorderMutation = useMutation({
    mutationFn: (order: string[]) =>
      api.post(`/api/groups/${groupId}/athletes/reorder/bulk`, { order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ athleteId, direction }: { athleteId: string; direction: 'up' | 'down' }) =>
      api.post(`/api/groups/${groupId}/athletes/${athleteId}/move`, { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (athleteId: string) =>
      api.delete(`/api/groups/${groupId}/athletes/${athleteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  // Handlers
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = athletes.findIndex((a) => a.id === active.id);
      const newIndex = athletes.findIndex((a) => a.id === over.id);

      const newOrder = arrayMove(athletes, oldIndex, newIndex);
      setAthletes(newOrder);

      // Send new order to server
      bulkReorderMutation.mutate(newOrder.map((a) => a.id));
    }
  };

  const handleMoveUp = (athleteId: string) => {
    moveMutation.mutate({ athleteId, direction: 'up' });
  };

  const handleMoveDown = (athleteId: string) => {
    moveMutation.mutate({ athleteId, direction: 'down' });
  };

  const handleDelete = (athleteId: string) => {
    if (confirm('Удалить участника?')) {
      deleteMutation.mutate(athleteId);
    }
  };

  const handleEdit = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setShowEditModal(true);
  };

  if (athletes.length === 0) {
    return (
      <div className="empty-state">
        <p>Нет участников</p>
        <p className="text-muted">Добавьте участников или загрузите их из Excel</p>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="table-container">
          <table className="athletes-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '60px' }}>№</th>
                <th style={{ width: '200px' }}>ФИО спортсмена</th>
                <th style={{ width: '120px' }}>Дата рождения</th>
                <th style={{ width: '150px' }}>Город</th>
                <th style={{ width: '200px' }}>Клуб</th>
                <th style={{ width: '200px' }}>Тренер</th>
                <th style={{ width: '100px' }}>Разряд</th>
                <th style={{ width: '100px' }}>Подгруппа</th>
                <th style={{ width: '100px' }}>Время потока</th>
                <th style={{ width: '120px' }}>Вид программы</th>
                <th style={{ width: '180px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={athletes.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {athletes.map((athlete, index) => (
                  <SortableRow
                    key={athlete.id}
                    athlete={athlete}
                    onEdit={() => handleEdit(athlete)}
                    onDelete={() => handleDelete(athlete.id)}
                    onMoveUp={() => handleMoveUp(athlete.id)}
                    onMoveDown={() => handleMoveDown(athlete.id)}
                    isFirst={index === 0}
                    isLast={index === athletes.length - 1}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>

      {/* Edit modal would go here */}
      {showEditModal && selectedAthlete && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Редактировать участника</h3>
            {/* Edit form would go here */}
            <button onClick={() => setShowEditModal(false)}>Закрыть</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .athletes-table {
          width: 100%;
          border-collapse: collapse;
        }

        .athletes-table thead {
          background: #007aff;
          color: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .athletes-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }

        .athletes-table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 14px;
        }

        .athletes-table tbody tr {
          transition: background-color 0.2s;
        }

        .athletes-table tbody tr:hover {
          background-color: #f5f5f5;
        }

        .athletes-table tbody tr.dragging {
          background-color: rgba(0, 122, 255, 0.1);
        }

        .drag-handle {
          cursor: grab;
          background: none;
          border: none;
          color: #888;
          font-size: 18px;
          padding: 4px;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .text-center {
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 4px;
          justify-content: center;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 16px;
          transition: background-color 0.2s;
        }

        .btn-icon:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .btn-icon:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .btn-edit {
          color: #007aff;
        }

        .btn-delete {
          color: #ff3b30;
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
          color: #888;
        }

        .empty-state p {
          margin: 8px 0;
        }

        .text-muted {
          font-size: 14px;
        }
      `}</style>
    </>
  );
};
