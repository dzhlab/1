import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional, IsArray, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCompetitionDto {
  @ApiProperty({ example: 'Чемпионат России 2025' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2025-06-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-06-05T00:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  days: number;

  @ApiProperty({ example: 'Москва' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Спортивный комплекс "Лужники"' })
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiProperty({ example: 'ул. Лужники, 24', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Федерация художественной гимнастики России' })
  @IsString()
  @IsNotEmpty()
  organizer: string;

  @ApiProperty({ example: 'Иванова Мария Петровна' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ example: '+7 (495) 123-45-67' })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @ApiProperty({ example: 'contact@gymnastics.ru', required: false })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({ example: 'SENIOR', enum: ['JUNIOR', 'YOUTH', 'SENIOR', 'MIXED'] })
  @IsEnum(['JUNIOR', 'YOUTH', 'SENIOR', 'MIXED'])
  category: string;

  @ApiProperty({ example: 'Чемпионат по художественной гимнастике', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: ['ROPE', 'HOOP', 'BALL'],
    enum: ['ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON', 'FREE'],
    isArray: true
  })
  @IsArray()
  @IsEnum(['ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON', 'FREE'], { each: true })
  disciplines: string[];

  @ApiProperty({ example: 'SHARE', enum: ['SHARE', 'COMPONENTS'], required: false })
  @IsEnum(['SHARE', 'COMPONENTS'])
  @IsOptional()
  tiebreakRule?: string;

  @ApiProperty({ example: 'NO_SKIP', enum: ['NO_SKIP', 'SKIP'], required: false })
  @IsEnum(['NO_SKIP', 'SKIP'])
  @IsOptional()
  rankingSkip?: string;

  @ApiProperty({ example: 'RUSSIAN', enum: ['RUSSIAN', 'SUM'], required: false })
  @IsEnum(['RUSSIAN', 'SUM'])
  @IsOptional()
  dCalculation?: string;
}
