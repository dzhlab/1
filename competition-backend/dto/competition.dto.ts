// apps/api/src/modules/competitions/dto/competition.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsEnum, IsJSON, IsDateString, IsInt, Min, Max, IsBoolean, Matches, ArrayMinSize, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// ===========================================================================
// ENUMS
// ===========================================================================

export enum CompetitionStatus {
  DRAFT = 'DRAFT',
  PLANNING = 'PLANNING',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum EventType {
  OPENING = 'OPENING',
  BREAK = 'BREAK',
  PARADE = 'PARADE',
  AWARDS = 'AWARDS',
  SHOWCASE = 'SHOWCASE',
  JUDGES_MEETING = 'JUDGES_MEETING',
  ARRIVAL_DEPARTURE = 'ARRIVAL_DEPARTURE',
  FLOOR_TRAINING = 'FLOOR_TRAINING',
  OTHER = 'OTHER',
}

export enum DatePosition {
  BEFORE_FIRST = 'beforeFirst',
  AFTER_LAST = 'afterLast',
  AFTER_DATE_ID = 'afterDateId',
}

export enum CalculationMode {
  STRICT = 'strict',
  RELAXED = 'relaxed',
}

// ===========================================================================
// COMPETITION DTOs
// ===========================================================================

export class CreateCompetitionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  shortName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  organizer?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  organizers?: string[];

  @IsJSON()
  @IsOptional()
  contacts?: any;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsJSON()
  @IsOptional()
  colors?: any;

  @IsEnum(CompetitionStatus)
  @IsOptional()
  status?: CompetitionStatus;

  @IsJSON()
  @IsOptional()
  scheduleSettings?: any;
}

export class UpdateCompetitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  shortName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  organizer?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  organizers?: string[];

  @IsJSON()
  @IsOptional()
  contacts?: any;

  @IsEnum(CompetitionStatus)
  @IsOptional()
  status?: CompetitionStatus;

  @IsJSON()
  @IsOptional()
  scheduleSettings?: any;
}

// ===========================================================================
// DATE DTOs
// ===========================================================================

export class AddDateDto {
  @IsDateString()
  date: string;  // YYYY-MM-DD

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @IsEnum(DatePosition)
  position: DatePosition;

  @IsString()
  @IsOptional()
  targetDateId?: string;  // Required if position = AFTER_DATE_ID

  @IsString()
  @IsOptional()
  notes?: string;
}

export class EditDateDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format',
  })
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// ===========================================================================
// EVENT DTOs
// ===========================================================================

export class AddEventDto {
  @IsEnum(EventType)
  type: EventType;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(60)  // Минимум 1 минута
  @Max(14400)  // Максимум 4 часа
  duration: number;  // В секундах

  @IsBoolean()
  @IsOptional()
  isFixedTime?: boolean;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  @IsOptional()
  fixedStartTime?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participants?: string[];

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;
}

export class UpdateEventDto {
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(60)
  @Max(14400)
  @IsOptional()
  duration?: number;

  @IsBoolean()
  @IsOptional()
  isFixedTime?: boolean;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  @IsOptional()
  fixedStartTime?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participants?: string[];

  @IsString()
  @IsOptional()
  location?: string;
}

// ===========================================================================
// GROUP DTOs
// ===========================================================================

export class AddGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  discipline: string;

  @IsString()
  @IsNotEmpty()
  ageCategory: string;

  @IsString()
  @IsNotEmpty()
  programLevel: string;

  @IsInt()
  @Min(30)
  @Max(300)
  @IsOptional()
  timePerPerformance?: number;  // Default: 90 seconds

  @IsArray()
  @ArrayMinSize(1)
  apparatus: string[];

  @IsArray()
  @IsOptional()
  apparatusOrder?: string[];

  @IsBoolean()
  @IsOptional()
  useStreams?: boolean;

  @IsInt()
  @Min(2)
  @Max(6)
  @IsOptional()
  numberOfStreams?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;
}

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(30)
  @Max(300)
  @IsOptional()
  timePerPerformance?: number;

  @IsArray()
  @IsOptional()
  apparatus?: string[];

  @IsArray()
  @IsOptional()
  apparatusOrder?: string[];

  @IsBoolean()
  @IsOptional()
  useStreams?: boolean;

  @IsInt()
  @Min(2)
  @Max(6)
  @IsOptional()
  numberOfStreams?: number;
}

// ===========================================================================
// SCHEDULE RECALCULATION DTOs
// ===========================================================================

export class RecalculateScheduleDto {
  @IsEnum(CalculationMode)
  @IsOptional()
  mode?: CalculationMode;

  @IsInt()
  @Min(0)
  @Max(1800)
  @IsOptional()
  breakBetweenItems?: number;

  @IsInt()
  @Min(0)
  @Max(900)
  @IsOptional()
  breakBetweenStreams?: number;

  @IsInt()
  @Min(0)
  @Max(1800)
  @IsOptional()
  minBreakBeforeEvent?: number;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  @IsOptional()
  maxDayEndTime?: string;

  @IsBoolean()
  @IsOptional()
  autoSave?: boolean;
}

// ===========================================================================
// EXPORT DTOs
// ===========================================================================

export class ExportCompetitionDto {
  @IsEnum(['xlsx', 'pdf', 'json'])
  format: 'xlsx' | 'pdf' | 'json';

  @IsBoolean()
  @IsOptional()
  includeAthletes?: boolean;

  @IsBoolean()
  @IsOptional()
  includeSchedule?: boolean;

  @IsBoolean()
  @IsOptional()
  includeProtocols?: boolean;
}

// ===========================================================================
// REORDER DTOs
// ===========================================================================

export class ReorderItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  itemIds: string[];  // Ordered array of item IDs
}
