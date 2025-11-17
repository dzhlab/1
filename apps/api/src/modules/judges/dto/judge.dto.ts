import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJudgeDto {
  @ApiProperty({ example: 'Иванова Мария Петровна' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'Москва' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Московская область' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({
    example: 'FIRST',
    enum: ['THIRD', 'SECOND', 'FIRST', 'ALL_RUSSIAN', 'INTERNATIONAL']
  })
  @IsEnum(['THIRD', 'SECOND', 'FIRST', 'ALL_RUSSIAN', 'INTERNATIONAL'])
  category: string;

  @ApiProperty({ example: 'МС', required: false })
  @IsString()
  @IsOptional()
  title?: string;
}

export class UpdateJudgeDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ required: false })
  @IsEnum(['THIRD', 'SECOND', 'FIRST', 'ALL_RUSSIAN', 'INTERNATIONAL'])
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;
}

export class AssignJudgeToCompetitionDto {
  @ApiProperty({ example: 'judge-123' })
  @IsString()
  @IsNotEmpty()
  judgeId: string;

  @ApiProperty({
    example: 'D',
    enum: ['D', 'E', 'A'],
    required: false
  })
  @IsEnum(['D', 'E', 'A'])
  @IsOptional()
  brigade?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  position?: number;
}
