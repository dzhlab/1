// apps/api/src/modules/excel/excel.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { AthletesService } from '../athletes/athletes.service';
import * as ExcelJS from 'exceljs';

export interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successful: number;
  failed: number;
  errors: ImportError[];
  athletes: any[];
}

export interface ExportOptions {
  includeStreams?: boolean;
  includeApparatus?: boolean;
  groupBy?: 'stream' | 'club' | 'rank';
}

@Injectable()
export class ExcelService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
    private athletesService: AthletesService,
  ) {}

  /**
   * Импортировать участников из Excel
   */
  async importAthletes(
    groupId: string,
    buffer: Buffer,
    progressCallback?: (progress: ImportProgress) => void,
  ): Promise<ImportResult> {
    const group = await this.groupsService.findOne(groupId);

    // Создаем запись о задаче импорта
    const importJob = await this.prisma.importJob.create({
      data: {
        groupId,
        status: 'PROCESSING',
        totalRows: 0,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
      },
    });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Excel file is empty');
      }

      const errors: ImportError[] = [];
      const athletes: any[] = [];
      const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];

      // Обновляем общее количество строк
      await this.prisma.importJob.update({
        where: { id: importJob.id },
        data: { totalRows: rows.length },
      });

      let processed = 0;
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 потому что строка 1 - заголовок, индексация с 0

        try {
          // Извлекаем данные из строки
          const athleteData = {
            fullName: this.getCellValue(row, 1),
            birthDate: this.getCellValue(row, 2),
            city: this.getCellValue(row, 3),
            club: this.getCellValue(row, 4),
            coach: this.getCellValue(row, 5),
            rank: this.getCellValue(row, 6),
            apparatusNumber: this.getCellValue(row, 7),
            subgroup: this.getCellValue(row, 8),
          };

          // Валидация данных
          const validation = this.athletesService.validateAthlete(athleteData);
          if (!validation.valid) {
            validation.errors.forEach((error) => {
              errors.push({
                row: rowNumber,
                field: 'validation',
                value: athleteData,
                message: error,
              });
            });
            failed++;
          } else {
            // Создаем участника
            const athlete = await this.athletesService.create(groupId, athleteData);
            athletes.push(athlete);
            successful++;
          }
        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'unknown',
            value: null,
            message: error.message,
          });
          failed++;
        }

        processed++;

        // Обновляем прогресс
        await this.prisma.importJob.update({
          where: { id: importJob.id },
          data: {
            processedRows: processed,
            successfulRows: successful,
            failedRows: failed,
          },
        });

        // Вызываем callback прогресса
        if (progressCallback) {
          progressCallback({
            total: rows.length,
            processed,
            successful,
            failed,
            errors,
          });
        }
      }

      // Обновляем статус задачи
      await this.prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          errors: errors.length > 0 ? JSON.stringify(errors) : null,
        },
      });

      // Логируем изменение
      await this.groupsService.logChange(
        groupId,
        'IMPORT',
        'GROUP',
        groupId,
        { athletesCount: group.athletes.length },
        { athletesCount: group.athletes.length + successful },
        { importJobId: importJob.id, successful, failed },
      );

      return {
        success: failed === 0,
        totalRows: rows.length,
        successful,
        failed,
        errors,
        athletes,
      };
    } catch (error) {
      // Обновляем статус задачи при ошибке
      await this.prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: 'FAILED',
          errors: JSON.stringify([{ message: error.message }]),
        },
      });

      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  /**
   * Экспортировать участников в Excel
   */
  async exportAthletes(groupId: string, options: ExportOptions = {}): Promise<Buffer> {
    const group = await this.groupsService.findOne(groupId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gymnastics Competition Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Участники');

    // Определяем столбцы
    const columns: any[] = [
      { header: '№', key: 'orderNumber', width: 8 },
      { header: 'ФИО спортсмена', key: 'fullName', width: 30 },
      { header: 'Дата рождения', key: 'birthDate', width: 15 },
      { header: 'Город', key: 'city', width: 20 },
      { header: 'Клуб', key: 'club', width: 30 },
      { header: 'Тренер', key: 'coach', width: 30 },
      { header: 'Разряд', key: 'rank', width: 15 },
    ];

    if (options.includeStreams) {
      columns.push(
        { header: 'Поток', key: 'streamNumber', width: 10 },
        { header: 'Время потока', key: 'streamTime', width: 12 },
        { header: 'Подгруппа', key: 'subgroup', width: 12 },
      );
    }

    if (options.includeApparatus) {
      columns.push({ header: 'Вид программы', key: 'apparatusNumber', width: 15 });
    }

    worksheet.columns = columns;

    // Стилизация заголовков
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007AFF' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;

    // Сортируем участников
    let athletes = [...group.athletes];
    if (options.groupBy === 'stream') {
      athletes.sort((a, b) => {
        if (a.streamId && b.streamId) {
          const streamA = group.streams.find((s) => s.id === a.streamId);
          const streamB = group.streams.find((s) => s.id === b.streamId);
          if (streamA && streamB) {
            return streamA.orderNumber - streamB.orderNumber;
          }
        }
        return a.orderNumber - b.orderNumber;
      });
    } else if (options.groupBy === 'club') {
      athletes.sort((a, b) => a.club.localeCompare(b.club, 'ru'));
    } else if (options.groupBy === 'rank') {
      athletes.sort((a, b) => a.rank.localeCompare(b.rank));
    }

    // Добавляем данные
    athletes.forEach((athlete, index) => {
      const stream = athlete.streamId
        ? group.streams.find((s) => s.id === athlete.streamId)
        : null;

      const rowData: any = {
        orderNumber: index + 1,
        fullName: athlete.fullName,
        birthDate: this.formatDate(athlete.birthDate),
        city: athlete.city,
        club: athlete.club,
        coach: athlete.coach,
        rank: this.translateRank(athlete.rank),
      };

      if (options.includeStreams) {
        rowData.streamNumber = stream ? stream.orderNumber : '';
        rowData.streamTime = athlete.streamTime || '';
        rowData.subgroup = athlete.subgroup || '';
      }

      if (options.includeApparatus) {
        rowData.apparatusNumber = athlete.apparatusNumber
          ? this.translateApparatus(athlete.apparatusNumber, group.apparatus)
          : '';
      }

      const row = worksheet.addRow(rowData);

      // Чередование цветов строк
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      }

      // Выравнивание
      row.alignment = { vertical: 'middle' };
      row.getCell('orderNumber').alignment = { horizontal: 'center' };
      row.getCell('birthDate').alignment = { horizontal: 'center' };
    });

    // Добавляем границы
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Добавляем информацию о группе в отдельный лист
    const infoSheet = workbook.addWorksheet('Информация');
    infoSheet.columns = [
      { header: 'Параметр', key: 'param', width: 30 },
      { header: 'Значение', key: 'value', width: 50 },
    ];

    infoSheet.addRow({ param: 'Название группы', value: group.name });
    infoSheet.addRow({ param: 'Дисциплина', value: this.translateDiscipline(group.discipline) });
    infoSheet.addRow({ param: 'Возрастная категория', value: this.translateAgeCategory(group.ageCategory) });
    infoSheet.addRow({ param: 'Программа', value: this.translateProgram(group.program) });
    infoSheet.addRow({ param: 'Тип выступления', value: this.translatePerformanceType(group.performanceType) });
    infoSheet.addRow({ param: 'Всего участников', value: athletes.length });
    infoSheet.addRow({ param: 'Всего потоков', value: group.streams.length });
    infoSheet.addRow({ param: 'Длительность выступления (сек)', value: group.performanceDuration });

    // Генерируем буфер
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Скачать шаблон Excel для импорта
   */
  async getImportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Шаблон');

    worksheet.columns = [
      { header: 'ФИО спортсмена', key: 'fullName', width: 30 },
      { header: 'Дата рождения (ДД.ММ.ГГГГ)', key: 'birthDate', width: 25 },
      { header: 'Город', key: 'city', width: 20 },
      { header: 'Клуб', key: 'club', width: 30 },
      { header: 'Тренер', key: 'coach', width: 30 },
      { header: 'Разряд', key: 'rank', width: 15 },
      { header: 'Вид программы (1-6)', key: 'apparatusNumber', width: 20 },
      { header: 'Подгруппа', key: 'subgroup', width: 12 },
    ];

    // Стилизация заголовков
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007AFF' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Добавляем примеры
    worksheet.addRow({
      fullName: 'Иванова Анна Сергеевна',
      birthDate: '15.03.2010',
      city: 'Москва',
      club: 'СДЮСШОР №1',
      coach: 'Петрова Ольга Ивановна',
      rank: 'КМС',
      apparatusNumber: '1',
      subgroup: 'A',
    });

    worksheet.addRow({
      fullName: 'Смирнова Мария Дмитриевна',
      birthDate: '22.07.2011',
      city: 'Санкт-Петербург',
      club: 'Спортивная школа Олимпия',
      coach: 'Кузнецова Елена Владимировна',
      rank: '1 разряд',
      apparatusNumber: '2',
      subgroup: 'B',
    });

    // Инструкции на отдельном листе
    const instructionsSheet = workbook.addWorksheet('Инструкция');
    instructionsSheet.columns = [{ header: 'Инструкция по заполнению', key: 'text', width: 80 }];

    instructionsSheet.addRow({ text: '1. ФИО спортсмена - полное ФИО (обязательно, минимум 3 символа)' });
    instructionsSheet.addRow({ text: '2. Дата рождения - в формате ДД.ММ.ГГГГ, например 15.03.2010' });
    instructionsSheet.addRow({ text: '3. Город - название города (обязательно, минимум 2 символа)' });
    instructionsSheet.addRow({ text: '4. Клуб - название клуба или школы (обязательно, минимум 2 символа)' });
    instructionsSheet.addRow({ text: '5. Тренер - ФИО тренера (обязательно, минимум 3 символа)' });
    instructionsSheet.addRow({ text: '6. Разряд - КМС, МС, МСМК, 1 разряд, 2 разряд, 3 юн и т.д.' });
    instructionsSheet.addRow({ text: '7. Вид программы - число от 1 до 6 (необязательно)' });
    instructionsSheet.addRow({ text: '8. Подгруппа - буква A, B, C и т.д. (необязательно)' });
    instructionsSheet.addRow({ text: '' });
    instructionsSheet.addRow({ text: 'ВАЖНО:' });
    instructionsSheet.addRow({ text: '- Не изменяйте названия столбцов' });
    instructionsSheet.addRow({ text: '- Заполняйте данные начиная со второй строки' });
    instructionsSheet.addRow({ text: '- Удалите примеры перед загрузкой своих данных' });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Вспомогательные функции
   */
  private getCellValue(row: ExcelJS.Row, columnIndex: number): any {
    const cell = row.getCell(columnIndex);
    return cell.value;
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  private translateRank(rank: string): string {
    const translations: Record<string, string> = {
      YOUTH_3: '3 юн',
      YOUTH_2: '2 юн',
      YOUTH_1: '1 юн',
      RANK_3: '3 разряд',
      RANK_2: '2 разряд',
      RANK_1: '1 разряд',
      KMS: 'КМС',
      MS: 'МС',
      MSMK: 'МСМК',
    };
    return translations[rank] || rank;
  }

  private translateDiscipline(discipline: string): string {
    const translations: Record<string, string> = {
      INDIVIDUAL: 'Индивидуальные',
      GROUP: 'Групповые',
      GENERAL_FITNESS: 'ОФП',
    };
    return translations[discipline] || discipline;
  }

  private translateAgeCategory(category: string): string {
    const translations: Record<string, string> = {
      AGE_5_YOUNGER: '5 лет и младше',
      AGE_6_7: '6-7 лет',
      AGE_8_9: '8-9 лет',
      AGE_10_11: '10-11 лет',
      AGE_12_13: '12-13 лет',
      AGE_14: '14 лет',
      AGE_15_OLDER: '15 лет и старше',
      MIXED: 'Смешанная',
    };
    return translations[category] || category;
  }

  private translateProgram(program: string): string {
    const translations: Record<string, string> = {
      YOUTH_3: '3 юн',
      YOUTH_2: '2 юн',
      YOUTH_1: '1 юн',
      RANK_3: '3 разряд',
      RANK_2: '2 разряд',
      RANK_1: '1 разряд',
      KMS: 'КМС',
      MS: 'МС',
      MSMK: 'МСМК',
    };
    return translations[program] || program;
  }

  private translatePerformanceType(type: string): string {
    const translations: Record<string, string> = {
      INDIVIDUAL: 'Индивидуальные',
      TEAM_5_PLUS: 'Команда 5+',
      DUOS: 'Двойки',
      TRIOS: 'Тройки',
    };
    return translations[type] || type;
  }

  private translateApparatus(number: number, apparatus: any[]): string {
    if (number === 0) return 'Без предмета';
    const apparatusTypes: Record<string, string> = {
      ROPE: 'Скакалка',
      HOOP: 'Обруч',
      BALL: 'Мяч',
      CLUBS: 'Булавы',
      RIBBON: 'Лента',
      FREEHAND: 'Без предмета',
    };
    const app = apparatus[number - 1];
    return app ? apparatusTypes[app] || app : '';
  }
}
