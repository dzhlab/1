// apps/web/src/components/Groups/GroupForm.tsx

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Enums
const DisciplineType = {
  INDIVIDUAL: 'Индивидуальные',
  GROUP: 'Групповые',
  GENERAL_FITNESS: 'ОФП',
};

const AgeCategoryType = {
  AGE_5_YOUNGER: '5 лет и младше',
  AGE_6_7: '6-7 лет',
  AGE_8_9: '8-9 лет',
  AGE_10_11: '10-11 лет',
  AGE_12_13: '12-13 лет',
  AGE_14: '14 лет',
  AGE_15_OLDER: '15 лет и старше',
  MIXED: 'Смешанная',
};

const ProgramType = {
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

const PerformanceType = {
  INDIVIDUAL: 'Индивидуальные',
  TEAM_5_PLUS: 'Команда 5+',
  DUOS: 'Двойки',
  TRIOS: 'Тройки',
};

const ApparatusType = {
  FREEHAND: 'Без предмета',
  ROPE: 'Скакалка',
  HOOP: 'Обруч',
  BALL: 'Мяч',
  CLUBS: 'Булавы',
  RIBBON: 'Лента',
};

// Validation schema
const groupSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  discipline: z.enum(['INDIVIDUAL', 'GROUP', 'GENERAL_FITNESS']),
  ageCategory: z.enum([
    'AGE_5_YOUNGER',
    'AGE_6_7',
    'AGE_8_9',
    'AGE_10_11',
    'AGE_12_13',
    'AGE_14',
    'AGE_15_OLDER',
    'MIXED',
  ]),
  yearFrom: z.number().min(2000).max(2030).optional(),
  yearTo: z.number().min(2000).max(2030).optional(),
  program: z.enum(['YOUTH_3', 'YOUTH_2', 'YOUTH_1', 'RANK_3', 'RANK_2', 'RANK_1', 'KMS', 'MS', 'MSMK']),
  performanceType: z.enum(['INDIVIDUAL', 'TEAM_5_PLUS', 'DUOS', 'TRIOS']),
  apparatus: z.array(z.enum(['FREEHAND', 'ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON'])).min(1),
  apparatusOrder: z.array(z.enum(['FREEHAND', 'ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON'])).optional(),
  performanceDuration: z.number().min(30).max(300).default(90),
  athletesPerStream: z.number().min(1).max(20).default(6),
  minAthletesPerStream: z.number().min(1).max(10).default(3),
  streamStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Формат времени: ЧЧ:ММ').default('10:00'),
  subgroups: z.array(z.string()).default(['A', 'B', 'C']),
});

type GroupFormData = z.infer<typeof groupSchema>;

interface GroupFormProps {
  groupId?: string;
  initialData?: Partial<GroupFormData>;
  onSuccess?: (group: any) => void;
  onCancel?: () => void;
}

