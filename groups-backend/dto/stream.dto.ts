// apps/api/src/modules/streams/dto/stream.dto.ts

import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, Matches } from 'class-validator';

export class GenerateStreamsDto {
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  athletesPerStream?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  minAthletesPerStream?: number;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'streamStartTime must be in HH:MM format',
  })
  @IsOptional()
  streamStartTime?: string;

  @IsInt()
  @Min(30)
  @Max(300)
  @IsOptional()
  performanceDuration?: number;

  @IsString({ each: true })
  @IsOptional()
  subgroups?: string[];

  @IsInt()
  @Min(60)
  @Max(1800)
  @IsOptional()
  breakDuration?: number;
}

export class UpdateStreamDto {
  @IsString()
  @IsOptional()
  subgroup?: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format',
  })
  @IsOptional()
  startTime?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  athletesCount?: number;
}

export class AssignAthleteToStreamDto {
  @IsString()
  @IsNotEmpty()
  athleteId: string;
}
