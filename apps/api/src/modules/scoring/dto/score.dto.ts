import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitScoreDto {
  @ApiProperty({ example: 'comp-123' })
  @IsString()
  @IsNotEmpty()
  competitionId: string;

  @ApiProperty({ example: 'participant-123' })
  @IsString()
  @IsNotEmpty()
  participantId: string;

  @ApiProperty({
    example: 'ROPE',
    enum: ['ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON', 'FREE']
  })
  @IsEnum(['ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON', 'FREE'])
  discipline: string;

  // D-бригада: Трудность тела (DB)
  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(20)
  db1: number;

  @ApiProperty({ example: 2.4 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(20)
  db2: number;

  @ApiProperty({ example: 2.6, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(20)
  @IsOptional()
  db3?: number;

  @ApiProperty({ example: 2.5, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(20)
  @IsOptional()
  db4?: number;

  // D-бригада: Трудность предмета (DA)
  @ApiProperty({ example: 3.0 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(20)
  da1: number;

  @ApiProperty({ example: 2.9 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(20)
  da2: number;

  @ApiProperty({ example: 3.1, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(20)
  @IsOptional()
  da3?: number;

  @ApiProperty({ example: 3.0, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(20)
  @IsOptional()
  da4?: number;

  // E-бригада: Вычеты за исполнение
  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  e1: number;

  @ApiProperty({ example: 1.6 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  e2: number;

  @ApiProperty({ example: 1.4 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  e3: number;

  @ApiProperty({ example: 1.7 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  e4: number;

  // A-бригада: Артистизм
  @ApiProperty({ example: 0.8 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  a1: number;

  @ApiProperty({ example: 0.9 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  a2: number;

  @ApiProperty({ example: 0.7 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  a3: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  a4: number;

  // Штрафы
  @ApiProperty({ example: 0.3, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  penalties?: number;

  // ID судьи
  @ApiProperty({ example: 'judge-123', required: false })
  @IsString()
  @IsOptional()
  judgeId?: string;
}

export class UpdateScoreDto extends SubmitScoreDto {}
