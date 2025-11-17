import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJudgeDto, UpdateJudgeDto, AssignJudgeToCompetitionDto } from './dto/judge.dto';

@Injectable()
export class JudgesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateJudgeDto) {
    return this.prisma.judge.create({
      data: {
        fullName: dto.fullName,
        city: dto.city,
        region: dto.region,
        category: dto.category as any,
        title: dto.title,
      },
    });
  }

  async findAll(search?: string) {
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.judge.findMany({
      where,
      include: {
        _count: {
          select: {
            competitions: true,
            scores: true,
            brigadeAssignments: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const judge = await this.prisma.judge.findUnique({
      where: { id },
      include: {
        competitions: {
          include: {
            competition: true,
          },
        },
        brigadeAssignments: {
          include: {
            brigade: true,
          },
        },
        scores: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!judge) {
      throw new NotFoundException(`Judge with ID ${id} not found`);
    }

    return judge;
  }

  async update(id: string, dto: UpdateJudgeDto) {
    await this.findOne(id);

    return this.prisma.judge.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        city: dto.city,
        region: dto.region,
        category: dto.category as any,
        title: dto.title,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.judge.delete({
      where: { id },
    });

    return { message: 'Judge deleted successfully' };
  }

  // ============================================
  // COMPETITION ASSIGNMENTS
  // ============================================

  async assignToCompetition(competitionId: string, dto: AssignJudgeToCompetitionDto) {
    // Check if judge exists
    await this.findOne(dto.judgeId);

    // Check if competition exists
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    // Get max position if not provided
    let position = dto.position;
    if (!position) {
      const maxPosition = await this.prisma.competitionJudge.findFirst({
        where: { competitionId },
        orderBy: { position: 'desc' },
      });
      position = (maxPosition?.position || 0) + 1;
    }

    return this.prisma.competitionJudge.create({
      data: {
        competitionId,
        judgeId: dto.judgeId,
        brigade: dto.brigade as any,
        position,
      },
      include: {
        judge: true,
      },
    });
  }

  async removeFromCompetition(competitionId: string, judgeId: string) {
    const assignment = await this.prisma.competitionJudge.findUnique({
      where: {
        competitionId_judgeId: {
          competitionId,
          judgeId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Judge assignment not found');
    }

    await this.prisma.competitionJudge.delete({
      where: {
        competitionId_judgeId: {
          competitionId,
          judgeId,
        },
      },
    });

    return { message: 'Judge removed from competition' };
  }

  async getCompetitionJudges(competitionId: string, brigade?: string) {
    const where: any = { competitionId };

    if (brigade) {
      where.brigade = brigade;
    }

    return this.prisma.competitionJudge.findMany({
      where,
      include: {
        judge: true,
      },
      orderBy: [
        { brigade: 'asc' },
        { position: 'asc' },
      ],
    });
  }

  async reorderJudges(
    competitionId: string,
    orders: { judgeId: string; position: number }[],
  ) {
    await this.prisma.$transaction(
      orders.map((order) =>
        this.prisma.competitionJudge.update({
          where: {
            competitionId_judgeId: {
              competitionId,
              judgeId: order.judgeId,
            },
          },
          data: { position: order.position },
        })
      )
    );

    return { message: 'Judges reordered successfully' };
  }
}
