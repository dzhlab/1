import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGroupDto {
  @ApiProperty({ example: 'comp-123' })
  @IsString()
  @IsNotEmpty()
  competitionId: string;

  @ApiProperty({ example: 'Группа "Юниоры" (9 лет)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'AGE_9',
    enum: ['AGE_5_AND_UNDER', 'AGE_6_7', 'AGE_8', 'AGE_9', 'AGE_10', 'AGE_11_12', 'AGE_13_15', 'AGE_15_PLUS'],
    required: false
  })
  @IsEnum(['AGE_5_AND_UNDER', 'AGE_6_7', 'AGE_8', 'AGE_9', 'AGE_10', 'AGE_11_12', 'AGE_13_15', 'AGE_15_PLUS'])
  @IsOptional()
  ageGroup?: string;

  @ApiProperty({
    example: 'FIRST_SPORT',
    enum: ['THIRD_JUNIOR', 'SECOND_JUNIOR', 'FIRST_JUNIOR', 'THIRD_SPORT', 'SECOND_SPORT', 'FIRST_SPORT', 'CMS', 'MS', 'MS_INTERNATIONAL'],
    required: false
  })
  @IsEnum(['THIRD_JUNIOR', 'SECOND_JUNIOR', 'FIRST_JUNIOR', 'THIRD_SPORT', 'SECOND_SPORT', 'FIRST_SPORT', 'CMS', 'MS', 'MS_INTERNATIONAL'])
  @IsOptional()
  rank?: string;

  @ApiProperty({
    example: 'INDIVIDUAL',
    enum: ['INDIVIDUAL', 'GROUP_5_PLUS', 'PAIR', 'TRIO']
  })
  @IsEnum(['INDIVIDUAL', 'GROUP_5_PLUS', 'PAIR', 'TRIO'])
  performanceType: string;

  @ApiProperty({
    example: ['ROPE', 'HOOP'],
    enum: ['ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON', 'FREE'],
    isArray: true
  })
  @IsArray()
  @IsEnum(['ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON', 'FREE'], { each: true })
  disciplines: string[];

  @ApiProperty({ example: 90, description: 'Время одного выступления в секундах' })
  @IsInt()
  @Min(30)
  performanceDuration: number;
}

export class UpdateGroupDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsEnum(['AGE_5_AND_UNDER', 'AGE_6_7', 'AGE_8', 'AGE_9', 'AGE_10', 'AGE_11_12', 'AGE_13_15', 'AGE_15_PLUS'])
  @IsOptional()
  ageGroup?: string;

  @ApiProperty({ required: false })
  @IsEnum(['THIRD_JUNIOR', 'SECOND_JUNIOR', 'FIRST_JUNIOR', 'THIRD_SPORT', 'SECOND_SPORT', 'FIRST_SPORT', 'CMS', 'MS', 'MS_INTERNATIONAL'])
  @IsOptional()
  rank?: string;

  @ApiProperty({ required: false })
  @IsEnum(['INDIVIDUAL', 'GROUP_5_PLUS', 'PAIR', 'TRIO'])
  @IsOptional()
  performanceType?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsEnum(['ROPE', 'HOOP', 'BALL', 'CLUBS', 'RIBBON', 'FREE'], { each: true })
  @IsOptional()
  disciplines?: string[];

  @ApiProperty({ required: false })
  @IsInt()
  @Min(30)
  @IsOptional()
  performanceDuration?: number;
}

export class AddAthleteDto {
  @ApiProperty({ example: 'participant-123' })
  @IsString()
  @IsNotEmpty()
  participantId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderNumber: number;

  @ApiProperty({ example: 'stream-123', required: false })
  @IsString()
  @IsOptional()
  streamId?: string;
}

export class GenerateStreamsDto {
  @ApiProperty({ example: 10, description: 'Количество атлетов в потоке' })
  @IsInt()
  @Min(1)
  athletesPerStream: number;

  @ApiProperty({ example: 5, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  minAthletes?: number;

  @ApiProperty({ example: ['A', 'B', 'C'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  streamNames?: string[];
}

export class DrawDto {
  @ApiProperty({
    example: 'RANDOM',
    enum: ['RANDOM', 'BY_CLUB', 'SNAKE', 'REVERSE_SNAKE']
  })
  @IsEnum(['RANDOM', 'BY_CLUB', 'SNAKE', 'REVERSE_SNAKE'])
  strategy: string;
}
