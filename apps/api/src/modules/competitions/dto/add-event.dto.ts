import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddEventDto {
  @ApiProperty({
    example: 'OPENING',
    enum: ['OPENING', 'BREAK', 'PARADE', 'AWARDS', 'EXHIBITION', 'OTHER', 'JUDGES_MEETING', 'ARRIVAL_DEPARTURE', 'FLOOR_PRACTICE']
  })
  @IsEnum(['OPENING', 'BREAK', 'PARADE', 'AWARDS', 'EXHIBITION', 'OTHER', 'JUDGES_MEETING', 'ARRIVAL_DEPARTURE', 'FLOOR_PRACTICE'])
  type: string;

  @ApiProperty({ example: 'Торжественное открытие' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Парад участников и приветствие', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1800, description: 'Продолжительность в секундах' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isFixedTime?: boolean;

  @ApiProperty({ example: '18:00', required: false })
  @IsString()
  @IsOptional()
  fixedStartTime?: string;
}
