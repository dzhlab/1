// apps/api/src/modules/competitions/services/schedule-calculator.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export enum CalculationMode {
  STRICT = 'strict',     // Останавливается при первом конфликте
  RELAXED = 'relaxed',   // Автоматически разрешает конфликты
}

export enum ConflictType {
  FIXED_TIME_CONFLICT = 'FIXED_TIME_CONFLICT',
  DAY_OVERFLOW = 'DAY_OVERFLOW',
  OVERLAP = 'OVERLAP',
  NEGATIVE_BREAK = 'NEGATIVE_BREAK',
  INSUFFICIENT_TIME = 'INSUFFICIENT_TIME',
}

export enum ConflictSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export enum SuggestionType {
  EXTEND_DAY = 'EXTEND_DAY',
  REDUCE_BREAKS = 'REDUCE_BREAKS',
  ADD_STREAMS = 'ADD_STREAMS',
  MOVE_TO_NEXT_DAY = 'MOVE_TO_NEXT_DAY',
  CHANGE_EVENT_TIME = 'CHANGE_EVENT_TIME',
  REMOVE_EVENT = 'REMOVE_EVENT',
}

export interface ScheduleOptions {
  mode: CalculationMode;
  breakBetweenItems?: number;      // Секунды между элементами
  breakBetweenStreams?: number;    // Секунды между потоками
  minBreakBeforeEvent?: number;    // Минимальный перерыв перед событием
  maxDayEndTime?: string;          // Максимальное время окончания дня (HH:MM)
  autoSave?: boolean;              // Автоматически сохранять изменения
}

export interface Conflict {
  type: ConflictType;
  severity: ConflictSeverity;
  dateId: string;
  itemId?: string;
  message: string;
  details: any;
  suggestions: Suggestion[];
}

export interface Suggestion {
  type: SuggestionType;
  description: string;
  action: any;
  impact: string;
  estimated Improvement?: number;  // Секунды сэкономленного времени
}

export interface ScheduleResult {
  success: boolean;
  conflicts: Conflict[];
  updatedDates: any[];
  statistics: {
    totalDays: number;
    totalItems: number;
    totalDuration: number;
    conflictsCount: number;
    suggestionsCount: number;
  };
  executionTime: number;  // Milliseconds
}

export interface DateItemCalculation {
  id: string;
  type: 'GROUP' | 'EVENT';
  order: number;
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  duration: number;   // Seconds
  isFixed: boolean;   // Фиксированное время (только для событий)
  data: any;          // Group or Event data
}

// ============================================================================
// SCHEDULE CALCULATOR SERVICE
// ============================================================================

