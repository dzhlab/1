// apps/api/src/modules/judges/dto/judge.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Brigade, JudgeCategory } from '@prisma/client';

export class CreateJudgeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  region: string;

  @IsEnum(JudgeCategory)
  category: JudgeCategory;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  title?: string;
}

export class AddJudgeDto {
  @IsString()
  @IsNotEmpty()
  judgeId: string;

  @IsEnum(Brigade)
  @IsOptional()
  brigade?: Brigade;
}

export class UpdateJudgeDto {
  @IsEnum(Brigade)
  @IsOptional()
  brigade?: Brigade;

  @IsInt()
  @IsOptional()
  position?: number;
}

export class JudgeOrderDto {
  @IsString()
  @IsNotEmpty()
  judgeId: string;

  @IsInt()
  position: number;
}

export class ReorderJudgesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JudgeOrderDto)
  orders: JudgeOrderDto[];
}
