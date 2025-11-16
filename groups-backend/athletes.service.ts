// apps/api/src/modules/athletes/athletes.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

export interface ReorderOptions {
  athleteId: string;
  newPosition: number;
}

export interface MoveDirection {
  direction: 'up' | 'down';
}

@Injectable()
export class AthletesService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  /**
   * Найти участника по ID
   */
  async findOne(id: string) {
    const athlete = await this.prisma.groupAthlete.findUnique({
      where: { id },
      include: {
        group: true,
        stream: true,
      },
    });

    if (!athlete) {
      throw new NotFoundException(`Athlete with ID ${id} not found`);
    }

    return athlete;
  }

  /**
   * Создать участника
   */
  async create(groupId: string, data: any) {
    const group = await this.groupsService.findOne(groupId);

    // Определяем следующий порядковый номер
    const maxOrder = await this.prisma.groupAthlete.findFirst({
      where: { groupId },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    const orderNumber = (maxOrder?.orderNumber || 0) + 1;

    const athlete = await this.prisma.groupAthlete.create({
      data: {
        groupId,
        fullName: data.fullName,
        birthDate: new Date(data.birthDate),
        city: data.city,
        club: data.club,
        coach: data.coach,
        rank: data.rank,
        orderNumber,
        apparatusNumber: data.apparatusNumber,
        subgroup: data.subgroup,
      },
      include: {
        group: true,
        stream: true,
      },
    });

    // Логируем изменение
    await this.groupsService.logChange(
      groupId,
      'CREATE',
      'ATHLETE',
      athlete.id,
      undefined,
      athlete,
    );

    return athlete;
  }

  /**
   * Обновить участника
   */
  async update(id: string, data: any) {
    const athlete = await this.findOne(id);

    const updated = await this.prisma.groupAthlete.update({
      where: { id },
      data: {
        fullName: data.fullName ?? athlete.fullName,
        birthDate: data.birthDate ? new Date(data.birthDate) : athlete.birthDate,
        city: data.city ?? athlete.city,
        club: data.club ?? athlete.club,
        coach: data.coach ?? athlete.coach,
        rank: data.rank ?? athlete.rank,
        apparatusNumber: data.apparatusNumber ?? athlete.apparatusNumber,
        subgroup: data.subgroup ?? athlete.subgroup,
      },
      include: {
        group: true,
        stream: true,
      },
    });

    // Логируем изменение
    await this.groupsService.logChange(
      athlete.groupId,
      'UPDATE',
      'ATHLETE',
      id,
      athlete,
      updated,
    );

    return updated;
  }

  /**
   * Удалить участника
   */
  async delete(id: string) {
    const athlete = await this.findOne(id);

    // Удаляем участника
    await this.prisma.groupAthlete.delete({
      where: { id },
    });

    // Перенумеруем оставшихся
    await this.renumberAthletes(athlete.groupId);

    // Логируем изменение
    await this.groupsService.logChange(
      athlete.groupId,
      'DELETE',
      'ATHLETE',
      id,
      athlete,
      undefined,
    );

    return { success: true };
  }

  /**
   * Переместить участника вверх/вниз
   */
  async move(id: string, direction: 'up' | 'down') {
    const athlete = await this.findOne(id);
    const currentOrder = athlete.orderNumber;

    // Определяем новую позицию
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

    if (newOrder < 1) {
      throw new BadRequestException('Cannot move athlete up - already at the top');
    }

    // Находим участника на целевой позиции
    const targetAthlete = await this.prisma.groupAthlete.findFirst({
      where: {
        groupId: athlete.groupId,
        orderNumber: newOrder,
      },
    });

    if (!targetAthlete) {
      throw new BadRequestException(`Cannot move athlete ${direction} - no athlete at position ${newOrder}`);
    }

    // Меняем местами в транзакции
    await this.prisma.$transaction([
      this.prisma.groupAthlete.update({
        where: { id: athlete.id },
        data: { orderNumber: newOrder },
      }),
      this.prisma.groupAthlete.update({
        where: { id: targetAthlete.id },
        data: { orderNumber: currentOrder },
      }),
    ]);

    // Логируем изменение
    await this.groupsService.logChange(
      athlete.groupId,
      'REORDER',
      'ATHLETE',
      athlete.id,
      { orderNumber: currentOrder },
      { orderNumber: newOrder },
      { direction },
    );

    return this.findOne(id);
  }

  /**
   * Переместить участника на конкретную позицию
   */
  async reorder(groupId: string, athleteId: string, newPosition: number) {
    const athlete = await this.findOne(athleteId);

    if (athlete.groupId !== groupId) {
      throw new BadRequestException('Athlete does not belong to this group');
    }

    const currentPosition = athlete.orderNumber;

    if (currentPosition === newPosition) {
      return athlete; // Ничего не делаем
    }

    // Получаем всех участников группы
    const athletes = await this.prisma.groupAthlete.findMany({
      where: { groupId },
      orderBy: { orderNumber: 'asc' },
    });

    if (newPosition < 1 || newPosition > athletes.length) {
      throw new BadRequestException(`Invalid position: ${newPosition}`);
    }

    // Создаем новый порядок
    const reordered = [...athletes];
    const [movedAthlete] = reordered.splice(currentPosition - 1, 1);
    reordered.splice(newPosition - 1, 0, movedAthlete);

    // Обновляем orderNumber для всех
    await this.prisma.$transaction(
      reordered.map((a, index) =>
        this.prisma.groupAthlete.update({
          where: { id: a.id },
          data: { orderNumber: index + 1 },
        }),
      ),
    );

    // Логируем изменение
    await this.groupsService.logChange(
      groupId,
      'REORDER',
      'ATHLETE',
      athleteId,
      { orderNumber: currentPosition },
      { orderNumber: newPosition },
    );

    return this.findOne(athleteId);
  }

  /**
   * Массовое изменение порядка
   */
  async bulkReorder(groupId: string, order: string[]) {
    const group = await this.groupsService.findOne(groupId);

    if (order.length !== group.athletes.length) {
      throw new BadRequestException('Order array length must match athletes count');
    }

    // Проверяем, что все ID принадлежат группе
    const athleteIds = new Set(group.athletes.map((a) => a.id));
    const invalidIds = order.filter((id) => !athleteIds.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(`Invalid athlete IDs: ${invalidIds.join(', ')}`);
    }

    // Обновляем порядок
    await this.prisma.$transaction(
      order.map((athleteId, index) =>
        this.prisma.groupAthlete.update({
          where: { id: athleteId },
          data: { orderNumber: index + 1 },
        }),
      ),
    );

    // Логируем изменение
    await this.groupsService.logChange(
      groupId,
      'REORDER',
      'GROUP',
      groupId,
      { order: group.athletes.map((a) => a.id) },
      { order },
    );

    return this.groupsService.findOne(groupId);
  }

  /**
   * Очистить всех участников группы
   */
  async clearAll(groupId: string) {
    const group = await this.groupsService.findOne(groupId);

    const count = await this.prisma.groupAthlete.deleteMany({
      where: { groupId },
    });

    // Логируем изменение
    await this.groupsService.logChange(
      groupId,
      'DELETE',
      'GROUP',
      groupId,
      { athletesCount: group.athletes.length },
      { athletesCount: 0 },
    );

    return {
      success: true,
      deleted: count.count,
    };
  }

  /**
   * Назначить вид программы участнику
   */
  async assignApparatus(athleteId: string, apparatusNumber: number) {
    const athlete = await this.findOne(athleteId);

    const updated = await this.prisma.groupAthlete.update({
      where: { id: athleteId },
      data: { apparatusNumber },
    });

    // Логируем изменение
    await this.groupsService.logChange(
      athlete.groupId,
      'UPDATE',
      'ATHLETE',
      athleteId,
      { apparatusNumber: athlete.apparatusNumber },
      { apparatusNumber },
    );

    return updated;
  }

  /**
   * Назначить подгруппу участнику
   */
  async assignSubgroup(athleteId: string, subgroup: string) {
    const athlete = await this.findOne(athleteId);

    const updated = await this.prisma.groupAthlete.update({
      where: { id: athleteId },
      data: { subgroup },
    });

    // Логируем изменение
    await this.groupsService.logChange(
      athlete.groupId,
      'UPDATE',
      'ATHLETE',
      athleteId,
      { subgroup: athlete.subgroup },
      { subgroup },
    );

    return updated;
  }

  /**
   * Вспомогательная функция: перенумеровать участников
   */
  private async renumberAthletes(groupId: string): Promise<void> {
    const athletes = await this.prisma.groupAthlete.findMany({
      where: { groupId },
      orderBy: { orderNumber: 'asc' },
    });

    await this.prisma.$transaction(
      athletes.map((athlete, index) =>
        this.prisma.groupAthlete.update({
          where: { id: athlete.id },
          data: { orderNumber: index + 1 },
        }),
      ),
    );
  }

  /**
   * Валидация участника
   */
  validateAthlete(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.fullName || data.fullName.trim().length < 3) {
      errors.push('Full name must be at least 3 characters');
    }

    if (!data.birthDate) {
      errors.push('Birth date is required');
    } else {
      const birthDate = new Date(data.birthDate);
      const age = (new Date().getFullYear() - birthDate.getFullYear());
      if (age < 3 || age > 50) {
        errors.push('Invalid birth date (age must be between 3 and 50)');
      }
    }

    if (!data.city || data.city.trim().length < 2) {
      errors.push('City must be at least 2 characters');
    }

    if (!data.club || data.club.trim().length < 2) {
      errors.push('Club must be at least 2 characters');
    }

    if (!data.coach || data.coach.trim().length < 3) {
      errors.push('Coach name must be at least 3 characters');
    }

    if (!data.rank) {
      errors.push('Rank is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
