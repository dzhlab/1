// apps/web/src/components/Competitions/JudgeManagement.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

interface Judge {
  id: string;
  fullName: string;
  city: string;
  region: string;
  category: string;
  title?: string;
}

interface CompetitionJudge {
  id: string;
  judgeId: string;
  brigade: string | null;
  position: number;
  judge: Judge;
}

interface JudgeManagementProps {
  competitionId: string;
}

export function JudgeManagement({ competitionId }: JudgeManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJudges, setSelectedJudges] = useState<CompetitionJudge[]>([]);
  const queryClient = useQueryClient();
  const socket = useSocket();

  // Fetch competition judges
  const { data: judges, isLoading } = useQuery({
    queryKey: ['competition-judges', competitionId],
    queryFn: () => api.get(`/competitions/${competitionId}/judges`).then((res) => res.data),
  });

  useEffect(() => {
    if (judges) {
      setSelectedJudges(judges);
    }
  }, [judges]);

  // WebSocket events
  useEffect(() => {
    if (!socket) return;

    socket.on('judge:added', (data) => {
      if (data.competitionId === competitionId) {
        queryClient.invalidateQueries({ queryKey: ['competition-judges', competitionId] });
      }
    });

    socket.on('judges:reordered', (data) => {
      if (data.competitionId === competitionId) {
        queryClient.invalidateQueries({ queryKey: ['competition-judges', competitionId] });
      }
    });

    socket.on('brigades:formed', (data) => {
      if (data.competitionId === competitionId) {
        queryClient.invalidateQueries({ queryKey: ['competition-judges', competitionId] });
      }
    });

    return () => {
      socket.off('judge:added');
      socket.off('judges:reordered');
      socket.off('brigades:formed');
    };
  }, [socket, competitionId, queryClient]);

  // Mutations
  const addJudgeMutation = useMutation({
    mutationFn: (data: { judgeId: string; brigade?: string }) =>
      api.post(`/competitions/${competitionId}/judges`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-judges', competitionId] });
      setShowAddModal(false);
    },
  });

  const removeJudgeMutation = useMutation({
    mutationFn: (judgeId: string) =>
      api.delete(`/competitions/${competitionId}/judges/${judgeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-judges', competitionId] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orders: { judgeId: string; position: number }[]) =>
      api.post(`/competitions/${competitionId}/judges/reorder`, { orders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-judges', competitionId] });
    },
  });

  const formBrigadesMutation = useMutation({
    mutationFn: () => api.post(`/competitions/${competitionId}/judges/brigades`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-judges', competitionId] });
    },
  });

  const importExcelMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/competitions/${competitionId}/judges/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-judges', competitionId] });
    },
  });

  // Drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = selectedJudges.findIndex((j) => j.id === active.id);
      const newIndex = selectedJudges.findIndex((j) => j.id === over.id);

      const newJudges = arrayMove(selectedJudges, oldIndex, newIndex);
      setSelectedJudges(newJudges);

      // Update positions
      const orders = newJudges.map((judge, index) => ({
        judgeId: judge.judgeId,
        position: index,
      }));

      reorderMutation.mutate(orders);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get(`/competitions/${competitionId}/judges/export`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `judges_${competitionId}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importExcelMutation.mutate(file);
    }
  };

  if (isLoading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="judge-management">
      <div className="judge-management-header">
        <h3>Судейская бригада ({selectedJudges.length})</h3>
        <div className="judge-actions">
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            + Добавить судью
          </button>
          <button
            onClick={() => formBrigadesMutation.mutate()}
            className="btn btn-secondary"
            disabled={selectedJudges.length === 0}
          >
            Сформировать бригады
          </button>
          <label className="btn btn-secondary">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              style={{ display: 'none' }}
            />
            Импорт Excel
          </label>
          <button
            onClick={handleExportExcel}
            className="btn btn-secondary"
            disabled={selectedJudges.length === 0}
          >
            Экспорт Excel
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={selectedJudges.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          <div className="judges-list">
            {selectedJudges.map((judge) => (
              <SortableJudgeCard
                key={judge.id}
                judge={judge}
                onRemove={() => removeJudgeMutation.mutate(judge.judgeId)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {selectedJudges.length === 0 && (
        <div className="empty-state">
          <p>Судьи еще не добавлены</p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            Добавить первого судью
          </button>
        </div>
      )}

      {showAddModal && (
        <AddJudgeModal
          competitionId={competitionId}
          onClose={() => setShowAddModal(false)}
          onAdd={(judgeId, brigade) => addJudgeMutation.mutate({ judgeId, brigade })}
        />
      )}
    </div>
  );
}

// Sortable Judge Card Component
function SortableJudgeCard({ judge, onRemove }: { judge: CompetitionJudge; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: judge.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="judge-card" {...attributes} {...listeners}>
      <div className="judge-info">
        <div className="judge-name">{judge.judge.fullName}</div>
        <div className="judge-details">
          {judge.judge.city}, {judge.judge.region} • {translateCategory(judge.judge.category)}
          {judge.judge.title && ` • ${judge.judge.title}`}
        </div>
      </div>
      {judge.brigade && (
        <div className={`brigade-badge brigade-${judge.brigade.toLowerCase()}`}>
          Бригада {judge.brigade}
        </div>
      )}
      <button onClick={onRemove} className="btn-icon btn-danger" title="Удалить">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 4L12 12M4 12L12 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

// Add Judge Modal Component
function AddJudgeModal({
  competitionId,
  onClose,
  onAdd,
}: {
  competitionId: string;
  onClose: () => void;
  onAdd: (judgeId: string, brigade?: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedJudge, setSelectedJudge] = useState<string | null>(null);
  const [selectedBrigade, setSelectedBrigade] = useState<string>('');

  const { data: allJudges } = useQuery({
    queryKey: ['judges', search],
    queryFn: () => api.get('/judges', { params: { search } }).then((res) => res.data),
  });

  const handleAdd = () => {
    if (selectedJudge) {
      onAdd(selectedJudge, selectedBrigade || undefined);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Добавить судью</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <input
              type="text"
              placeholder="Поиск судьи..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="judges-list-modal">
            {allJudges?.map((judge: Judge) => (
              <div
                key={judge.id}
                className={`judge-item ${selectedJudge === judge.id ? 'selected' : ''}`}
                onClick={() => setSelectedJudge(judge.id)}
              >
                <div className="judge-name">{judge.fullName}</div>
                <div className="judge-details">
                  {judge.city}, {judge.region} • {translateCategory(judge.category)}
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label>Бригада (опционально)</label>
            <select value={selectedBrigade} onChange={(e) => setSelectedBrigade(e.target.value)}>
              <option value="">Не назначена</option>
              <option value="D">Бригада D</option>
              <option value="E">Бригада E</option>
              <option value="A">Бригада A</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Отмена
          </button>
          <button onClick={handleAdd} className="btn btn-primary" disabled={!selectedJudge}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

function translateCategory(category: string): string {
  const translations: Record<string, string> = {
    THIRD: '3 категория',
    SECOND: '2 категория',
    FIRST: '1 категория',
    ALL_RUSSIAN: 'Всероссийская',
    INTERNATIONAL: 'Международная',
  };
  return translations[category] || category;
}
