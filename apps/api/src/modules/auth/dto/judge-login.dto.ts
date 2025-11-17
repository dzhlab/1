import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JudgeLoginDto {
  @ApiProperty({
    example: 'cuid-judge-id-123',
    description: 'ID судьи из базы данных'
  })
  @IsString()
  @IsNotEmpty()
  judgeId: string;

  @ApiProperty({
    example: 'comp-123',
    description: 'ID соревнования (опционально)',
    required: false
  })
  @IsString()
  @IsOptional()
  competitionId?: string;
}
