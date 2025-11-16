// apps/api/src/modules/competitions/services/__tests__/schedule-calculator.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ScheduleCalculatorService,
  CalculationMode,
  ConflictType,
  ConflictSeverity,
} from '../schedule-calculator.service';

describe('ScheduleCalculatorService', () => {
  let service: ScheduleCalculatorService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleCalculatorService,
        {
          provide: PrismaService,
          useValue: {
            competition: {
              findUnique: jest.fn(),
            },
            competitionDate: {
              update: jest.fn(),
            },
            dateItem: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ScheduleCalculatorService>(ScheduleCalculatorService);
    prismaService = module.get(PrismaService);
  });

  describe('recalculateSchedule', () => {
    it('should calculate schedule for simple day with one group', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition',
        dates: [
          {
            id: 'date-1',
            date: new Date('2025-06-01'),
            startTime: '09:00',
            endTime: null,
            order: 1,
            items: [
              {
                id: 'item-1',
                type: 'GROUP',
                order: 1,
                group: {
                  id: 'group-1',
                  name: 'Девочки 10-11 лет',
                  timePerPerformance: 90, // 1.5 minutes
                  apparatus: ['ROPE', 'HOOP'], // 2 вида
                  useStreams: false,
                  athletes: new Array(10).fill({}).map((_, i) => ({
                    id: `athlete-${i}`,
                    orderNumber: i + 1,
                  })),
                  streams: [],
                },
              },
            ],
          },
        ],
      };

      prismaService.competition.findUnique.mockResolvedValue(mockCompetition as any);

      const result = await service.recalculateSchedule('comp-1', {
        mode: CalculationMode.RELAXED,
        breakBetweenItems: 300, // 5 minutes
        autoSave: false,
      });

      // Проверяем результат
      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.updatedDates).toHaveLength(1);

      const updatedDate = result.updatedDates[0];
      const item = updatedDate.items[0];

      // 10 участников × 90 сек × 2 вида = 1800 секунд = 30 минут
      expect(item.duration).toBe(1800);
      expect(item.startTime).toBe('09:00');
      expect(item.endTime).toBe('09:30');
      expect(updatedDate.endTime).toBe('09:30');
    });

    it('should calculate schedule with streams (parallel)', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition',
        dates: [
          {
            id: 'date-1',
            date: new Date('2025-06-01'),
            startTime: '10:00',
            endTime: null,
            order: 1,
            items: [
              {
                id: 'item-1',
                type: 'GROUP',
                order: 1,
                group: {
                  id: 'group-1',
                  name: 'Девочки 12-13 лет',
                  timePerPerformance: 90,
                  apparatus: ['BALL'],
                  useStreams: true,
                  numberOfStreams: 3,
                  athletes: new Array(30).fill({}).map((_, i) => ({
                    id: `athlete-${i}`,
                    orderNumber: i + 1,
                  })),
                  streams: [
                    {
                      id: 'stream-1',
                      streamNumber: 1,
                      athletes: new Array(10).fill({}).map((_, i) => ({
                        id: `athlete-${i}`,
                      })),
                    },
                    {
                      id: 'stream-2',
                      streamNumber: 2,
                      athletes: new Array(10).fill({}).map((_, i) => ({
                        id: `athlete-${i + 10}`,
                      })),
                    },
                    {
                      id: 'stream-3',
                      streamNumber: 3,
                      athletes: new Array(10).fill({}).map((_, i) => ({
                        id: `athlete-${i + 20}`,
                      })),
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      prismaService.competition.findUnique.mockResolvedValue(mockCompetition as any);

      const result = await service.recalculateSchedule('comp-1', {
        mode: CalculationMode.RELAXED,
        breakBetweenStreams: 180, // 3 minutes between streams
        autoSave: false,
      });

      const item = result.updatedDates[0].items[0];

      // Каждый поток: 10 участников × 90 сек × 1 вид = 900 секунд
      // Параллельно: max(900, 900, 900) = 900 секунд
      // + перерывы между потоками: 2 × 180 = 360 секунд
      // Итого: 900 + 360 = 1260 секунд = 21 минута
      expect(item.duration).toBe(1260);
      expect(item.startTime).toBe('10:00');
      expect(item.endTime).toBe('10:21');
    });

    it('should detect fixed time conflict', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition',
        dates: [
          {
            id: 'date-1',
            date: new Date('2025-06-01'),
            startTime: '09:00',
            endTime: null,
            order: 1,
            items: [
              {
                id: 'item-1',
                type: 'GROUP',
                order: 1,
                group: {
                  id: 'group-1',
                  name: 'Группа 1',
                  timePerPerformance: 90,
                  apparatus: ['ROPE', 'HOOP'],
                  useStreams: false,
                  athletes: new Array(20).fill({}).map((_, i) => ({
                    id: `athlete-${i}`,
                  })),
                  streams: [],
                },
              },
              {
                id: 'item-2',
                type: 'EVENT',
                order: 2,
                event: {
                  id: 'event-1',
                  type: 'AWARDS',
                  name: 'Награждение',
                  duration: 1800, // 30 minutes
                  isFixedTime: true,
                  fixedStartTime: '09:30', // Не поместится!
                },
              },
            ],
          },
        ],
      };

      prismaService.competition.findUnique.mockResolvedValue(mockCompetition as any);

      const result = await service.recalculateSchedule('comp-1', {
        mode: CalculationMode.RELAXED,
        breakBetweenItems: 300,
        autoSave: false,
      });

      // Группа: 20 × 90 × 2 = 3600 сек = 60 минут
      // Группа: 09:00 - 10:00
      // + перерыв 5 минут = 10:05
      // Событие фиксировано на 09:30 - КОНФЛИКТ!

      expect(result.conflicts.length).toBeGreaterThan(0);

      const conflict = result.conflicts.find(
        (c) => c.type === ConflictType.FIXED_TIME_CONFLICT,
      );

      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe(ConflictSeverity.ERROR);
      expect(conflict?.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect day overflow', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition',
        dates: [
          {
            id: 'date-1',
            date: new Date('2025-06-01'),
            startTime: '18:00',
            endTime: null,
            order: 1,
            items: [
              {
                id: 'item-1',
                type: 'GROUP',
                order: 1,
                group: {
                  id: 'group-1',
                  name: 'Большая группа',
                  timePerPerformance: 90,
                  apparatus: ['ROPE', 'HOOP', 'BALL'],
                  useStreams: false,
                  athletes: new Array(50).fill({}).map((_, i) => ({
                    id: `athlete-${i}`,
                  })),
                  streams: [],
                },
              },
            ],
          },
        ],
      };

      prismaService.competition.findUnique.mockResolvedValue(mockCompetition as any);

      const result = await service.recalculateSchedule('comp-1', {
        mode: CalculationMode.RELAXED,
        maxDayEndTime: '22:00',
        autoSave: false,
      });

      // 50 участников × 90 сек × 3 вида = 13500 сек = 3.75 часа = 225 минут
      // Начало: 18:00
      // Конец: 21:45 - OK
      // Но если бы было больше участников, был бы overflow

      const item = result.updatedDates[0].items[0];
      expect(item.duration).toBe(13500);

      // Проверим с большим количеством
      mockCompetition.dates[0].items[0].group.athletes = new Array(80).fill({}).map((_, i) => ({
        id: `athlete-${i}`,
      }));

      const result2 = await service.recalculateSchedule('comp-1', {
        mode: CalculationMode.RELAXED,
        maxDayEndTime: '22:00',
        autoSave: false,
      });

      // 80 × 90 × 3 = 21600 сек = 6 часов
      // 18:00 + 6 часов = 24:00 (00:00) - OVERFLOW!

      const overflowConflict = result2.conflicts.find(
        (c) => c.type === ConflictType.DAY_OVERFLOW,
      );

      expect(overflowConflict).toBeDefined();
      expect(overflowConflict?.severity).toBe(ConflictSeverity.WARNING);
      expect(overflowConflict?.suggestions.length).toBeGreaterThan(0);
    });

    it('should calculate complex day with multiple groups and events', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition',
        dates: [
          {
            id: 'date-1',
            date: new Date('2025-06-01'),
            startTime: '09:00',
            endTime: null,
            order: 1,
            items: [
              {
                id: 'item-1',
                type: 'EVENT',
                order: 1,
                event: {
                  id: 'event-1',
                  type: 'OPENING',
                  name: 'Открытие соревнований',
                  duration: 1800, // 30 minutes
                  isFixedTime: false,
                },
              },
              {
                id: 'item-2',
                type: 'GROUP',
                order: 2,
                group: {
                  id: 'group-1',
                  name: 'Группа 1',
                  timePerPerformance: 90,
                  apparatus: ['ROPE'],
                  useStreams: false,
                  athletes: new Array(15).fill({}).map((_, i) => ({
                    id: `athlete-1-${i}`,
                  })),
                  streams: [],
                },
              },
              {
                id: 'item-3',
                type: 'EVENT',
                order: 3,
                event: {
                  id: 'event-2',
                  type: 'BREAK',
                  name: 'Обеденный перерыв',
                  duration: 3600, // 1 hour
                  isFixedTime: false,
                },
              },
              {
                id: 'item-4',
                type: 'GROUP',
                order: 4,
                group: {
                  id: 'group-2',
                  name: 'Группа 2',
                  timePerPerformance: 90,
                  apparatus: ['HOOP', 'BALL'],
                  useStreams: true,
                  numberOfStreams: 2,
                  athletes: new Array(20).fill({}).map((_, i) => ({
                    id: `athlete-2-${i}`,
                  })),
                  streams: [
                    {
                      id: 'stream-1',
                      streamNumber: 1,
                      athletes: new Array(10).fill({}).map((_, i) => ({
                        id: `athlete-2-${i}`,
                      })),
                    },
                    {
                      id: 'stream-2',
                      streamNumber: 2,
                      athletes: new Array(10).fill({}).map((_, i) => ({
                        id: `athlete-2-${i + 10}`,
                      })),
                    },
                  ],
                },
              },
              {
                id: 'item-5',
                type: 'EVENT',
                order: 5,
                event: {
                  id: 'event-3',
                  type: 'AWARDS',
                  name: 'Награждение',
                  duration: 1800, // 30 minutes
                  isFixedTime: false,
                },
              },
            ],
          },
        ],
      };

      prismaService.competition.findUnique.mockResolvedValue(mockCompetition as any);

      const result = await service.recalculateSchedule('comp-1', {
        mode: CalculationMode.RELAXED,
        breakBetweenItems: 300, // 5 minutes
        breakBetweenStreams: 180, // 3 minutes
        minBreakBeforeEvent: 600, // 10 minutes before events
        autoSave: false,
      });

      expect(result.success).toBe(true);

      const items = result.updatedDates[0].items;

      // Проверяем расчеты:
      // 1. Открытие: 09:00 - 09:30 (30 мин)
      expect(items[0].startTime).toBe('09:00');
      expect(items[0].endTime).toBe('09:30');

      // 2. Группа 1: 09:40 - 10:02:30 (15 × 90 × 1 = 1350 сек = 22.5 мин)
      //    (+ 10 мин перерыв перед)
      expect(items[1].startTime).toBe('09:40');
      expect(items[1].duration).toBe(1350);

      // 3. Обеденный перерыв: после группы + 10 мин
      expect(items[2].duration).toBe(3600); // 1 час

      // 4. Группа 2 с потоками: 10 × 90 × 2 = 1800 сек = 30 мин на поток
      //    + 3 мин между потоками = 1800 + 180 = 1980 сек
      expect(items[3].duration).toBe(1980);

      // 5. Награждение: 30 минут

      // Общее время должно быть разумным
      const totalDuration = result.statistics.totalDuration;
      expect(totalDuration).toBeGreaterThan(0);
      expect(totalDuration).toBeLessThan(36000); // Меньше 10 часов
    });

    it('should work in strict mode and stop on first error', async () => {
      const mockCompetition = {
        id: 'comp-1',
        name: 'Test Competition',
        dates: [
          {
            id: 'date-1',
            date: new Date('2025-06-01'),
            startTime: '09:00',
            endTime: null,
            order: 1,
            items: [
              {
                id: 'item-1',
                type: 'GROUP',
                order: 1,
                group: {
                  id: 'group-1',
                  name: 'Группа 1',
                  timePerPerformance: 90,
                  apparatus: ['ROPE'],
                  useStreams: false,
                  athletes: new Array(20).fill({}).map((_, i) => ({
                    id: `athlete-${i}`,
                  })),
                  streams: [],
                },
              },
              {
                id: 'item-2',
                type: 'EVENT',
                order: 2,
                event: {
                  id: 'event-1',
                  type: 'AWARDS',
                  duration: 1800,
                  isFixedTime: true,
                  fixedStartTime: '09:15', // Конфликт!
                },
              },
            ],
          },
        ],
      };

      prismaService.competition.findUnique.mockResolvedValue(mockCompetition as any);

      const result = await service.recalculateSchedule('comp-1', {
        mode: CalculationMode.STRICT,
        autoSave: false,
      });

      expect(result.success).toBe(false);

      const errors = result.conflicts.filter((c) => c.severity === ConflictSeverity.ERROR);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Time utilities', () => {
    it('should correctly parse and format time', () => {
      // Access private methods via reflection for testing
      const parseTime = (service as any).parseTime.bind(service);
      const formatTime = (service as any).formatTime.bind(service);

      expect(parseTime('09:00')).toBe(32400); // 9 * 3600
      expect(parseTime('13:30')).toBe(48600); // 13 * 3600 + 30 * 60
      expect(parseTime('00:00')).toBe(0);

      expect(formatTime(32400)).toBe('09:00');
      expect(formatTime(48600)).toBe('13:30');
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(3665)).toBe('01:01');
    });
  });
});
