import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: 'ORGANIZER',
    enum: ['ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST', 'VIEWER']
  })
  @IsEnum(['ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST', 'VIEWER'])
  @IsOptional()
  role?: string;
}
