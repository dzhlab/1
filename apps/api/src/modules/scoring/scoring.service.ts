import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitScoreDto, UpdateScoreDto } from './dto/score.dto';

@Injectable()
export class ScoringService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate final scores according to FIG 2025-2028 rules
   */
  private calculateScores(dto: SubmitScoreDto | UpdateScoreDto) {
    // D-Score: DB + DA
    // DB = average of DB1 and DB2 (or all 4 if provided)
    const dbScores = [dto.db1, dto.db2];
    if (dto.db3 !== undefined && dto.db3 !== null) dbScores.push(dto.db3);
    if (dto.db4 !== undefined && dto.db4 !== null) dbScores.push(dto.db4);
    const db = dbScores.reduce((sum, s) => sum + s, 0) / dbScores.length;

    // DA = average of DA1 and DA2 (or all 4 if provided)
    const daScores = [dto.da1, dto.da2];
    if (dto.da3 !== undefined && dto.da3 !== null) daScores.push(dto.da3);
    if (dto.da4 !== undefined && dto.da4 !== null) daScores.push(dto.da4);
    const da = daScores.reduce((sum, s) => sum + s, 0) / daScores.length;

    const dScore = db + da;

    // E-Score: 10.0 - average of middle two scores (drop max and min)
    const eScores = [dto.e1, dto.e2, dto.e3, dto.e4].sort((a, b) => a - b);
    const eDeduction = (eScores[1] + eScores[2]) / 2; // Middle two scores
    const eScore = 10.0 - eDeduction;

    // A-Score: 10.0 - average of middle two scores (drop max and min)
    const aScores = [dto.a1, dto.a2, dto.a3, dto.a4].sort((a, b) => a - b);
    const aDeduction = (aScores[1] + aScores[2]) / 2; // Middle two scores
    const aScore = 10.0 - aDeduction;

    // Total Score = D + E + A - Penalties
    const penalties = dto.penalties || 0;
    const totalScore = dScore + eScore + aScore - penalties;

    return {
      dScore,
      eScore,
      aScore,
      totalScore: Math.max(0, totalScore), // Не может быть отрицательным
    };
  }

  async submitScore(dto: SubmitScoreDto) {
    const { dScore, eScore, aScore, totalScore } = this.calculateScores(dto);

    // Check if score already exists for this combination
    const existing = await this.prisma.score.findUnique({
      where: {
        competitionId_participantId_discipline: {
          competitionId: dto.competitionId,
          participantId: dto.participantId,
          discipline: dto.discipline as any,
        },
      },
    });

    if (existing) {
      // Update existing score
      return this.prisma.score.update({
        where: { id: existing.id },
        data: {
          // D-бригада (DB)
          db1: new Prisma.Decimal(dto.db1),
          db2: new Prisma.Decimal(dto.db2),
          db3: dto.db3 !== undefined ? new Prisma.Decimal(dto.db3) : null,
          db4: dto.db4 !== undefined ? new Prisma.Decimal(dto.db4) : null,

          // D-бригада (DA)
          da1: new Prisma.Decimal(dto.da1),
          da2: new Prisma.Decimal(dto.da2),
          da3: dto.da3 !== undefined ? new Prisma.Decimal(dto.da3) : null,
          da4: dto.da4 !== undefined ? new Prisma.Decimal(dto.da4) : null,

          // E-бригада
          e1: new Prisma.Decimal(dto.e1),
          e2: new Prisma.Decimal(dto.e2),
          e3: new Prisma.Decimal(dto.e3),
          e4: new Prisma.Decimal(dto.e4),

          // A-бригада
          a1: new Prisma.Decimal(dto.a1),
          a2: new Prisma.Decimal(dto.a2),
          a3: new Prisma.Decimal(dto.a3),
          a4: new Prisma.Decimal(dto.a4),

          // Штрафы
          penalties: new Prisma.Decimal(dto.penalties || 0),

          // Итоговые значения
          dScore: new Prisma.Decimal(dScore),
          eScore: new Prisma.Decimal(eScore),
          aScore: new Prisma.Decimal(aScore),
          totalScore: new Prisma.Decimal(totalScore),

          judgeId: dto.judgeId,
        },
        include: {
          participant: true,
          competition: true,
        },
      });
    }

    // Create new score
    return this.prisma.score.create({
      data: {
        competitionId: dto.competitionId,
        participantId: dto.participantId,
        discipline: dto.discipline as any,

        // D-бригада (DB)
        db1: new Prisma.Decimal(dto.db1),
        db2: new Prisma.Decimal(dto.db2),
        db3: dto.db3 !== undefined ? new Prisma.Decimal(dto.db3) : null,
        db4: dto.db4 !== undefined ? new Prisma.Decimal(dto.db4) : null,

        // D-бригада (DA)
        da1: new Prisma.Decimal(dto.da1),
        da2: new Prisma.Decimal(dto.da2),
        da3: dto.da3 !== undefined ? new Prisma.Decimal(dto.da3) : null,
        da4: dto.da4 !== undefined ? new Prisma.Decimal(dto.da4) : null,

        // E-бригада
        e1: new Prisma.Decimal(dto.e1),
        e2: new Prisma.Decimal(dto.e2),
        e3: new Prisma.Decimal(dto.e3),
        e4: new Prisma.Decimal(dto.e4),

        // A-бригада
        a1: new Prisma.Decimal(dto.a1),
        a2: new Prisma.Decimal(dto.a2),
        a3: new Prisma.Decimal(dto.a3),
        a4: new Prisma.Decimal(dto.a4),

        // Штрафы
        penalties: new Prisma.Decimal(dto.penalties || 0),

        // Итоговые значения
        dScore: new Prisma.Decimal(dScore),
        eScore: new Prisma.Decimal(eScore),
        aScore: new Prisma.Decimal(aScore),
        totalScore: new Prisma.Decimal(totalScore),

        judgeId: dto.judgeId,
      },
      include: {
        participant: true,
        competition: true,
      },
    });
  }

  async getScore(id: string) {
    const score = await this.prisma.score.findUnique({
      where: { id },
      include: {
        participant: true,
        competition: true,
        judge: true,
      },
    });

    if (!score) {
      throw new NotFoundException(`Score with ID ${id} not found`);
    }

    return score;
  }

  async getCompetitionScores(competitionId: string, discipline?: string) {
    const where: any = { competitionId };

    if (discipline) {
      where.discipline = discipline;
    }

    return this.prisma.score.findMany({
      where,
      include: {
        participant: true,
      },
      orderBy: {
        totalScore: 'desc',
      },
    });
  }

  async getParticipantScores(participantId: string) {
    return this.prisma.score.findMany({
      where: { participantId },
      include: {
        competition: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteScore(id: string) {
    await this.getScore(id);

    await this.prisma.score.delete({
      where: { id },
    });

    return { message: 'Score deleted successfully' };
  }

  /**
   * Get results with ranking for a competition
   */
  async getResults(competitionId: string) {
    const scores = await this.prisma.score.findMany({
      where: { competitionId },
      include: {
        participant: true,
      },
    });

    // Group by participant
    const participantScores = scores.reduce((acc, score) => {
      const pid = score.participantId;
      if (!acc[pid]) {
        acc[pid] = {
          participant: score.participant,
          scores: [],
          totalScore: 0,
          avgD: 0,
          avgE: 0,
          avgA: 0,
        };
      }
      acc[pid].scores.push(score);
      return acc;
    }, {} as any);

    // Calculate totals and averages
    const results = Object.values(participantScores).map((ps: any) => {
      const totalScore = ps.scores.reduce((sum, s) => sum + Number(s.totalScore), 0);
      const count = ps.scores.length;

      const avgD = ps.scores.reduce((sum, s) => sum + Number(s.dScore), 0) / count;
      const avgE = ps.scores.reduce((sum, s) => sum + Number(s.eScore), 0) / count;
      const avgA = ps.scores.reduce((sum, s) => sum + Number(s.aScore), 0) / count;

      return {
        participant: ps.participant,
        scores: ps.scores,
        totalScore,
        avgD,
        avgE,
        avgA,
      };
    });

    // Sort by total score descending
    results.sort((a, b) => b.totalScore - a.totalScore);

    // Add rankings
    return results.map((result, index) => ({
      rank: index + 1,
      ...result,
    }));
  }

  /**
   * Get podium (top 3) for a competition
   */
  async getPodium(competitionId: string) {
    const results = await this.getResults(competitionId);
    return results.slice(0, 3);
  }
}
