import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, AddAthleteDto, GenerateStreamsDto, DrawDto } from './dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        competitionId: dto.competitionId,
        name: dto.name,
        ageGroup: dto.ageGroup as any,
        rank: dto.rank as any,
        performanceType: dto.performanceType as any,
        disciplines: dto.disciplines as any[],
        performanceDuration: dto.performanceDuration,
      },
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
    });
  }

  async findAll(competitionId?: string) {
    const where: any = {};
    if (competitionId) {
      where.competitionId = competitionId;
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
        competition: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        competition: true,
        athletes: {
          include: {
            participant: true,
            stream: true,
          },
          orderBy: { orderNumber: 'asc' },
        },
        streams: {
          include: {
            athletes: {
              include: {
                participant: true,
              },
              orderBy: { orderNumber: 'asc' },
            },
          },
          orderBy: { number: 'asc' },
        },
        drawHistory: {
          orderBy: { performedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  async update(id: string, dto: UpdateGroupDto) {
    await this.findOne(id);

    return this.prisma.group.update({
      where: { id },
      data: {
        name: dto.name,
        ageGroup: dto.ageGroup as any,
        rank: dto.rank as any,
        performanceType: dto.performanceType as any,
        disciplines: dto.disciplines as any[],
        performanceDuration: dto.performanceDuration,
      },
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
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.group.delete({
      where: { id },
    });

    return { message: 'Group deleted successfully' };
  }

  // ============================================
  // ATHLETES MANAGEMENT
  // ============================================

  async addAthlete(groupId: string, dto: AddAthleteDto) {
    const group = await this.findOne(groupId);

    // Check if participant exists
    const participant = await this.prisma.participant.findUnique({
      where: { id: dto.participantId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Check if already added
    const existing = await this.prisma.groupAthlete.findUnique({
      where: {
        groupId_participantId: {
          groupId,
          participantId: dto.participantId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Athlete already in this group');
    }

    return this.prisma.groupAthlete.create({
      data: {
        groupId,
        participantId: dto.participantId,
        orderNumber: dto.orderNumber,
        streamId: dto.streamId,
      },
      include: {
        participant: true,
        stream: true,
      },
    });
  }

  async removeAthlete(groupId: string, athleteId: string) {
    const athlete = await this.prisma.groupAthlete.findUnique({
      where: { id: athleteId },
    });

    if (!athlete || athlete.groupId !== groupId) {
      throw new NotFoundException('Athlete not found in this group');
    }

    await this.prisma.groupAthlete.delete({
      where: { id: athleteId },
    });

    return { message: 'Athlete removed successfully' };
  }

  async reorderAthletes(groupId: string, orders: { athleteId: string; orderNumber: number }[]) {
    await this.findOne(groupId);

    // Update in transaction
    await this.prisma.$transaction(
      orders.map((order) =>
        this.prisma.groupAthlete.update({
          where: { id: order.athleteId },
          data: { orderNumber: order.orderNumber },
        })
      )
    );

    return { message: 'Athletes reordered successfully' };
  }

  // ============================================
  // STREAMS MANAGEMENT
  // ============================================

  async generateStreams(groupId: string, dto: GenerateStreamsDto) {
    const group = await this.findOne(groupId);

    const athletesCount = group.athletes.length;

    if (athletesCount === 0) {
      throw new BadRequestException('No athletes in group');
    }

    // Delete existing streams
    await this.prisma.stream.deleteMany({
      where: { groupId },
    });

    // Calculate number of streams
    const streamsCount = Math.ceil(athletesCount / dto.athletesPerStream);

    // Create streams
    const streams = [];
    for (let i = 0; i < streamsCount; i++) {
      const streamName = dto.streamNames?.[i] || String.fromCharCode(65 + i); // A, B, C, ...

      const stream = await this.prisma.stream.create({
        data: {
          groupId,
          name: streamName,
          number: i + 1,
          minAthletes: dto.minAthletes,
          maxAthletes: dto.athletesPerStream,
        },
      });

      streams.push(stream);
    }

    // Assign athletes to streams
    const athletes = group.athletes;
    for (let i = 0; i < athletes.length; i++) {
      const streamIndex = Math.floor(i / dto.athletesPerStream);
      const stream = streams[streamIndex];

      await this.prisma.groupAthlete.update({
        where: { id: athletes[i].id },
        data: { streamId: stream.id },
      });
    }

    return streams;
  }

  async deleteStreams(groupId: string) {
    await this.findOne(groupId);

    // Remove streamId from all athletes
    await this.prisma.groupAthlete.updateMany({
      where: { groupId },
      data: { streamId: null },
    });

    // Delete streams
    await this.prisma.stream.deleteMany({
      where: { groupId },
    });

    return { message: 'Streams deleted successfully' };
  }

  // ============================================
  // DRAW (ЖЕРЕБЬЁВКА)
  // ============================================

  async performDraw(groupId: string, dto: DrawDto, userId?: string) {
    const group = await this.findOne(groupId);

    if (group.athletes.length === 0) {
      throw new BadRequestException('No athletes in group');
    }

    let athletes = [...group.athletes];
    let result: any[];

    switch (dto.strategy) {
      case 'RANDOM':
        result = this.shuffleArray(athletes);
        break;

      case 'BY_CLUB':
        result = this.drawByClub(athletes);
        break;

      case 'SNAKE':
        result = this.drawSnake(athletes);
        break;

      case 'REVERSE_SNAKE':
        result = this.drawReverseSnake(athletes);
        break;

      default:
        throw new BadRequestException('Invalid draw strategy');
    }

    // Update order numbers
    await this.prisma.$transaction(
      result.map((athlete, index) =>
        this.prisma.groupAthlete.update({
          where: { id: athlete.id },
          data: { orderNumber: index + 1 },
        })
      )
    );

    // Save draw history
    await this.prisma.drawHistory.create({
      data: {
        groupId,
        strategy: dto.strategy as any,
        athletesCount: athletes.length,
        result: result.map((a, i) => ({
          athleteId: a.id,
          participantId: a.participantId,
          orderNumber: i + 1,
        })),
        performedBy: userId,
      },
    });

    return {
      strategy: dto.strategy,
      athletesCount: result.length,
      result: result.map((a, i) => ({
        ...a,
        orderNumber: i + 1,
      })),
    };
  }

  private shuffleArray(array: any[]): any[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private drawByClub(athletes: any[]): any[] {
    // Group by club
    const byClub = athletes.reduce((acc, athlete) => {
      const club = athlete.participant.club;
      if (!acc[club]) acc[club] = [];
      acc[club].push(athlete);
      return acc;
    }, {});

    // Shuffle within each club
    const clubArrays = Object.values(byClub).map((club: any) => this.shuffleArray(club));

    // Interleave clubs
    const result = [];
    let maxLength = Math.max(...clubArrays.map((c: any) => c.length));

    for (let i = 0; i < maxLength; i++) {
      for (const club of clubArrays) {
        if (club[i]) {
          result.push(club[i]);
        }
      }
    }

    return result;
  }

  private drawSnake(athletes: any[]): any[] {
    // Simple snake pattern (already ordered)
    return athletes;
  }

  private drawReverseSnake(athletes: any[]): any[] {
    return [...athletes].reverse();
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatistics(groupId: string) {
    const group = await this.findOne(groupId);

    return {
      totalAthletes: group.athletes.length,
      streamsCount: group.streams.length,
      athletesPerStream: group.streams.map((s) => ({
        streamName: s.name,
        count: s.athletes.length,
      })),
      disciplines: group.disciplines,
      estimatedDuration: group.athletes.length * group.performanceDuration * group.disciplines.length,
    };
  }
}
