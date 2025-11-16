// apps/web/src/components/Competitions/CompetitionCreator.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, Discipline, TiebreakRule, RankingSkip, DCalculation } from '@prisma/client';
import { api } from '@/lib/api';
import { JudgeManagement } from './JudgeManagement';
import { LogoUpload } from './LogoUpload';

const competitionSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  startDate: z.string().min(1, 'Дата начала обязательна'),
  endDate: z.string().min(1, 'Дата окончания обязательна'),
  days: z.number().min(1, 'Минимум 1 день'),
  city: z.string().min(1, 'Город обязателен').max(100),
  venue: z.string().min(1, 'Место проведения обязательно').max(200),
  organizer: z.string().min(1, 'Организатор обязателен').max(200),
  contactName: z.string().min(1, 'ФИО контактного лица обязательно').max(100),
  contactPhone: z.string().min(1, 'Телефон обязателен'),
  category: z.nativeEnum(Category),
  disciplines: z.array(z.nativeEnum(Discipline)).min(1, 'Выберите хотя бы одну дисциплину'),
  tiebreakRule: z.nativeEnum(TiebreakRule),
  rankingSkip: z.nativeEnum(RankingSkip),
  dCalculation: z.nativeEnum(DCalculation),
});

type CompetitionFormData = z.infer<typeof competitionSchema>;

interface CompetitionCreatorProps {
  onClose: () => void;
  onSuccess?: (competition: any) => void;
}

