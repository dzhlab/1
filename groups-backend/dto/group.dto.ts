// apps/api/src/modules/groups/dto/group.dto.ts

import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, Max, IsArray, Matches, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export enum DisciplineType {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
  GENERAL_FITNESS = 'GENERAL_FITNESS',
}

export enum AgeCategoryType {
  AGE_5_YOUNGER = 'AGE_5_YOUNGER',
  AGE_6_7 = 'AGE_6_7',
  AGE_8_9 = 'AGE_8_9',
  AGE_10_11 = 'AGE_10_11',
  AGE_12_13 = 'AGE_12_13',
  AGE_14 = 'AGE_14',
  AGE_15_OLDER = 'AGE_15_OLDER',
  MIXED = 'MIXED',
}

export enum ProgramType {
  YOUTH_3 = 'YOUTH_3',
  YOUTH_2 = 'YOUTH_2',
  YOUTH_1 = 'YOUTH_1',
  RANK_3 = 'RANK_3',
  RANK_2 = 'RANK_2',
  RANK_1 = 'RANK_1',
  KMS = 'KMS',
  MS = 'MS',
  MSMK = 'MSMK',
}

export enum PerformanceType {
  INDIVIDUAL = 'INDIVIDUAL',
  TEAM_5_PLUS = 'TEAM_5_PLUS',
  DUOS = 'DUOS',
  TRIOS = 'TRIOS',
}

export enum ApparatusType {
  FREEHAND = 'FREEHAND',
  ROPE = 'ROPE',
  HOOP = 'HOOP',
  BALL = 'BALL',
  CLUBS = 'CLUBS',
  RIBBON = 'RIBBON',
}

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DisciplineType)
  discipline: DisciplineType;

  @IsEnum(AgeCategoryType)
  ageCategory: AgeCategoryType;

  @IsInt()
  @Min(2000)
  @Max(2030)
  @IsOptional()
  yearFrom?: number;

  @IsInt()
  @Min(2000)
  @Max(2030)
  @IsOptional()
  yearTo?: number;

  @IsEnum(ProgramType)
  program: ProgramType;

  @IsEnum(PerformanceType)
  performanceType: PerformanceType;

  @IsArray()
  @IsEnum(ApparatusType, { each: true })
  @ArrayMinSize(1)
  apparatus: ApparatusType[];

  @IsArray()
  @IsEnum(ApparatusType, { each: true })
  @IsOptional()
  apparatusOrder?: ApparatusType[];

  @IsInt()
  @Min(30)
  @Max(300)
  @IsOptional()
  performanceDuration?: number;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  athletesPerStream?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  minAthletesPerStream?: number;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'streamStartTime must be in HH:MM format',
  })
  @IsOptional()
  streamStartTime?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subgroups?: string[];
}

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DisciplineType)
  @IsOptional()
  discipline?: DisciplineType;

  @IsEnum(AgeCategoryType)
  @IsOptional()
  ageCategory?: AgeCategoryType;

  @IsInt()
  @Min(2000)
  @Max(2030)
  @IsOptional()
  yearFrom?: number;

  @IsInt()
  @Min(2000)
  @Max(2030)
  @IsOptional()
  yearTo?: number;

  @IsEnum(ProgramType)
  @IsOptional()
  program?: ProgramType;

  @IsEnum(PerformanceType)
  @IsOptional()
  performanceType?: PerformanceType;

  @IsArray()
  @IsEnum(ApparatusType, { each: true })
  @IsOptional()
  apparatus?: ApparatusType[];

  @IsArray()
  @IsEnum(ApparatusType, { each: true })
  @IsOptional()
  apparatusOrder?: ApparatusType[];

  @IsInt()
  @Min(30)
  @Max(300)
  @IsOptional()
  performanceDuration?: number;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  athletesPerStream?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  minAthletesPerStream?: number;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'streamStartTime must be in HH:MM format',
  })
  @IsOptional()
  streamStartTime?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subgroups?: string[];
}

export class FilterGroupsDto {
  @IsEnum(DisciplineType)
  @IsOptional()
  discipline?: DisciplineType;

  @IsEnum(AgeCategoryType)
  @IsOptional()
  ageCategory?: AgeCategoryType;

  @IsEnum(ProgramType)
  @IsOptional()
  program?: ProgramType;

  @IsString()
  @IsOptional()
  search?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
