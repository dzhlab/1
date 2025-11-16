// apps/api/src/modules/ranking/ranking.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TiebreakRule, RankingSkip, DCalculation } from '@prisma/client';

export interface ParticipantResult {
  participantId: string;
  participant: any;
  scores: any[];
  totalScore: number;
  avgD: number;
  avgE: number;
  avgA: number;
  rank?: number;
}

export interface RankingSettings {
  tiebreakRule: TiebreakRule;
  rankingSkip: RankingSkip;
  dCalculation: DCalculation;
}

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Основная функция ранжирования результатов соревнования
   */
  async calculateRanking(competitionId: string): Promise<ParticipantResult[]> {
    // 1. Получить соревнование с настройками
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        scores: {
          include: {
            participant: true,
          },
        },
      },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    // 2. Сгруппировать оценки по участникам
    const participantResults = this.groupScoresByParticipant(competition.scores);

    // 3. Применить ранжирование
    const rankedResults = this.rankResults(participantResults, {
      tiebreakRule: competition.tiebreakRule,
      rankingSkip: competition.rankingSkip,
      dCalculation: competition.dCalculation,
    });

    return rankedResults;
  }

  /**
   * Группировка оценок по участникам и расчет средних значений
   */
  private groupScoresByParticipant(scores: any[]): ParticipantResult[] {
    const grouped = new Map<string, ParticipantResult>();

    for (const score of scores) {
      if (!grouped.has(score.participantId)) {
        grouped.set(score.participantId, {
          participantId: score.participantId,
          participant: score.participant,
          scores: [],
          totalScore: 0,
          avgD: 0,
          avgE: 0,
          avgA: 0,
        });
      }

      const result = grouped.get(score.participantId)!;
      result.scores.push(score);
      result.totalScore += this.toNumber(score.totalScore);
    }

    // Рассчитать средние значения компонентов
    for (const result of grouped.values()) {
      const { avgD, avgE, avgA } = this.calculateAverageComponents(result.scores);
      result.avgD = avgD;
      result.avgE = avgE;
      result.avgA = avgA;
    }

    return Array.from(grouped.values());
  }

  /**
   * Применение алгоритма ранжирования
   */
  private rankResults(
    results: ParticipantResult[],
    settings: RankingSettings,
  ): ParticipantResult[] {
    // Сортировка по общему баллу (от большего к меньшему)
    const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);

    let currentRank = 1;
    let sameScoreCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      if (i === 0) {
        // Первый участник всегда получает место 1
        current.rank = currentRank;
      } else {
        const previous = sorted[i - 1];

        // Проверка на совпадение оценок (с допуском 0.001)
        if (Math.abs(current.totalScore - previous.totalScore) < 0.001) {
          // Оценки совпадают
          if (settings.tiebreakRule === TiebreakRule.COMPONENTS) {
            // Проверяем компоненты E > A > D
            const comparison = this.compareComponents(current, previous);

            if (comparison === 0) {
              // Компоненты тоже совпадают - делим место
              current.rank = previous.rank;
              sameScoreCount++;
            } else if (comparison > 0) {
              // Текущий результат лучше - присваиваем следующее место
              if (settings.rankingSkip === RankingSkip.SKIP) {
                currentRank = i + 1;
              } else {
                currentRank = previous.rank! + 1;
              }
              current.rank = currentRank;
              sameScoreCount = 0;
            } else {
              // Текущий результат хуже - делим место
              current.rank = previous.rank;
              sameScoreCount++;
            }
          } else {
            // Просто делим место
            current.rank = previous.rank;
            sameScoreCount++;
          }
        } else {
          // Оценки разные
          if (settings.rankingSkip === RankingSkip.SKIP && sameScoreCount > 0) {
            // Пропускаем позиции (1-1-3)
            currentRank = i + 1;
          } else {
            // Не пропускаем позиции (1-1-2)
            currentRank = previous.rank! + sameScoreCount + 1;
          }
          current.rank = currentRank;
          sameScoreCount = 0;
        }
      }
    }

    return sorted;
  }

  /**
   * Сравнение компонентов оценок (E > A > D)
   * @returns > 0 если a лучше, < 0 если b лучше, 0 если равны
   */
  private compareComponents(a: ParticipantResult, b: ParticipantResult): number {
    const tolerance = 0.001;

    // Сравниваем E (Execution) - больше = лучше
    if (Math.abs(a.avgE - b.avgE) > tolerance) {
      return a.avgE - b.avgE;
    }

    // Если E равны, сравниваем A (Artistry) - больше = лучше
    if (Math.abs(a.avgA - b.avgA) > tolerance) {
      return a.avgA - b.avgA;
    }

    // Если A равны, сравниваем D (Difficulty) - больше = лучше
    if (Math.abs(a.avgD - b.avgD) > tolerance) {
      return a.avgD - b.avgD;
    }

    // Все компоненты равны
    return 0;
  }

  /**
   * Расчет средних значений компонентов для всех выступлений участника
   */
  private calculateAverageComponents(scores: any[]): {
    avgD: number;
    avgE: number;
    avgA: number;
  } {
    if (scores.length === 0) {
      return { avgD: 0, avgE: 0, avgA: 0 };
    }

    const totals = scores.reduce(
      (acc, score) => ({
        D: acc.D + this.toNumber(score.dScore),
        E: acc.E + this.toNumber(score.eScore),
        A: acc.A + this.toNumber(score.aScore),
      }),
      { D: 0, E: 0, A: 0 },
    );

    return {
      avgD: totals.D / scores.length,
      avgE: totals.E / scores.length,
      avgA: totals.A / scores.length,
    };
  }

  /**
   * Расчет D-оценки с учетом настроек соревнования
   */
  calculateDScore(
    db1: number,
    db2: number,
    da1: number,
    da2: number,
    dCalculation: DCalculation,
  ): number {
    const dbAvg = (db1 + db2) / 2;
    const daAvg = (da1 + da2) / 2;

    if (dCalculation === DCalculation.SUM) {
      // Сумма двух бригад: (DB1+DB2) + (DA1+DA2)
      return db1 + db2 + da1 + da2;
    }

    // Российское правило (по умолчанию): ((DB1+DB2) + (DA1+DA2)) / 2
    return dbAvg + daAvg;
  }

  /**
   * Расчет E-оценки (средняя после отбрасывания max и min)
   */
  calculateEScore(e1: number, e2: number, e3: number, e4: number): number {
    const deductions = [e1, e2, e3, e4];
    const sorted = deductions.sort((a, b) => a - b);

    // Отбрасываем min и max, берем среднее из двух средних
    const avgDeduction = (sorted[1] + sorted[2]) / 2;

    // E-оценка = 10.0 - средний вычет
    return Math.max(0, 10.0 - avgDeduction);
  }

  /**
   * Расчет A-оценки (средняя после отбрасывания max и min)
   */
  calculateAScore(a1: number, a2: number, a3: number, a4: number): number {
    const scores = [a1, a2, a3, a4];
    const sorted = scores.sort((a, b) => a - b);

    // Отбрасываем min и max, берем среднее из двух средних
    return (sorted[1] + sorted[2]) / 2;
  }

  /**
   * Полный расчет итоговой оценки
   */
  calculateTotalScore(scoreData: {
    db1: number;
    db2: number;
    da1: number;
    da2: number;
    e1: number;
    e2: number;
    e3: number;
    e4: number;
    a1: number;
    a2: number;
    a3: number;
    a4: number;
    penalties: number;
    dCalculation: DCalculation;
  }): {
    dScore: number;
    eScore: number;
    aScore: number;
    totalScore: number;
  } {
    const dScore = this.calculateDScore(
      scoreData.db1,
      scoreData.db2,
      scoreData.da1,
      scoreData.da2,
      scoreData.dCalculation,
    );

    const eScore = this.calculateEScore(
      scoreData.e1,
      scoreData.e2,
      scoreData.e3,
      scoreData.e4,
    );

    const aScore = this.calculateAScore(
      scoreData.a1,
      scoreData.a2,
      scoreData.a3,
      scoreData.a4,
    );

    const totalScore = Math.max(0, dScore + eScore + aScore - scoreData.penalties);

    return {
      dScore,
      eScore,
      aScore,
      totalScore,
    };
  }

  /**
   * Конвертация Decimal в number
   */
  private toNumber(value: Decimal | number): number {
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    return value;
  }
}
