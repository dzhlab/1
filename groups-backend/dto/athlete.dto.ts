// apps/api/src/modules/athletes/dto/athlete.dto.ts

import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, Max, IsDateString, MinLength } from 'class-validator';
import { ProgramType } from './group.dto';

export class CreateAthleteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Full name must be at least 3 characters' })
  fullName: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'City must be at least 2 characters' })
  city: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Club must be at least 2 characters' })
  club: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Coach name must be at least 3 characters' })
  coach: string;

  @IsEnum(ProgramType)
  rank: ProgramType;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  apparatusNumber?: number;

  @IsString()
  @IsOptional()
  subgroup?: string;
}

export class UpdateAthleteDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  fullName?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  city?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  club?: string;

  @IsString()
  @MinLength(3)
  @IsOptional()
  coach?: string;

  @IsEnum(ProgramType)
  @IsOptional()
  rank?: ProgramType;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  apparatusNumber?: number;

  @IsString()
  @IsOptional()
  subgroup?: string;
}

export class MoveAthleteDto {
  @IsEnum(['up', 'down'])
  direction: 'up' | 'down';
}

export class ReorderAthleteDto {
  @IsInt()
  @Min(1)
  newPosition: number;
}

export class BulkReorderDto {
  @IsString({ each: true })
  @IsNotEmpty()
  order: string[];
}

export class AssignApparatusDto {
  @IsInt()
  @Min(0)
  @Max(6)
  apparatusNumber: number;
}

export class AssignSubgroupDto {
  @IsString()
  @IsNotEmpty()
  subgroup: string;
}