export function CompetitionCreator({ onClose, onSuccess }: CompetitionCreatorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompetitionFormData>({
    resolver: zodResolver(competitionSchema),
    defaultValues: {
      category: Category.JUNIOR,
      disciplines: [],
      tiebreakRule: TiebreakRule.SHARE,
      rankingSkip: RankingSkip.NO_SKIP,
      dCalculation: DCalculation.RUSSIAN,
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  // Автоматический расчет дней
  const calculateDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setValue('days', diffDays);
    }
  };

  // Мутация для создания соревнования
  const createCompetitionMutation = useMutation({
    mutationFn: (data: CompetitionFormData) => api.post('/competitions', data),
    onSuccess: (response) => {
      setCompetitionId(response.data.id);
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      if (currentStep === 4) {
        onSuccess?.(response.data);
        onClose();
      } else {
        setCurrentStep(currentStep + 1);
      }
    },
  });

  const onSubmit = (data: CompetitionFormData) => {
    createCompetitionMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="competition-creator-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Создание соревнования</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          {[
            { num: 1, label: 'Общая информация' },
            { num: 2, label: 'Судейская бригада' },
            { num: 3, label: 'Логотип' },
            { num: 4, label: 'Настройки' },
          ].map((step) => (
            <div
              key={step.num}
              className={`step ${currentStep === step.num ? 'active' : ''} ${
                currentStep > step.num ? 'completed' : ''
              }`}
            >
              <span className="step-number">{step.num}</span>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: General Information */}
          {currentStep === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label htmlFor="name">Название соревнования *</label>
                <input
                  type="text"
                  id="name"
                  {...register('name')}
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-message">{errors.name.message}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Дата начала *</label>
                  <input
                    type="date"
                    id="startDate"
                    {...register('startDate')}
                    onChange={(e) => {
                      setValue('startDate', e.target.value);
                      calculateDays();
                    }}
                    className={errors.startDate ? 'error' : ''}
                  />
                  {errors.startDate && (
                    <span className="error-message">{errors.startDate.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="endDate">Дата окончания *</label>
                  <input
                    type="date"
                    id="endDate"
                    {...register('endDate')}
                    onChange={(e) => {
                      setValue('endDate', e.target.value);
                      calculateDays();
                    }}
                    className={errors.endDate ? 'error' : ''}
                  />
                  {errors.endDate && (
                    <span className="error-message">{errors.endDate.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="days">Количество дней</label>
                  <input type="number" id="days" {...register('days', { valueAsNumber: true })} readOnly />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">Город *</label>
                  <input
                    type="text"
                    id="city"
                    {...register('city')}
                    className={errors.city ? 'error' : ''}
                  />
                  {errors.city && <span className="error-message">{errors.city.message}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="venue">Место проведения *</label>
                  <input
                    type="text"
                    id="venue"
                    {...register('venue')}
                    className={errors.venue ? 'error' : ''}
                  />
                  {errors.venue && <span className="error-message">{errors.venue.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="organizer">Организатор *</label>
                <input
                  type="text"
                  id="organizer"
                  {...register('organizer')}
                  className={errors.organizer ? 'error' : ''}
                />
                {errors.organizer && (
                  <span className="error-message">{errors.organizer.message}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactName">ФИО контактного лица *</label>
                  <input
                    type="text"
                    id="contactName"
                    {...register('contactName')}
                    className={errors.contactName ? 'error' : ''}
                  />
                  {errors.contactName && (
                    <span className="error-message">{errors.contactName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="contactPhone">Телефон *</label>
                  <input
                    type="tel"
                    id="contactPhone"
                    {...register('contactPhone')}
                    placeholder="+7 (999) 123-45-67"
                    className={errors.contactPhone ? 'error' : ''}
                  />
                  {errors.contactPhone && (
                    <span className="error-message">{errors.contactPhone.message}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="category">Категория *</label>
                <select id="category" {...register('category')}>
                  <option value={Category.JUNIOR}>Юниоры</option>
                  <option value={Category.YOUTH}>Юноши</option>
                  <option value={Category.SENIOR}>Взрослые</option>
                  <option value={Category.MIXED}>Смешанная</option>
                </select>
              </div>

              <div className="form-group">
                <label>Дисциплины *</label>
                <div className="checkbox-group">
                  {Object.values(Discipline).map((discipline) => (
                    <label key={discipline} className="checkbox-label">
                      <input
                        type="checkbox"
                        value={discipline}
                        {...register('disciplines')}
                      />
                      {translateDiscipline(discipline)}
                    </label>
                  ))}
                </div>
                {errors.disciplines && (
                  <span className="error-message">{errors.disciplines.message}</span>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Judge Management */}
          {currentStep === 2 && competitionId && (
            <div className="step-content">
              <JudgeManagement competitionId={competitionId} />
            </div>
          )}

          {/* Step 3: Logo Upload */}
          {currentStep === 3 && competitionId && (
            <div className="step-content">
              <LogoUpload competitionId={competitionId} />
            </div>
          )}

          {/* Step 4: Ranking Settings */}
          {currentStep === 4 && (
            <div className="step-content">
              <div className="form-group">
                <label>Правило при совпадении оценок</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value={TiebreakRule.SHARE}
                      {...register('tiebreakRule')}
                    />
                    Делить место
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value={TiebreakRule.COMPONENTS}
                      {...register('tiebreakRule')}
                    />
                    Проверять компоненты (E &gt; A &gt; D)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Пропуск позиций</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value={RankingSkip.NO_SKIP}
                      {...register('rankingSkip')}
                    />
                    Не пропускать (1-1-2)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value={RankingSkip.SKIP}
                      {...register('rankingSkip')}
                    />
                    Пропускать (1-1-3)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Расчет D-оценки</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value={DCalculation.RUSSIAN}
                      {...register('dCalculation')}
                    />
                    Российское правило: ((DB1+DB2) + (DA1+DA2)) / 2
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value={DCalculation.SUM}
                      {...register('dCalculation')}
                    />
                    Сумма: (DB1+DB2) + (DA1+DA2)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="modal-footer">
            {currentStep > 1 && (
              <button type="button" onClick={prevStep} className="btn btn-secondary">
                Назад
              </button>
            )}
            {currentStep < 4 ? (
              <button type="button" onClick={nextStep} className="btn btn-primary">
                Далее
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createCompetitionMutation.isPending}
              >
                {createCompetitionMutation.isPending ? 'Создание...' : 'Создать соревнование'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function translateDiscipline(discipline: Discipline): string {
  const translations = {
    ROPE: 'Скакалка',
    HOOP: 'Обруч',
    BALL: 'Мяч',
    CLUBS: 'Булавы',
    RIBBON: 'Лента',
    FREE: 'Без предмета',
  };
  return translations[discipline];
}
