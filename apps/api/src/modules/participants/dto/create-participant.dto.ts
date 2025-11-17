import { IsString, IsNotEmpty, IsDateString, IsInt, Min, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateParticipantDto {
  @ApiProperty({ example: 'Иванова Мария Петровна' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '2010-05-15', required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(5)
  age: number;

  @ApiProperty({ example: 'СШОР "Олимп"' })
  @IsString()
  @IsNotEmpty()
  club: string;

  @ApiProperty({ example: 'Москва' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Петрова Анна Ивановна', required: false })
  @IsString()
  @IsOptional()
  coach?: string;

  @ApiProperty({
    example: 'FIRST_SPORT',
    enum: ['THIRD_JUNIOR', 'SECOND_JUNIOR', 'FIRST_JUNIOR', 'THIRD_SPORT', 'SECOND_SPORT', 'FIRST_SPORT', 'CMS', 'MS', 'MS_INTERNATIONAL'],
    required: false
  })
  @IsEnum(['THIRD_JUNIOR', 'SECOND_JUNIOR', 'FIRST_JUNIOR', 'THIRD_SPORT', 'SECOND_SPORT', 'FIRST_SPORT', 'CMS', 'MS', 'MS_INTERNATIONAL'])
  @IsOptional()
  rank?: string;

  @ApiProperty({ example: 'YOUTH', enum: ['JUNIOR', 'YOUTH', 'SENIOR', 'MIXED'] })
  @IsEnum(['JUNIOR', 'YOUTH', 'SENIOR', 'MIXED'])
  category: string;
}

export class UpdateParticipantDto extends CreateParticipantDto {}
