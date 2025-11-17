import { PartialType } from '@nestjs/swagger';
import { CreateCompetitionDto } from './create-competition.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCompetitionDto extends PartialType(CreateCompetitionDto) {
  @ApiProperty({
    example: 'PUBLISHED',
    enum: ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    required: false
  })
  @IsEnum(['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  @IsOptional()
  status?: string;
}
