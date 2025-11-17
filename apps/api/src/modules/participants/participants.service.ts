import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParticipantDto, UpdateParticipantDto } from './dto/create-participant.dto';

@Injectable()
export class ParticipantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateParticipantDto) {
    return this.prisma.participant.create({
      data: {
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        age: dto.age,
        club: dto.club,
        city: dto.city,
        coach: dto.coach,
        rank: dto.rank as any,
        category: dto.category as any,
      },
    });
  }

  async findAll(filters?: { category?: string; city?: string; club?: string }) {
    const where: any = {};

    if (filters?.category) where.category = filters.category;
    if (filters?.city) where.city = filters.city;
    if (filters?.club) where.club = { contains: filters.club, mode: 'insensitive' };

    return this.prisma.participant.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: {
        _count: {
          select: {
            competitions: true,
            scores: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id },
      include: {
        competitions: {
          include: {
            competition: true,
          },
        },
        scores: {
          include: {
            competition: true,
          },
        },
        groupAthletes: {
          include: {
            group: true,
            stream: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException(`Participant with ID ${id} not found`);
    }

    return participant;
  }

  async update(id: string, dto: UpdateParticipantDto) {
    await this.findOne(id);

    return this.prisma.participant.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        age: dto.age,
        club: dto.club,
        city: dto.city,
        coach: dto.coach,
        rank: dto.rank as any,
        category: dto.category as any,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.participant.delete({
      where: { id },
    });

    return { message: 'Participant deleted successfully' };
  }

  async addToCompetition(participantId: string, competitionId: string) {
    await this.findOne(participantId);

    return this.prisma.competitionParticipant.create({
      data: {
        participantId,
        competitionId,
      },
    });
  }

  async removeFromCompetition(participantId: string, competitionId: string) {
    return this.prisma.competitionParticipant.delete({
      where: {
        competitionId_participantId: {
          competitionId,
          participantId,
        },
      },
    });
  }
}
