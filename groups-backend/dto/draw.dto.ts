// apps/api/src/modules/draw/dto/draw.dto.ts

import { IsEnum, IsOptional, IsObject } from 'class-validator';

export enum DrawStrategy {
  RANDOM = 'random',
  BY_APPARATUS = 'by_apparatus',
  BY_SUBGROUP = 'by_subgroup',
  BY_GROUP = 'by_group',
}

export class PerformDrawDto {
  @IsEnum(DrawStrategy)
  strategy: DrawStrategy;

  @IsObject()
  @IsOptional()
  options?: Record<string, any>;
}

export class DrawHistoryQueryDto {
  @IsOptional()
  limit?: number;
}