export const GroupForm: React.FC<GroupFormProps> = ({
  groupId,
  initialData,
  onSuccess,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: initialData || {
      performanceDuration: 90,
      athletesPerStream: 6,
      minAthletesPerStream: 3,
      streamStartTime: '10:00',
      subgroups: ['A', 'B', 'C'],
      apparatus: [],
    },
  });

  const selectedApparatus = watch('apparatus') || [];

  const createGroupMutation = useMutation({
    mutationFn: (data: GroupFormData) => api.post('/api/groups', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onSuccess?.(response.data);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: (data: GroupFormData) => api.put(`/api/groups/${groupId}`, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      onSuccess?.(response.data);
    },
  });

  const onSubmit = (data: GroupFormData) => {
    if (groupId) {
      updateGroupMutation.mutate(data);
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const toggleApparatus = (apparatus: string) => {
    const current = selectedApparatus;
    const index = current.indexOf(apparatus as any);

    if (index >= 0) {
      setValue('apparatus', current.filter((a) => a !== apparatus));
    } else {
      setValue('apparatus', [...current, apparatus as any]);
    }
  };

  const steps = [
    { title: 'Основные настройки', fields: ['name', 'discipline', 'ageCategory', 'yearFrom', 'yearTo'] },
    { title: 'Программа и тип', fields: ['program', 'performanceType'] },
    { title: 'Виды программ', fields: ['apparatus', 'apparatusOrder', 'performanceDuration'] },
    { title: 'Настройки потоков', fields: ['athletesPerStream', 'minAthletesPerStream', 'streamStartTime', 'subgroups'] },
  ];

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="group-form">
      {/* Progress bar */}
      <div className="progress-bar">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`progress-step ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            onClick={() => setCurrentStep(index)}
          >
            <div className="progress-step-number">{index + 1}</div>
            <div className="progress-step-title">{step.title}</div>
          </div>
        ))}
      </div>

      {/* Step 1: Основные настройки */}
      {currentStep === 0 && (
        <div className="form-step">
          <div className="form-group">
            <label>Название группы *</label>
            <input
              type="text"
              {...register('name')}
              placeholder="Например: Группа A, 8-9 лет, КМС"
            />
            {errors.name && <span className="error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label>Дисциплина *</label>
            <select {...register('discipline')}>
              {Object.entries(DisciplineType).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
            {errors.discipline && <span className="error">{errors.discipline.message}</span>}
          </div>

          <div className="form-group">
            <label>Возрастная категория *</label>
            <select {...register('ageCategory')}>
              {Object.entries(AgeCategoryType).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
            {errors.ageCategory && <span className="error">{errors.ageCategory.message}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Год рождения (с)</label>
              <input
                type="number"
                {...register('yearFrom', { valueAsNumber: true })}
                placeholder="2015"
              />
              {errors.yearFrom && <span className="error">{errors.yearFrom.message}</span>}
            </div>

            <div className="form-group">
              <label>Год рождения (по)</label>
              <input
                type="number"
                {...register('yearTo', { valueAsNumber: true })}
                placeholder="2017"
              />
              {errors.yearTo && <span className="error">{errors.yearTo.message}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Программа и тип */}
      {currentStep === 1 && (
        <div className="form-step">
          <div className="form-group">
            <label>Программа *</label>
            <select {...register('program')}>
              {Object.entries(ProgramType).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
            {errors.program && <span className="error">{errors.program.message}</span>}
          </div>

          <div className="form-group">
            <label>Тип выступления *</label>
            <select {...register('performanceType')}>
              {Object.entries(PerformanceType).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
            {errors.performanceType && <span className="error">{errors.performanceType.message}</span>}
          </div>
        </div>
      )}

      {/* Step 3: Виды программ */}
      {currentStep === 2 && (
        <div className="form-step">
          <div className="form-group">
            <label>Виды программ * (выберите минимум один)</label>
            <div className="apparatus-grid">
              {Object.entries(ApparatusType).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className={`apparatus-button ${selectedApparatus.includes(key as any) ? 'selected' : ''}`}
                  onClick={() => toggleApparatus(key)}
                >
                  {value}
                </button>
              ))}
            </div>
            {errors.apparatus && <span className="error">{errors.apparatus.message}</span>}
          </div>

          <div className="form-group">
            <label>Длительность выступления (секунды) *</label>
            <input
              type="number"
              {...register('performanceDuration', { valueAsNumber: true })}
              min="30"
              max="300"
              placeholder="90"
            />
            {errors.performanceDuration && <span className="error">{errors.performanceDuration.message}</span>}
          </div>
        </div>
      )}

      {/* Step 4: Настройки потоков */}
      {currentStep === 3 && (
        <div className="form-step">
          <div className="form-row">
            <div className="form-group">
              <label>Выступающих в потоке *</label>
              <input
                type="number"
                {...register('athletesPerStream', { valueAsNumber: true })}
                min="1"
                max="20"
                placeholder="6"
              />
              {errors.athletesPerStream && <span className="error">{errors.athletesPerStream.message}</span>}
            </div>

            <div className="form-group">
              <label>Минимум в потоке *</label>
              <input
                type="number"
                {...register('minAthletesPerStream', { valueAsNumber: true })}
                min="1"
                max="10"
                placeholder="3"
              />
              {errors.minAthletesPerStream && <span className="error">{errors.minAthletesPerStream.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Время начала *</label>
            <input
              type="text"
              {...register('streamStartTime')}
              placeholder="10:00"
              pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
            />
            {errors.streamStartTime && <span className="error">{errors.streamStartTime.message}</span>}
          </div>

          <div className="form-group">
            <label>Подгруппы (через запятую)</label>
            <input
              type="text"
              defaultValue="A, B, C"
              onChange={(e) => {
                const subgroups = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                setValue('subgroups', subgroups);
              }}
              placeholder="A, B, C"
            />
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Отмена
          </button>
        )}

        {!isFirstStep && (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep - 1)}
            className="btn-secondary"
          >
            Назад
          </button>
        )}

        {!isLastStep && (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep + 1)}
            className="btn-primary"
          >
            Далее
          </button>
        )}

        {isLastStep && (
          <button
            type="submit"
            className="btn-primary"
            disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
          >
            {createGroupMutation.isPending || updateGroupMutation.isPending
              ? 'Сохранение...'
              : groupId
              ? 'Обновить группу'
              : 'Создать группу'}
          </button>
        )}
      </div>
    </form>
  );
};
