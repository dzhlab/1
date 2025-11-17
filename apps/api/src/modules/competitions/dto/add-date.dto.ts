import { IsDateString, IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddDateDto {
  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    example: 'beforeFirst',
    enum: ['beforeFirst', 'afterLast', 'afterDateId'],
    description: 'Позиция новой даты'
  })
  @IsEnum(['beforeFirst', 'afterLast', 'afterDateId'])
  position: string;

  @ApiProperty({ example: 'date-id-123', required: false })
  @IsString()
  @IsOptional()
  afterDateId?: string;
}
