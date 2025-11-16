// apps/api/src/modules/draw/draw.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

export enum DrawStrategy {
  RANDOM = 'random',
  BY_APPARATUS = 'by_apparatus',
  BY_SUBGROUP = 'by_subgroup',
  BY_GROUP = 'by_group',
}

export interface DrawResult {
  success: boolean;
  message: string;
  athletes: any[];
  before: any[];
  after: any[];
  timestamp: Date;
}

@Injectable()
export class DrawService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  /**
   * Выполнить жеребьёвку с заданной стратегией
   */
  async performDraw(
    groupId: string,
    strategy: DrawStrategy,
    options?: any,
  ): Promise<DrawResult> {
    const group = await this.groupsService.findOne(groupId);

    if (group.athletes.length === 0) {
      throw new BadRequestException('No athletes in group to draw');
    }

    // Сохраняем текущий порядок
    const beforeOrder = group.athletes.map((a) => ({
      athleteId: a.id,
      orderNumber: a.orderNumber,
    }));

    let shuffledAthletes: any[];

    // Выбираем стратегию
    switch (strategy) {
      case DrawStrategy.RANDOM:
        shuffledAthletes = this.shuffleRandom(group.athletes);
        break;

      case DrawStrategy.BY_APPARATUS:
        shuffledAthletes = this.shuffleByApparatus(
          group.athletes,
          group.apparatus,
        );
        break;

      case DrawStrategy.BY_SUBGROUP:
        shuffledAthletes = this.shuffleBySubgroup(
          group.athletes,
          group.subgroups,
        );
        break;

      case DrawStrategy.BY_GROUP:
        shuffledAthletes = this.shuffleByClub(group.athletes);
        break;

      default:
        throw new BadRequestException(`Unknown draw strategy: ${strategy}`);
    }

    // Обновляем порядковые номера в БД
    await this.updateAthletesOrder(shuffledAthletes);

    // Сохраняем новый порядок
    const afterOrder = shuffledAthletes.map((a) => ({
      athleteId: a.id,
      orderNumber: a.orderNumber,
    }));

    // Записываем в историю
    await this.saveDrawHistory(groupId, strategy, beforeOrder, afterOrder);

    // Логируем изменение
    await this.groupsService.logChange(
      groupId,
      'DRAW',
      'GROUP',
      groupId,
      undefined,
      { before: beforeOrder, after: afterOrder },
      { strategy },
    );

    return {
      success: true,
      message: `Draw completed using ${strategy} strategy`,
      athletes: shuffledAthletes,
      before: beforeOrder,
      after: afterOrder,
      timestamp: new Date(),
    };
  }

  /**
   * Случайная жеребьёвка (Fisher-Yates algorithm)
   */
  private shuffleRandom(athletes: any[]): any[] {
    const shuffled = [...athletes];

    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Обновляем orderNumber
    return shuffled.map((athlete, index) => ({
      ...athlete,
      orderNumber: index + 1,
    }));
  }

  /**
   * Жеребьёвка с учетом видов программ
   * Чередует виды программ
   */
  private shuffleByApparatus(athletes: any[], apparatus: any[]): any[] {
    // Группируем по видам программ
    const byApparatus = new Map<number, any[]>();

    athletes.forEach((athlete) => {
      const appNum = athlete.apparatusNumber || 0;
      if (!byApparatus.has(appNum)) {
        byApparatus.set(appNum, []);
      }
      byApparatus.get(appNum)!.push(athlete);
    });

    // Перемешиваем внутри каждого вида
    byApparatus.forEach((group, key) => {
      byApparatus.set(key, this.shuffleRandom(group));
    });

    // Чередуем виды программ
    const result: any[] = [];
    let index = 0;

    // Определяем количество проходов
    const maxLength = Math.max(...Array.from(byApparatus.values()).map((g) => g.length));

    for (let round = 0; round < maxLength; round++) {
      // Порядок видов программ из настроек группы
      apparatus.forEach((_, apparatusIndex) => {
        const apparatusNum = apparatusIndex + 1;
        const group = byApparatus.get(apparatusNum);

        if (group && group.length > 0) {
          const athlete = group.shift();
          if (athlete) {
            result.push({ ...athlete, orderNumber: ++index });
          }
        }
      });

      // Обрабатываем тех, у кого нет назначенного вида
      const noApparatus = byApparatus.get(0);
      if (noApparatus && noApparatus.length > 0) {
        const athlete = noApparatus.shift();
        if (athlete) {
          result.push({ ...athlete, orderNumber: ++index });
        }
      }
    }

    return result;
  }

  /**
   * Жеребьёвка по подгруппам
   * Распределяет спортсменов по подгруппам случайно
   */
  private shuffleBySubgroup(athletes: any[], subgroups: string[]): any[] {
    // Случайно перемешиваем спортсменов
    const shuffled = this.shuffleRandom(athletes);

    // Назначаем подгруппы циклично
    return shuffled.map((athlete, index) => ({
      ...athlete,
      subgroup: subgroups[index % subgroups.length],
      orderNumber: index + 1,
    }));
  }

  /**
   * Групповая жеребьёвка (по клубам)
   * Группирует по клубам, перемешивает клубы, затем внутри клубов
   */
  private shuffleByClub(athletes: any[]): any[] {
    // Группируем по клубам
    const byClub = new Map<string, any[]>();

    athletes.forEach((athlete) => {
      const club = athlete.club || 'Unknown';
      if (!byClub.has(club)) {
        byClub.set(club, []);
      }
      byClub.get(club)!.push(athlete);
    });

    // Получаем список клубов и перемешиваем
    const clubs = Array.from(byClub.keys());
    const shuffledClubs = this.shuffleArray(clubs);

    // Собираем результат
    const result: any[] = [];
    let index = 0;

    shuffledClubs.forEach((club) => {
      const clubAthletes = byClub.get(club)!;

      // Перемешиваем внутри клуба
      const shuffledClubAthletes = this.shuffleRandom(clubAthletes);

      shuffledClubAthletes.forEach((athlete) => {
        result.push({ ...athlete, orderNumber: ++index });
      });
    });

    return result;
  }

  /**
   * Вспомогательная функция для перемешивания массива
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Обновить порядковые номера спортсменов в БД
   */
  private async updateAthletesOrder(athletes: any[]): Promise<void> {
    // Используем транзакцию для атомарного обновления
    await this.prisma.$transaction(
      athletes.map((athlete) =>
        this.prisma.groupAthlete.update({
          where: { id: athlete.id },
          data: { orderNumber: athlete.orderNumber },
        }),
      ),
    );
  }

  /**
   * Сохранить историю жеребьёвки
   */
  private async saveDrawHistory(
    groupId: string,
    strategy: string,
    beforeOrder: any[],
    afterOrder: any[],
  ): Promise<void> {
    await this.prisma.drawHistory.create({
      data: {
        groupId,
        strategy,
        beforeOrder,
        afterOrder,
        athletesCount: beforeOrder.length,
      },
    });
  }

  /**
   * Получить историю жеребьёвок для группы
   */
  async getHistory(groupId: string) {
    return this.prisma.drawHistory.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Публичные методы для конкретных стратегий
   */
  async randomDraw(groupId: string): Promise<DrawResult> {
    return this.performDraw(groupId, DrawStrategy.RANDOM);
  }

  async apparatusDraw(groupId: string): Promise<DrawResult> {
    return this.performDraw(groupId, DrawStrategy.BY_APPARATUS);
  }

  async subgroupDraw(groupId: string): Promise<DrawResult> {
    return this.performDraw(groupId, DrawStrategy.BY_SUBGROUP);
  }

  async groupDraw(groupId: string): Promise<DrawResult> {
    return this.performDraw(groupId, DrawStrategy.BY_GROUP);
  }
}
