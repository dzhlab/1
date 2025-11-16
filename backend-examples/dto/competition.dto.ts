// apps/api/src/modules/competitions/dto/competition.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsEnum,
  IsArray,
  IsOptional,
  Min,
  MaxLength,
  IsPhoneNumber,
  ArrayMinSize,
} from 'class-validator';
import { Category, Discipline, TiebreakRule, RankingSkip, DCalculation } from '@prisma/client';

export class CreateCompetitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(1)
  days: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  venue: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  organizer: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName: string;

  @IsPhoneNumber('RU')
  contactPhone: string;

  @IsEnum(Category)
  category: Category;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Discipline, { each: true })
  disciplines: Discipline[];

  @IsEnum(TiebreakRule)
  @IsOptional()
  tiebreakRule?: TiebreakRule;

  @IsEnum(RankingSkip)
  @IsOptional()
  rankingSkip?: RankingSkip;

  @IsEnum(DCalculation)
  @IsOptional()
  dCalculation?: DCalculation;
}

export class UpdateCompetitionDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  days?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  venue?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  organizer?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactName?: string;

  @IsPhoneNumber('RU')
  @IsOptional()
  contactPhone?: string;

  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @IsArray()
  @IsEnum(Discipline, { each: true })
  @IsOptional()
  disciplines?: Discipline[];

  @IsEnum(TiebreakRule)
  @IsOptional()
  tiebreakRule?: TiebreakRule;

  @IsEnum(RankingSkip)
  @IsOptional()
  rankingSkip?: RankingSkip;

  @IsEnum(DCalculation)
  @IsOptional()
  dCalculation?: DCalculation;
}
