// apps/api/src/modules/competitions/services/date-management.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduleCalculatorService } from './schedule-calculator.service';

export enum DatePosition {
  BEFORE_FIRST = 'beforeFirst',
  AFTER_LAST = 'afterLast',
  AFTER_DATE_ID = 'afterDateId',
}

export interface AddDateDto {
  date: string;  // YYYY-MM-DD
  startTime: string;  // HH:MM
  position: DatePosition;
  targetDateId?: string;  // Required if position = AFTER_DATE_ID
}

export interface EditDateDto {
  date?: string;
  startTime?: string;
}

export interface DateShiftInfo {
  dateId: string;
  oldDate: string;
  newDate: string;
  daysDifference: number;
}

@Injectable()
export class DateManagementService {
  constructor(
    private prisma: PrismaService,
    private scheduleCalculator: ScheduleCalculatorService,
  ) {}

  /**
   * Добавить дату в соревнование
   */
  async addDate(competitionId: string, dto: AddDateDto) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        dates: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException(`Competition ${competitionId} not found`);
    }

    let newOrder: number;
    const dateObj = new Date(dto.date);

    // Определяем порядковый номер новой даты
    switch (dto.position) {
      case DatePosition.BEFORE_FIRST:
        newOrder = 1;
        // Сдвигаем все существующие даты на +1
        await this.shiftDatesOrder(competitionId, 1, 1);
        break;

      case DatePosition.AFTER_LAST:
        newOrder = (competition.dates.length || 0) + 1;
        break;

      case DatePosition.AFTER_DATE_ID:
        if (!dto.targetDateId) {
          throw new BadRequestException('targetDateId is required for AFTER_DATE_ID position');
        }

        const targetDate = competition.dates.find((d) => d.id === dto.targetDateId);
        if (!targetDate) {
          throw new NotFoundException(`Target date ${dto.targetDateId} not found`);
        }

        newOrder = targetDate.order + 1;
        // Сдвигаем все даты после целевой на +1
        await this.shiftDatesOrder(competitionId, newOrder, 1);
        break;

      default:
        throw new BadRequestException(`Invalid position: ${dto.position}`);
    }

    // Определяем номер дня
    const dayNumber = newOrder;

    // Создаем новую дату
    const newDate = await this.prisma.competitionDate.create({
      data: {
        competitionId,
        date: dateObj,
        dayNumber,
        order: newOrder,
        startTime: dto.startTime,
        scheduleStatus: 'DRAFT',
      },
    });

    // Если добавили дату не в конец, может потребоваться сдвиг календарных дат
    if (dto.position !== DatePosition.AFTER_LAST) {
      await this.adjustCalendarDates(competitionId);
    }

    // Пересчитываем расписание
    await this.scheduleCalculator.recalculateSchedule(competitionId, {
      mode: 'relaxed' as any,
      autoSave: true,
    });

    return this.prisma.competitionDate.findUnique({
      where: { id: newDate.id },
      include: {
        items: {
          include: {
            group: {
              include: {
                athletes: true,
                streams: true,
              },
            },
            event: true,
          },
        },
      },
    });
  }

  /**
   * Редактировать дату (только первую или последнюю!)
   */
  async editDate(competitionId: string, dateId: string, dto: EditDateDto) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        dates: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException(`Competition ${competitionId} not found`);
    }

    const dateToEdit = competition.dates.find((d) => d.id === dateId);
    if (!dateToEdit) {
      throw new NotFoundException(`Date ${dateId} not found`);
    }

    const isFirstDate = dateToEdit.order === 1;
    const isLastDate = dateToEdit.order === competition.dates.length;

    // Проверяем, что редактируем только первый или последний день
    if (!isFirstDate && !isLastDate) {
      throw new BadRequestException(
        `Cannot edit date at position ${dateToEdit.order}. ` +
        `Only first and last dates can be edited directly. ` +
        `To change middle dates, edit first or last date - other dates will shift automatically.`,
      );
    }

    const shifts: DateShiftInfo[] = [];

    // Если изменяется календарная дата
    if (dto.date) {
      const oldDateObj = new Date(dateToEdit.date);
      const newDateObj = new Date(dto.date);

      const daysDiff = Math.floor(
        (newDateObj.getTime() - oldDateObj.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff !== 0) {
        // Сдвигаем остальные даты
        if (isFirstDate) {
          // Сдвигаем все даты после первой
          for (const date of competition.dates.slice(1)) {
            const newDate = new Date(date.date);
            newDate.setDate(newDate.getDate() + daysDiff);

            await this.prisma.competitionDate.update({
              where: { id: date.id },
              data: { date: newDate },
            });

            shifts.push({
              dateId: date.id,
              oldDate: date.date.toISOString().split('T')[0],
              newDate: newDate.toISOString().split('T')[0],
              daysDifference: daysDiff,
            });
          }
        }

        // Обновляем целевую дату
        await this.prisma.competitionDate.update({
          where: { id: dateId },
          data: { date: newDateObj },
        });

        shifts.push({
          dateId,
          oldDate: oldDateObj.toISOString().split('T')[0],
          newDate: newDateObj.toISOString().split('T')[0],
          daysDifference: daysDiff,
        });
      }
    }

    // Если изменяется время начала
    if (dto.startTime) {
      await this.prisma.competitionDate.update({
        where: { id: dateId },
        data: { startTime: dto.startTime },
      });
    }

    // Пересчитываем расписание
    const recalcResult = await this.scheduleCalculator.recalculateSchedule(competitionId, {
      mode: 'relaxed' as any,
      autoSave: true,
    });

    const updatedDate = await this.prisma.competitionDate.findUnique({
      where: { id: dateId },
      include: {
        items: {
          include: {
            group: {
              include: {
                athletes: true,
                streams: true,
              },
            },
            event: true,
          },
        },
      },
    });

    return {
      date: updatedDate,
      shifts,
      recalculation: recalcResult,
    };
  }

  /**
   * Удалить дату
   */
  async deleteDate(competitionId: string, dateId: string) {
    const date = await this.prisma.competitionDate.findUnique({
      where: { id: dateId },
      include: {
        items: {
          include: {
            group: {
              include: {
                athletes: true,
              },
            },
            event: true,
          },
        },
      },
    });

    if (!date) {
      throw new NotFoundException(`Date ${dateId} not found`);
    }

    if (date.competitionId !== competitionId) {
      throw new BadRequestException('Date does not belong to this competition');
    }

    // Подсчитываем, что будет удалено
    const itemsCount = date.items.length;
    const groupsCount = date.items.filter((i) => i.type === 'GROUP').length;
    const eventsCount = date.items.filter((i) => i.type === 'EVENT').length;
    const athletesCount = date.items
      .filter((i) => i.group)
      .reduce((sum, i) => sum + (i.group?.athletes.length || 0), 0);

    // Удаляем дату (каскадно удалятся items, groups, events)
    await this.prisma.competitionDate.delete({
      where: { id: dateId },
    });

    // Перенумеруем оставшиеся даты
    const remainingDates = await this.prisma.competitionDate.findMany({
      where: { competitionId },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingDates.length; i++) {
      await this.prisma.competitionDate.update({
        where: { id: remainingDates[i].id },
        data: {
          order: i + 1,
          dayNumber: i + 1,
        },
      });
    }

    return {
      success: true,
      deletedItems: {
        items: itemsCount,
        groups: groupsCount,
        events: eventsCount,
        athletes: athletesCount,
      },
    };
  }

  /**
   * Сдвиг порядка дат
   */
  private async shiftDatesOrder(
    competitionId: string,
    fromOrder: number,
    shiftBy: number,
  ): Promise<void> {
    await this.prisma.competitionDate.updateMany({
      where: {
        competitionId,
        order: { gte: fromOrder },
      },
      data: {
        order: {
          increment: shiftBy,
        },
        dayNumber: {
          increment: shiftBy,
        },
      },
    });
  }

  /**
   * Корректировка календарных дат при вставке
   */
  private async adjustCalendarDates(competitionId: string): Promise<void> {
    const dates = await this.prisma.competitionDate.findMany({
      where: { competitionId },
      orderBy: { order: 'asc' },
    });

    // Проверяем, есть ли логическая последовательность дат
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1].date);
      const currDate = new Date(dates[i].date);

      const daysDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Если даты идут не по порядку, корректируем
      if (daysDiff <= 0) {
        const newDate = new Date(prevDate);
        newDate.setDate(newDate.getDate() + 1);

        await this.prisma.competitionDate.update({
          where: { id: dates[i].id },
          data: { date: newDate },
        });
      }
    }
  }
}
