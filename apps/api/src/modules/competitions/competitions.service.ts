import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitionDto, UpdateCompetitionDto, AddDateDto, AddEventDto } from './dto';

@Injectable()
export class CompetitionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompetitionDto, userId?: string) {
    const competition = await this.prisma.competition.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days: dto.days,
        city: dto.city,
        venue: dto.venue,
        address: dto.address,
        organizer: dto.organizer,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        category: dto.category as any,
        description: dto.description,
        tiebreakRule: (dto.tiebreakRule as any) || 'SHARE',
        rankingSkip: (dto.rankingSkip as any) || 'NO_SKIP',
        dCalculation: (dto.dCalculation as any) || 'RUSSIAN',
        createdBy: userId,
        disciplines: {
          create: dto.disciplines.map((discipline, index) => ({
            discipline: discipline as any,
            order: index,
          })),
        },
      },
      include: {
        disciplines: true,
      },
    });

    return competition;
  }

  async findAll(filters?: {
    status?: string;
    category?: string;
    city?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.city) {
      where.city = filters.city;
    }

    return this.prisma.competition.findMany({
      where,
      include: {
        disciplines: true,
        _count: {
          select: {
            participants: true,
            judges: true,
            groups: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: {
        disciplines: {
          orderBy: { order: 'asc' },
        },
        dates: {
          orderBy: { order: 'asc' },
          include: {
            events: {
              orderBy: { order: 'asc' },
            },
            groups: {
              orderBy: { order: 'asc' },
              include: {
                group: true,
              },
            },
          },
        },
        judges: {
          include: {
            judge: true,
          },
          orderBy: { position: 'asc' },
        },
        participants: {
          include: {
            participant: true,
          },
        },
        groups: {
          include: {
            athletes: {
              include: {
                participant: true,
              },
              orderBy: { orderNumber: 'asc' },
            },
            streams: {
              orderBy: { number: 'asc' },
            },
          },
        },
        brigades: {
          where: { isActive: true },
          include: {
            judges: {
              where: { isActive: true },
              orderBy: { judgeRole: 'asc' },
            },
          },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException(`Competition with ID ${id} not found`);
    }

    return competition;
  }

  async update(id: string, dto: UpdateCompetitionDto) {
    const competition = await this.findOne(id);

    const updateData: any = { ...dto };

    // Update dates if changed
    if (dto.startDate || dto.endDate) {
      updateData.startDate = dto.startDate ? new Date(dto.startDate) : undefined;
      updateData.endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    }

    // Update disciplines if provided
    if (dto.disciplines) {
      await this.prisma.competitionDiscipline.deleteMany({
        where: { competitionId: id },
      });

      updateData.disciplines = {
        create: dto.disciplines.map((discipline, index) => ({
          discipline: discipline as any,
          order: index,
        })),
      };
    }

    return this.prisma.competition.update({
      where: { id },
      data: updateData,
      include: {
        disciplines: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.competition.delete({
      where: { id },
    });

    return { message: 'Competition deleted successfully' };
  }

  // ============================================
  // DATE MANAGEMENT
  // ============================================

  async addDate(competitionId: string, dto: AddDateDto) {
    const competition = await this.findOne(competitionId);

    let order: number;

    if (dto.position === 'beforeFirst') {
      // Insert at position 1, shift all others
      await this.prisma.competitionDate.updateMany({
        where: { competitionId },
        data: {
          order: { increment: 1 },
        },
      });
      order = 1;
    } else if (dto.position === 'afterLast') {
      // Find max order and add 1
      const lastDate = await this.prisma.competitionDate.findFirst({
        where: { competitionId },
        orderBy: { order: 'desc' },
      });
      order = (lastDate?.order || 0) + 1;
    } else if (dto.position === 'afterDateId' && dto.afterDateId) {
      // Find order of specified date
      const afterDate = await this.prisma.competitionDate.findUnique({
        where: { id: dto.afterDateId },
      });

      if (!afterDate || afterDate.competitionId !== competitionId) {
        throw new BadRequestException('Invalid afterDateId');
      }

      // Shift all dates after this position
      await this.prisma.competitionDate.updateMany({
        where: {
          competitionId,
          order: { gt: afterDate.order },
        },
        data: {
          order: { increment: 1 },
        },
      });

      order = afterDate.order + 1;
    } else {
      throw new BadRequestException('Invalid position or missing afterDateId');
    }

    const date = await this.prisma.competitionDate.create({
      data: {
        competitionId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        order,
      },
    });

    return date;
  }

  async updateDate(dateId: string, updateDto: { startTime?: string; date?: string }) {
    const date = await this.prisma.competitionDate.findUnique({
      where: { id: dateId },
      include: {
        competition: {
          include: {
            dates: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!date) {
      throw new NotFoundException('Date not found');
    }

    const allDates = date.competition.dates;
    const isFirst = date.order === 1;
    const isLast = date.order === Math.max(...allDates.map((d) => d.order));

    // Only allow editing first or last date
    if (!isFirst && !isLast) {
      throw new BadRequestException(
        `Cannot edit date at position ${date.order}. Only first and last dates can be edited.`
      );
    }

    return this.prisma.competitionDate.update({
      where: { id: dateId },
      data: {
        startTime: updateDto.startTime,
        date: updateDto.date ? new Date(updateDto.date) : undefined,
      },
    });
  }

  async removeDate(dateId: string) {
    const date = await this.prisma.competitionDate.findUnique({
      where: { id: dateId },
    });

    if (!date) {
      throw new NotFoundException('Date not found');
    }

    // Delete the date
    await this.prisma.competitionDate.delete({
      where: { id: dateId },
    });

    // Re-order remaining dates
    await this.prisma.competitionDate.updateMany({
      where: {
        competitionId: date.competitionId,
        order: { gt: date.order },
      },
      data: {
        order: { decrement: 1 },
      },
    });

    return { message: 'Date deleted successfully' };
  }

  // ============================================
  // EVENT MANAGEMENT
  // ============================================

  async addEvent(dateId: string, dto: AddEventDto) {
    const date = await this.prisma.competitionDate.findUnique({
      where: { id: dateId },
    });

    if (!date) {
      throw new NotFoundException('Date not found');
    }

    // Find max order for events on this date
    const lastEvent = await this.prisma.dateEvent.findFirst({
      where: { dateId },
      orderBy: { order: 'desc' },
    });

    const event = await this.prisma.dateEvent.create({
      data: {
        dateId,
        type: dto.type as any,
        name: dto.name,
        description: dto.description,
        duration: dto.duration,
        isFixedTime: dto.isFixedTime || false,
        fixedStartTime: dto.fixedStartTime,
        order: (lastEvent?.order || 0) + 1,
      },
    });

    return event;
  }

  async updateEvent(eventId: string, dto: Partial<AddEventDto>) {
    const event = await this.prisma.dateEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.dateEvent.update({
      where: { id: eventId },
      data: {
        type: dto.type as any,
        name: dto.name,
        description: dto.description,
        duration: dto.duration,
        isFixedTime: dto.isFixedTime,
        fixedStartTime: dto.fixedStartTime,
      },
    });
  }

  async removeEvent(eventId: string) {
    await this.prisma.dateEvent.delete({
      where: { id: eventId },
    });

    return { message: 'Event deleted successfully' };
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatistics(id: string) {
    const competition = await this.findOne(id);

    const stats = await this.prisma.competition.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            participants: true,
            judges: true,
            groups: true,
            scores: true,
            dates: true,
            brigades: true,
          },
        },
      },
    });

    return {
      id: competition.id,
      name: competition.name,
      participantsCount: stats._count.participants,
      judgesCount: stats._count.judges,
      groupsCount: stats._count.groups,
      scoresCount: stats._count.scores,
      datesCount: stats._count.dates,
      brigadesCount: stats._count.brigades,
      disciplinesCount: competition.disciplines.length,
    };
  }
}