@Injectable()
export class ScheduleCalculatorService {
  private readonly logger = new Logger(ScheduleCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Главный метод пересчета расписания для всего соревнования
   */
  async recalculateSchedule(
    competitionId: string,
    options: Partial<ScheduleOptions> = {},
  ): Promise<ScheduleResult> {
    const startTime = Date.now();

    this.logger.log(`Starting schedule recalculation for competition ${competitionId}`);

    // Устанавливаем настройки по умолчанию
    const settings: ScheduleOptions = {
      mode: options.mode || CalculationMode.RELAXED,
      breakBetweenItems: options.breakBetweenItems ?? 300,      // 5 minutes
      breakBetweenStreams: options.breakBetweenStreams ?? 180,  // 3 minutes
      minBreakBeforeEvent: options.minBreakBeforeEvent ?? 600,  // 10 minutes
      maxDayEndTime: options.maxDayEndTime || '22:00',
      autoSave: options.autoSave ?? true,
    };

    // Получаем соревнование со всеми датами и элементами
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        dates: {
          orderBy: { order: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: {
                group: {
                  include: {
                    athletes: true,
                    streams: {
                      include: {
                        athletes: true,
                      },
                    },
                  },
                },
                event: true,
              },
            },
          },
        },
      },
    });

    if (!competition) {
      throw new Error(`Competition with ID ${competitionId} not found`);
    }

    const allConflicts: Conflict[] = [];
    const updatedDates: any[] = [];
    let totalItems = 0;
    let totalDuration = 0;

    // Пересчитываем каждый день
    for (const date of competition.dates) {
      this.logger.debug(`Processing date ${date.id} (${date.date})`);

      const result = await this.recalculateDate(date, settings);

      allConflicts.push(...result.conflicts);
      updatedDates.push(result.updatedDate);
      totalItems += date.items.length;
      totalDuration += result.totalDuration;

      // В strict режиме останавливаемся при первом конфликте ERROR
      if (settings.mode === CalculationMode.STRICT) {
        const errors = result.conflicts.filter((c) => c.severity === ConflictSeverity.ERROR);
        if (errors.length > 0) {
          this.logger.warn(`Stopping recalculation due to errors in strict mode`);
          break;
        }
      }
    }

    // Сохраняем изменения если autoSave = true
    if (settings.autoSave && settings.mode === CalculationMode.RELAXED) {
      await this.saveScheduleChanges(updatedDates);
    }

    const executionTime = Date.now() - startTime;

    const result: ScheduleResult = {
      success: allConflicts.filter((c) => c.severity === ConflictSeverity.ERROR).length === 0,
      conflicts: allConflicts,
      updatedDates,
      statistics: {
        totalDays: competition.dates.length,
        totalItems,
        totalDuration,
        conflictsCount: allConflicts.length,
        suggestionsCount: allConflicts.reduce((sum, c) => sum + c.suggestions.length, 0),
      },
      executionTime,
    };

    this.logger.log(
      `Schedule recalculation completed in ${executionTime}ms. ` +
      `Success: ${result.success}, Conflicts: ${result.conflicts.length}`,
    );

    return result;
  }

  /**
   * Пересчет расписания для одного дня
   */
  private async recalculateDate(
    date: any,
    settings: ScheduleOptions,
  ): Promise<{
    updatedDate: any;
    conflicts: Conflict[];
    totalDuration: number;
  }> {
    const conflicts: Conflict[] = [];

    // Шаг 1: Рассчитываем длительность для каждого элемента
    const calculations: DateItemCalculation[] = [];

    for (const item of date.items) {
      const calculation = await this.calculateItemDuration(item, settings);
      calculations.push(calculation);
    }

    // Шаг 2: Последовательно назначаем время каждому элементу
    let currentTimeSeconds = this.parseTime(date.startTime);

    for (let i = 0; i < calculations.length; i++) {
      const item = calculations[i];
      const previousItem = i > 0 ? calculations[i - 1] : null;

      // Для событий с фиксированным временем
      if (item.isFixed && item.data.fixedStartTime) {
        const fixedTimeSeconds = this.parseTime(item.data.fixedStartTime);

        if (fixedTimeSeconds < currentTimeSeconds) {
          // Конфликт: событие не помещается
          const conflict: Conflict = {
            type: ConflictType.FIXED_TIME_CONFLICT,
            severity: ConflictSeverity.ERROR,
            dateId: date.id,
            itemId: item.id,
            message: `Событие "${item.data.name || item.data.type}" с фиксированным временем ${item.data.fixedStartTime} не помещается. ` +
                     `Предыдущие элементы заканчиваются в ${this.formatTime(currentTimeSeconds)}.`,
            details: {
              fixedTime: item.data.fixedStartTime,
              currentTime: this.formatTime(currentTimeSeconds),
              gap: currentTimeSeconds - fixedTimeSeconds,
            },
            suggestions: this.generateFixedTimeConflictSuggestions(
              item,
              previousItem,
              currentTimeSeconds,
              fixedTimeSeconds,
            ),
          };

          conflicts.push(conflict);

          // В strict режиме не продолжаем
          if (settings.mode === CalculationMode.STRICT) {
            break;
          }

          // В relaxed режиме сдвигаем событие
          currentTimeSeconds = Math.max(currentTimeSeconds, fixedTimeSeconds);
        } else {
          currentTimeSeconds = fixedTimeSeconds;
        }
      }

      // Назначаем время элементу
      item.startTime = this.formatTime(currentTimeSeconds);
      item.endTime = this.formatTime(currentTimeSeconds + item.duration);

      // Обновляем текущее время с учетом перерыва
      currentTimeSeconds += item.duration;

      // Добавляем перерыв перед следующим элементом
      if (i < calculations.length - 1) {
        const nextItem = calculations[i + 1];

        // Определяем длительность перерыва
        let breakDuration = settings.breakBetweenItems!;

        if (nextItem.type === 'EVENT') {
          breakDuration = Math.max(breakDuration, settings.minBreakBeforeEvent!);
        }

        currentTimeSeconds += breakDuration;
      }
    }

    // Шаг 3: Проверяем время окончания дня
    const dayEndTime = this.formatTime(currentTimeSeconds);
    const maxEndTimeSeconds = this.parseTime(settings.maxDayEndTime!);

    if (currentTimeSeconds > maxEndTimeSeconds) {
      const overflowMinutes = Math.ceil((currentTimeSeconds - maxEndTimeSeconds) / 60);

      const conflict: Conflict = {
        type: ConflictType.DAY_OVERFLOW,
        severity: ConflictSeverity.WARNING,
        dateId: date.id,
        message: `День заканчивается слишком поздно (${dayEndTime}). ` +
                 `Превышение: ${overflowMinutes} минут.`,
        details: {
          calculatedEndTime: dayEndTime,
          maxEndTime: settings.maxDayEndTime,
          overflowSeconds: currentTimeSeconds - maxEndTimeSeconds,
          overflowMinutes,
        },
        suggestions: this.generateDayOverflowSuggestions(calculations, overflowMinutes),
      };

      conflicts.push(conflict);
    }

    // Шаг 4: Обновляем время в объектах
    const updatedDate = {
      ...date,
      endTime: dayEndTime,
      items: date.items.map((item: any, index: number) => ({
        ...item,
        startTime: calculations[index].startTime,
        endTime: calculations[index].endTime,
        duration: calculations[index].duration,
      })),
    };

    return {
      updatedDate,
      conflicts,
      totalDuration: currentTimeSeconds - this.parseTime(date.startTime),
    };
  }

  /**
   * Расчет длительности элемента (группы или события)
   */
  private async calculateItemDuration(
    item: any,
    settings: ScheduleOptions,
  ): Promise<DateItemCalculation> {
    let duration = 0;
    let isFixed = false;

    if (item.type === 'EVENT') {
      // Для события длительность задана
      duration = item.event.duration;
      isFixed = item.event.isFixedTime;

      return {
        id: item.id,
        type: 'EVENT',
        order: item.order,
        startTime: '',  // Будет рассчитано
        endTime: '',    // Будет рассчитано
        duration,
        isFixed,
        data: item.event,
      };
    }

    if (item.type === 'GROUP') {
      const group = item.group;

      // Если группа использует потоки
      if (group.useStreams && group.streams.length > 0) {
        // Рассчитываем длительность каждого потока
        const streamDurations: number[] = [];

        for (const stream of group.streams) {
          const athletesInStream = stream.athletes.length;
          const numberOfApparatus = group.apparatus.length;

          // Длительность потока = количество участников × время выступления × количество видов
          const streamDuration =
            athletesInStream * group.timePerPerformance * numberOfApparatus;

          streamDurations.push(streamDuration);
        }

        // Если потоки параллельные (одновременные), берем максимум
        // Если последовательные, берем сумму
        // Предполагаем параллельные
        duration = Math.max(...streamDurations);

        // Добавляем перерывы между потоками
        if (group.streams.length > 1) {
          duration += (group.streams.length - 1) * settings.breakBetweenStreams!;
        }
      } else {
        // Группа без потоков
        const totalAthletes = group.athletes.length;
        const numberOfApparatus = group.apparatus.length;

        duration = totalAthletes * group.timePerPerformance * numberOfApparatus;
      }

      return {
        id: item.id,
        type: 'GROUP',
        order: item.order,
        startTime: '',  // Будет рассчитано
        endTime: '',    // Будет рассчитано
        duration,
        isFixed: false,
        data: group,
      };
    }

    throw new Error(`Unknown item type: ${item.type}`);
  }

  /**
   * Генерация предложений для конфликта фиксированного времени
   */
  private generateFixedTimeConflictSuggestions(
    item: DateItemCalculation,
    previousItem: DateItemCalculation | null,
    currentTimeSeconds: number,
    fixedTimeSeconds: number,
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const gap = currentTimeSeconds - fixedTimeSeconds;
    const gapMinutes = Math.ceil(gap / 60);

    // Предложение 1: Изменить время события
    suggestions.push({
      type: SuggestionType.CHANGE_EVENT_TIME,
      description: `Перенести событие "${item.data.name || item.data.type}" на ${this.formatTime(currentTimeSeconds)}`,
      action: {
        itemId: item.id,
        newStartTime: this.formatTime(currentTimeSeconds),
        removeFixedTime: true,
      },
      impact: `Событие начнется на ${gapMinutes} минут позже`,
    });

    // Предложение 2: Сократить перерывы
    if (previousItem) {
      suggestions.push({
        type: SuggestionType.REDUCE_BREAKS,
        description: `Сократить перерывы между элементами`,
        action: {
          reducedBreakDuration: Math.max(60, 300 - gap),  // Минимум 1 минута
        },
        impact: `Сократит общее время на ${gapMinutes} минут`,
        estimatedImprovement: gap,
      });
    }

    // Предложение 3: Добавить потоки предыдущей группе (если применимо)
    if (previousItem && previousItem.type === 'GROUP') {
      const group = previousItem.data;
      if (!group.useStreams || group.numberOfStreams < 3) {
        const newNumberOfStreams = (group.numberOfStreams || 1) + 1;
        const estimatedImprovement = previousItem.duration / newNumberOfStreams;

        suggestions.push({
          type: SuggestionType.ADD_STREAMS,
          description: `Разделить группу "${group.name}" на ${newNumberOfStreams} потока`,
          action: {
            groupId: group.id,
            numberOfStreams: newNumberOfStreams,
          },
          impact: `Сократит время группы примерно на ${Math.ceil(estimatedImprovement / 60)} минут`,
          estimatedImprovement,
        });
      }
    }

    return suggestions;
  }

  /**
   * Генерация предложений для переполнения дня
   */
  private generateDayOverflowSuggestions(
    items: DateItemCalculation[],
    overflowMinutes: number,
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Предложение 1: Продлить день
    suggestions.push({
      type: SuggestionType.EXTEND_DAY,
      description: `Продлить день до позднего времени`,
      action: {
        extendBy: overflowMinutes,
      },
      impact: `День закончится на ${overflowMinutes} минут позже`,
    });

    // Предложение 2: Добавить потоки к самым длинным группам
    const groups = items.filter((i) => i.type === 'GROUP').sort((a, b) => b.duration - a.duration);

    if (groups.length > 0) {
      const longestGroup = groups[0];
      const group = longestGroup.data;

      if (!group.useStreams || group.numberOfStreams < 4) {
        const newNumberOfStreams = (group.numberOfStreams || 1) + 1;
        const estimatedImprovement = longestGroup.duration / newNumberOfStreams;

        suggestions.push({
          type: SuggestionType.ADD_STREAMS,
          description: `Разделить самую длинную группу "${group.name}" на ${newNumberOfStreams} потока`,
          action: {
            groupId: group.id,
            numberOfStreams: newNumberOfStreams,
          },
          impact: `Сократит время группы на ${Math.ceil(estimatedImprovement / 60)} минут`,
          estimatedImprovement,
        });
      }
    }

    // Предложение 3: Сократить перерывы
    suggestions.push({
      type: SuggestionType.REDUCE_BREAKS,
      description: `Сократить перерывы между элементами до 3 минут`,
      action: {
        newBreakDuration: 180,  // 3 minutes
      },
      impact: `Сократит общее время дня`,
    });

    // Предложение 4: Перенести элементы на следующий день
    const movableItems = items.filter((i) => !i.isFixed);
    if (movableItems.length > 0) {
      suggestions.push({
        type: SuggestionType.MOVE_TO_NEXT_DAY,
        description: `Перенести последние элементы на следующий день`,
        action: {
          itemsToMove: movableItems.slice(-2).map((i) => i.id),
        },
        impact: `Освободит время в текущем дне`,
      });
    }

    return suggestions;
  }

  /**
   * Сохранение изменений расписания
   */
  private async saveScheduleChanges(updatedDates: any[]): Promise<void> {
    for (const date of updatedDates) {
      // Обновляем дату
      await this.prisma.competitionDate.update({
        where: { id: date.id },
        data: {
          endTime: date.endTime,
          scheduleStatus: date.conflicts?.length > 0 ? 'CONFLICTS' : 'CALCULATED',
          lastRecalculatedAt: new Date(),
        },
      });

      // Обновляем элементы
      for (const item of date.items) {
        await this.prisma.dateItem.update({
          where: { id: item.id },
          data: {
            startTime: item.startTime,
            endTime: item.endTime,
            duration: item.duration,
          },
        });
      }
    }

    this.logger.log(`Saved schedule changes for ${updatedDates.length} dates`);
  }

  /**
   * Парсинг времени из формата HH:MM в секунды
   */
  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60;
  }

  /**
   * Форматирование времени из секунд в HH:MM
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
