// apps/api/src/modules/streams/streams.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

export interface StreamSettings {
  athletesPerStream: number;
  minAthletesPerStream: number;
  streamStartTime: string;
  performanceDuration: number;
  subgroups: string[];
  breakDuration?: number; // Перерыв между потоками в секундах
}

export interface GenerateStreamsResult {
  streams: any[];
  totalStreams: number;
  athletesAssigned: number;
}

@Injectable()
export class StreamsService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  /**
   * Найти поток по ID
   */
  async findOne(id: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id },
      include: {
        group: true,
        athletes: {
          orderBy: { orderNumber: 'asc' },
        },
      },
    });

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    return stream;
  }

  /**
   * Генерировать потоки для группы
   */
  async generateStreams(groupId: string, settings?: Partial<StreamSettings>): Promise<GenerateStreamsResult> {
    const group = await this.groupsService.findOne(groupId);

    if (group.athletes.length === 0) {
      throw new BadRequestException('No athletes in group to generate streams');
    }

    // Используем настройки из группы или переданные параметры
    const athletesPerStream = settings?.athletesPerStream || group.athletesPerStream;
    const minAthletesPerStream = settings?.minAthletesPerStream || group.minAthletesPerStream;
    const streamStartTime = settings?.streamStartTime || group.streamStartTime;
    const performanceDuration = settings?.performanceDuration || group.performanceDuration;
    const subgroups = settings?.subgroups || group.subgroups || ['A'];
    const breakDuration = settings?.breakDuration || 300; // 5 минут по умолчанию

    // Удаляем старые потоки
    await this.prisma.stream.deleteMany({
      where: { groupId },
    });

    // Сбрасываем привязку к потокам у участников
    await this.prisma.groupAthlete.updateMany({
      where: { groupId },
      data: {
        streamId: null,
        streamTime: null,
      },
    });

    // Расчет количества потоков
    const totalAthletes = group.athletes.length;
    let numStreams = Math.ceil(totalAthletes / athletesPerStream);

    // Проверка минимального количества в последнем потоке
    const lastStreamSize = totalAthletes % athletesPerStream || athletesPerStream;
    if (lastStreamSize < minAthletesPerStream && numStreams > 1) {
      numStreams--;
    }

    const streams: any[] = [];
    let athleteIndex = 0;
    let currentTime = this.parseTime(streamStartTime);

    for (let i = 0; i < numStreams; i++) {
      const streamNumber = i + 1;
      const subgroup = subgroups[i % subgroups.length];

      // Определяем количество участников в потоке
      const remainingAthletes = totalAthletes - athleteIndex;
      const isLastStream = i === numStreams - 1;

      let streamSize: number;
      if (isLastStream) {
        streamSize = remainingAthletes;
      } else {
        streamSize = Math.min(athletesPerStream, remainingAthletes);
      }

      // Создаем поток
      const stream = await this.prisma.stream.create({
        data: {
          groupId,
          orderNumber: streamNumber,
          subgroup,
          startTime: this.formatTime(currentTime),
          athletesCount: streamSize,
        },
      });

      // Назначаем участников в поток
      const streamAthletes = group.athletes.slice(athleteIndex, athleteIndex + streamSize);
      let athleteTime = currentTime;

      for (const athlete of streamAthletes) {
        await this.prisma.groupAthlete.update({
          where: { id: athlete.id },
          data: {
            streamId: stream.id,
            streamTime: this.formatTime(athleteTime),
            subgroup,
          },
        });

        athleteTime += performanceDuration;
      }

      streams.push({
        ...stream,
        athletes: streamAthletes,
      });

      athleteIndex += streamSize;

      // Рассчитываем время начала следующего потока
      // (время последнего выступления + длительность + перерыв)
      if (i < numStreams - 1) {
        currentTime = athleteTime + breakDuration;
      }
    }

    // Логируем изменение
    await this.groupsService.logChange(
      groupId,
      'CREATE',
      'GROUP',
      groupId,
      { streamsCount: 0 },
      { streamsCount: numStreams },
      { settings },
    );

    return {
      streams,
      totalStreams: numStreams,
      athletesAssigned: totalAthletes,
    };
  }

  /**
   * Обновить поток
   */
  async update(id: string, data: any) {
    const stream = await this.findOne(id);

    const updated = await this.prisma.stream.update({
      where: { id },
      data: {
        subgroup: data.subgroup ?? stream.subgroup,
        startTime: data.startTime ?? stream.startTime,
        athletesCount: data.athletesCount ?? stream.athletesCount,
      },
      include: {
        group: true,
        athletes: {
          orderBy: { orderNumber: 'asc' },
        },
      },
    });

    // Если изменилось время начала, пересчитываем времена участников
    if (data.startTime && data.startTime !== stream.startTime) {
      await this.recalculateAthleteTimes(id, data.startTime);
    }

    // Логируем изменение
    await this.groupsService.logChange(
      stream.groupId,
      'UPDATE',
      'STREAM',
      id,
      stream,
      updated,
    );

    return updated;
  }

  /**
   * Удалить поток
   */
  async delete(id: string) {
    const stream = await this.findOne(id);

    // Сбрасываем привязку у участников
    await this.prisma.groupAthlete.updateMany({
      where: { streamId: id },
      data: {
        streamId: null,
        streamTime: null,
      },
    });

    // Удаляем поток
    await this.prisma.stream.delete({
      where: { id },
    });

    // Перенумеруем оставшиеся потоки
    await this.renumberStreams(stream.groupId);

    // Логируем изменение
    await this.groupsService.logChange(
      stream.groupId,
      'DELETE',
      'STREAM',
      id,
      stream,
      undefined,
    );

    return { success: true };
  }

  /**
   * Назначить участника в поток
   */
  async assignAthlete(streamId: string, athleteId: string) {
    const stream = await this.findOne(streamId);
    const athlete = await this.prisma.groupAthlete.findUnique({
      where: { id: athleteId },
    });

    if (!athlete) {
      throw new NotFoundException(`Athlete with ID ${athleteId} not found`);
    }

    if (athlete.groupId !== stream.groupId) {
      throw new BadRequestException('Athlete does not belong to the same group as the stream');
    }

    // Получаем группу для настроек
    const group = await this.groupsService.findOne(stream.groupId);

    // Рассчитываем время выступления
    const athletesInStream = await this.prisma.groupAthlete.count({
      where: { streamId },
    });

    const startTimeSeconds = this.parseTime(stream.startTime);
    const athleteTimeSeconds = startTimeSeconds + (athletesInStream * group.performanceDuration);
    const athleteTime = this.formatTime(athleteTimeSeconds);

    // Назначаем участника
    const updated = await this.prisma.groupAthlete.update({
      where: { id: athleteId },
      data: {
        streamId,
        streamTime: athleteTime,
        subgroup: stream.subgroup,
      },
    });

    // Обновляем счетчик участников в потоке
    await this.prisma.stream.update({
      where: { id: streamId },
      data: {
        athletesCount: athletesInStream + 1,
      },
    });

    // Логируем изменение
    await this.groupsService.logChange(
      stream.groupId,
      'UPDATE',
      'ATHLETE',
      athleteId,
      { streamId: athlete.streamId },
      { streamId },
    );

    return updated;
  }

  /**
   * Удалить участника из потока
   */
  async unassignAthlete(athleteId: string) {
    const athlete = await this.prisma.groupAthlete.findUnique({
      where: { id: athleteId },
    });

    if (!athlete) {
      throw new NotFoundException(`Athlete with ID ${athleteId} not found`);
    }

    if (!athlete.streamId) {
      throw new BadRequestException('Athlete is not assigned to any stream');
    }

    const streamId = athlete.streamId;

    // Удаляем привязку
    await this.prisma.groupAthlete.update({
      where: { id: athleteId },
      data: {
        streamId: null,
        streamTime: null,
      },
    });

    // Обновляем счетчик участников в потоке
    const athletesCount = await this.prisma.groupAthlete.count({
      where: { streamId },
    });

    await this.prisma.stream.update({
      where: { id: streamId },
      data: { athletesCount },
    });

    // Пересчитываем времена оставшихся участников
    const stream = await this.findOne(streamId);
    await this.recalculateAthleteTimes(streamId, stream.startTime);

    // Логируем изменение
    await this.groupsService.logChange(
      athlete.groupId,
      'UPDATE',
      'ATHLETE',
      athleteId,
      { streamId: athlete.streamId },
      { streamId: null },
    );

    return { success: true };
  }

  /**
   * Очистить все потоки группы
   */
  async clearAll(groupId: string) {
    const group = await this.groupsService.findOne(groupId);

    // Сбрасываем привязки у участников
    await this.prisma.groupAthlete.updateMany({
      where: { groupId },
      data: {
        streamId: null,
        streamTime: null,
      },
    });

    // Удаляем потоки
    const result = await this.prisma.stream.deleteMany({
      where: { groupId },
    });

    // Логируем изменение
    await this.groupsService.logChange(
      groupId,
      'DELETE',
      'GROUP',
      groupId,
      { streamsCount: group.streams.length },
      { streamsCount: 0 },
    );

    return {
      success: true,
      deleted: result.count,
    };
  }

  /**
   * Пересчитать времена участников в потоке
   */
  private async recalculateAthleteTimes(streamId: string, startTime: string): Promise<void> {
    const stream = await this.findOne(streamId);
    const group = await this.groupsService.findOne(stream.groupId);

    const athletes = stream.athletes;
    let currentTime = this.parseTime(startTime);

    await this.prisma.$transaction(
      athletes.map((athlete) => {
        const athleteTime = this.formatTime(currentTime);
        currentTime += group.performanceDuration;

        return this.prisma.groupAthlete.update({
          where: { id: athlete.id },
          data: { streamTime: athleteTime },
        });
      }),
    );
  }

  /**
   * Перенумеровать потоки после удаления
   */
  private async renumberStreams(groupId: string): Promise<void> {
    const streams = await this.prisma.stream.findMany({
      where: { groupId },
      orderBy: { orderNumber: 'asc' },
    });

    await this.prisma.$transaction(
      streams.map((stream, index) =>
        this.prisma.stream.update({
          where: { id: stream.id },
          data: { orderNumber: index + 1 },
        }),
      ),
    );
  }

  /**
   * Парсинг времени из формата HH:MM в секунды
   */
  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60;
  }

  /**
   * Форматирование времени из секунд в HH:MM
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Получить статистику потоков
   */
  async getStreamStats(groupId: string) {
    const group = await this.groupsService.findOne(groupId);

    const streamStats = group.streams.map((stream) => ({
      id: stream.id,
      orderNumber: stream.orderNumber,
      subgroup: stream.subgroup,
      startTime: stream.startTime,
      athletesCount: stream.athletesCount,
      athletes: stream.athletes.length,
    }));

    return {
      totalStreams: group.streams.length,
      totalAthletes: group.athletes.length,
      athletesAssigned: group.athletes.filter((a) => a.streamId).length,
      athletesUnassigned: group.athletes.filter((a) => !a.streamId).length,
      streams: streamStats,
    };
  }
}
