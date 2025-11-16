// apps/api/src/modules/judges/judges.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddJudgeDto, UpdateJudgeDto, CreateJudgeDto } from './dto';
import { Brigade } from '@prisma/client';
import * as ExcelJS from 'exceljs';

interface JudgeOrder {
  judgeId: string;
  position: number;
}

@Injectable()
export class JudgesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Создать нового судью в базе
   */
  async createJudge(dto: CreateJudgeDto) {
    return this.prisma.judge.create({
      data: dto,
    });
  }

  /**
   * Получить всех судей
   */
  async getAllJudges(search?: string) {
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
            { region: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    return this.prisma.judge.findMany({
      where,
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  /**
   * Получить судей соревнования
   */
  async getCompetitionJudges(competitionId: string) {
    return this.prisma.competitionJudge.findMany({
      where: { competitionId },
      include: {
        judge: true,
      },
      orderBy: {
        position: 'asc',
      },
    });
  }

  /**
   * Добавить судью к соревнованию
   */
  async addJudgeToCompetition(competitionId: string, dto: AddJudgeDto) {
    // Проверить существует ли соревнование
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundException(`Competition with ID ${competitionId} not found`);
    }

    // Проверить не добавлен ли уже этот судья
    const existing = await this.prisma.competitionJudge.findUnique({
      where: {
        competitionId_judgeId: {
          competitionId,
          judgeId: dto.judgeId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Judge already added to this competition');
    }

    // Получить максимальную позицию
    const maxPosition = await this.prisma.competitionJudge.findFirst({
      where: { competitionId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = maxPosition ? maxPosition.position + 1 : 0;

    // Добавить судью
    const competitionJudge = await this.prisma.competitionJudge.create({
      data: {
        competitionId,
        judgeId: dto.judgeId,
        brigade: dto.brigade || null,
        position,
      },
      include: {
        judge: true,
      },
    });

    return competitionJudge;
  }

  /**
   * Обновить судью в соревновании
   */
  async updateJudge(judgeId: string, dto: UpdateJudgeDto) {
    const competitionJudge = await this.prisma.competitionJudge.findUnique({
      where: { id: judgeId },
    });

    if (!competitionJudge) {
      throw new NotFoundException(`Competition judge with ID ${judgeId} not found`);
    }

    return this.prisma.competitionJudge.update({
      where: { id: judgeId },
      data: dto,
      include: {
        judge: true,
      },
    });
  }

  /**
   * Удалить судью из соревнования
   */
  async removeJudgeFromCompetition(competitionId: string, judgeId: string) {
    const competitionJudge = await this.prisma.competitionJudge.findUnique({
      where: {
        competitionId_judgeId: {
          competitionId,
          judgeId,
        },
      },
    });

    if (!competitionJudge) {
      throw new NotFoundException('Judge not found in this competition');
    }

    await this.prisma.competitionJudge.delete({
      where: { id: competitionJudge.id },
    });

    // Пересчитать позиции оставшихся судей
    await this.recalculatePositions(competitionId);

    return { success: true };
  }

  /**
   * Изменить порядок судей
   */
  async reorderJudges(competitionId: string, orders: JudgeOrder[]) {
    // Обновить позиции в транзакции
    await this.prisma.$transaction(
      orders.map((order) =>
        this.prisma.competitionJudge.updateMany({
          where: {
            competitionId,
            judgeId: order.judgeId,
          },
          data: {
            position: order.position,
          },
        }),
      ),
    );

    // Вернуть обновленный список
    return this.getCompetitionJudges(competitionId);
  }

  /**
   * Автоматически сформировать бригады D, E, A
   */
  async formBrigades(competitionId: string) {
    const judges = await this.prisma.competitionJudge.findMany({
      where: { competitionId },
      orderBy: { position: 'asc' },
    });

    if (judges.length === 0) {
      throw new BadRequestException('No judges in competition');
    }

    // Распределить по бригадам циклично: D, E, A, D, E, A...
    const brigades: Brigade[] = ['D', 'E', 'A'];

    const updates = judges.map((judge, index) => {
      const brigade = brigades[index % brigades.length];
      return this.prisma.competitionJudge.update({
        where: { id: judge.id },
        data: { brigade },
      });
    });

    await this.prisma.$transaction(updates);

    // Вернуть статистику
    const result = {
      total: judges.length,
      brigadeD: judges.filter((_, i) => i % 3 === 0).length,
      brigadeE: judges.filter((_, i) => i % 3 === 1).length,
      brigadeA: judges.filter((_, i) => i % 3 === 2).length,
    };

    return result;
  }

  /**
   * Импорт судей из Excel
   */
  async importFromExcel(competitionId: string, buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Excel file is empty');
    }

    const judges = [];
    const errors = [];

    // Начинаем со 2-й строки (1-я - заголовки)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Пропускаем заголовки

      try {
        const fullName = row.getCell(1).value?.toString().trim();
        const city = row.getCell(2).value?.toString().trim();
        const region = row.getCell(3).value?.toString().trim();
        const category = row.getCell(4).value?.toString().trim();
        const title = row.getCell(5).value?.toString().trim();

        if (!fullName || !city || !region || !category) {
          errors.push({
            row: rowNumber,
            error: 'Missing required fields',
          });
          return;
        }

        // Валидация категории
        const validCategories = ['THIRD', 'SECOND', 'FIRST', 'ALL_RUSSIAN', 'INTERNATIONAL'];
        if (!validCategories.includes(category.toUpperCase())) {
          errors.push({
            row: rowNumber,
            error: `Invalid category: ${category}`,
          });
          return;
        }

        judges.push({
          fullName,
          city,
          region,
          category: category.toUpperCase(),
          title: title || null,
        });
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
        });
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Import failed with errors',
        errors,
      });
    }

    // Создать или найти судей и добавить к соревнованию
    const addedJudges = [];

    for (const judgeData of judges) {
      // Найти или создать судью
      let judge = await this.prisma.judge.findFirst({
        where: {
          fullName: judgeData.fullName,
          city: judgeData.city,
        },
      });

      if (!judge) {
        judge = await this.prisma.judge.create({
          data: judgeData,
        });
      }

      // Добавить к соревнованию если еще не добавлен
      const existing = await this.prisma.competitionJudge.findUnique({
        where: {
          competitionId_judgeId: {
            competitionId,
            judgeId: judge.id,
          },
        },
      });

      if (!existing) {
        const maxPosition = await this.prisma.competitionJudge.findFirst({
          where: { competitionId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });

        const position = maxPosition ? maxPosition.position + 1 : addedJudges.length;

        const competitionJudge = await this.prisma.competitionJudge.create({
          data: {
            competitionId,
            judgeId: judge.id,
            position,
            brigade: null,
          },
          include: {
            judge: true,
          },
        });

        addedJudges.push(competitionJudge);
      }
    }

    return {
      imported: addedJudges.length,
      skipped: judges.length - addedJudges.length,
      judges: addedJudges,
    };
  }

  /**
   * Экспорт судей в Excel
   */
  async exportToExcel(competitionId: string): Promise<Buffer> {
    const judges = await this.getCompetitionJudges(competitionId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Судьи');

    // Заголовки
    worksheet.columns = [
      { header: 'ФИО', key: 'fullName', width: 30 },
      { header: 'Город', key: 'city', width: 20 },
      { header: 'Регион', key: 'region', width: 20 },
      { header: 'Категория', key: 'category', width: 15 },
      { header: 'Звание', key: 'title', width: 15 },
      { header: 'Бригада', key: 'brigade', width: 10 },
      { header: 'Позиция', key: 'position', width: 10 },
    ];

    // Стиль заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Данные
    judges.forEach((cj) => {
      worksheet.addRow({
        fullName: cj.judge.fullName,
        city: cj.judge.city,
        region: cj.judge.region,
        category: this.translateCategory(cj.judge.category),
        title: cj.judge.title || '',
        brigade: cj.brigade || '-',
        position: cj.position + 1,
      });
    });

    // Автоматическая ширина колонок
    worksheet.columns.forEach((column) => {
      if (column.values) {
        const maxLength = Math.max(
          ...column.values.map((v) => (v ? v.toString().length : 0)),
        );
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // Создать буфер
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Пересчитать позиции после удаления
   */
  private async recalculatePositions(competitionId: string) {
    const judges = await this.prisma.competitionJudge.findMany({
      where: { competitionId },
      orderBy: { position: 'asc' },
    });

    const updates = judges.map((judge, index) =>
      this.prisma.competitionJudge.update({
        where: { id: judge.id },
        data: { position: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  /**
   * Перевод категории на русский
   */
  private translateCategory(category: string): string {
    const translations = {
      THIRD: '3 категория',
      SECOND: '2 категория',
      FIRST: '1 категория',
      ALL_RUSSIAN: 'Всероссийская',
      INTERNATIONAL: 'Международная',
    };
    return translations[category] || category;
  }
}
