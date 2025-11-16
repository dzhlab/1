// apps/api/src/modules/groups/groups.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, GroupFilterDto } from './dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Найти все группы с фильтрацией
   */
  async findAll(filter?: GroupFilterDto) {
    const where: any = {};

    if (filter?.discipline) {
      where.discipline = filter.discipline;
    }

    if (filter?.ageCategory) {
      where.ageCategory = filter.ageCategory;
    }

    if (filter?.program) {
      where.program = filter.program;
    }

    if (filter?.search) {
      where.name = {
        contains: filter.search,
        mode: 'insensitive',
      };
    }

    return this.prisma.group.findMany({
      where,
      include: {
        _count: {
          select: {
            athletes: true,
            streams: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Найти одну группу по ID
   */
  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        athletes: {
          orderBy: {
            orderNumber: 'asc',
          },
        },
        streams: {
          include: {
            athletes: {
              orderBy: {
                orderNumber: 'asc',
              },
            },
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  /**
   * Создать группу
   */
  async create(createGroupDto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        ...createGroupDto,
      },
      include: {
        _count: {
          select: {
            athletes: true,
            streams: true,
          },
        },
      },
    });
  }

  /**
   * Обновить группу
   */
  async update(id: string, updateGroupDto: UpdateGroupDto) {
    // Проверяем существование
    await this.findOne(id);

    return this.prisma.group.update({
      where: { id },
      data: updateGroupDto,
      include: {
        _count: {
          select: {
            athletes: true,
            streams: true,
          },
        },
      },
    });
  }

  /**
   * Удалить группу
   */
  async remove(id: string) {
    // Проверяем существование
    await this.findOne(id);

    // Prisma автоматически удалит связанных athletes и streams (CASCADE)
    await this.prisma.group.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Дублировать группу
   */
  async duplicate(id: string) {
    const original = await this.findOne(id);

    // Создаем копию без athletes и streams
    const duplicate = await this.prisma.group.create({
      data: {
        name: `${original.name} (копия)`,
        discipline: original.discipline,
        ageCategory: original.ageCategory,
        yearFrom: original.yearFrom,
        yearTo: original.yearTo,
        program: original.program,
        performanceType: original.performanceType,
        apparatus: original.apparatus,
        apparatusOrder: original.apparatusOrder,
        performanceDuration: original.performanceDuration,
        athletesPerStream: original.athletesPerStream,
        minAthletesPerStream: original.minAthletesPerStream,
        streamStartTime: original.streamStartTime,
        subgroups: original.subgroups,
      },
    });

    return duplicate;
  }

  /**
   * Получить статистику группы
   */
  async getStatistics(groupId: string) {
    const group = await this.findOne(groupId);

    // Подсчет статистики
    const totalAthletes = group.athletes.length;
    const totalStreams = group.streams.length;

    // Группировка по разрядам
    const byRank = group.athletes.reduce((acc, athlete) => {
      acc[athlete.rank] = (acc[athlete.rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Группировка по клубам
    const byClub = group.athletes.reduce((acc, athlete) => {
      acc[athlete.club] = (acc[athlete.club] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Группировка по городам
    const byCity = group.athletes.reduce((acc, athlete) => {
      acc[athlete.city] = (acc[athlete.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Группировка по видам программ
    const byApparatus = group.athletes.reduce((acc, athlete) => {
      if (athlete.apparatusNumber) {
        acc[athlete.apparatusNumber] = (acc[athlete.apparatusNumber] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    // Распределение по потокам
    const byStream = group.streams.map(stream => ({
      streamId: stream.id,
      name: stream.name,
      subgroup: stream.subgroup,
      count: stream.athletes.length,
    }));

    return {
      totalAthletes,
      totalStreams,
      byRank,
      byClub,
      byCity,
      byApparatus,
      byStream,
    };
  }

  /**
   * Получить историю изменений группы
   */
  async getHistory(groupId: string) {
    return this.prisma.groupAuditLog.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Логирование изменений
   */
  async logChange(
    groupId: string,
    action: string,
    entityType: string,
    entityId?: string,
    userId?: string,
    changes?: any,
    metadata?: any,
  ) {
    return this.prisma.groupAuditLog.create({
      data: {
        groupId,
        action,
        entityType,
        entityId,
        userId,
        changes,
        metadata,
      },
    });
  }
}
