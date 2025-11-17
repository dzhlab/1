import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ScoringService } from './scoring.service';
import { SubmitScoreDto } from './dto/score.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

@ApiTags('scoring')
@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHIEF_JUDGE', 'JUDGE_D', 'JUDGE_E', 'JUDGE_A')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выставить оценку (FIG 2025-2028)' })
  @ApiResponse({ status: 201, description: 'Оценка выставлена' })
  @ApiResponse({ status: 200, description: 'Оценка обновлена' })
  submitScore(@Body() dto: SubmitScoreDto) {
    return this.scoringService.submitScore(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить оценку по ID' })
  @ApiResponse({ status: 200, description: 'Оценка найдена' })
  @ApiResponse({ status: 404, description: 'Оценка не найдена' })
  getScore(@Param('id') id: string) {
    return this.scoringService.getScore(id);
  }

  @Get('competitions/:competitionId')
  @ApiOperation({ summary: 'Получить все оценки соревнования' })
  @ApiResponse({ status: 200, description: 'Список оценок' })
  getCompetitionScores(
    @Param('competitionId') competitionId: string,
    @Query('discipline') discipline?: string,
  ) {
    return this.scoringService.getCompetitionScores(competitionId, discipline);
  }

  @Get('participants/:participantId')
  @ApiOperation({ summary: 'Получить все оценки участника' })
  @ApiResponse({ status: 200, description: 'Список оценок' })
  getParticipantScores(@Param('participantId') participantId: string) {
    return this.scoringService.getParticipantScores(participantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHIEF_JUDGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить оценку' })
  @ApiResponse({ status: 200, description: 'Оценка удалена' })
  deleteScore(@Param('id') id: string) {
    return this.scoringService.deleteScore(id);
  }

  // ============================================
  // RESULTS & RANKINGS
  // ============================================

  @Get('competitions/:competitionId/results')
  @ApiOperation({ summary: 'Получить результаты с ранжированием' })
  @ApiResponse({ status: 200, description: 'Результаты соревнования' })
  getResults(@Param('competitionId') competitionId: string) {
    return this.scoringService.getResults(competitionId);
  }

  @Get('competitions/:competitionId/podium')
  @ApiOperation({ summary: 'Получить тройку лидеров' })
  @ApiResponse({ status: 200, description: 'Подиум' })
  getPodium(@Param('competitionId') competitionId: string) {
    return this.scoringService.getPodium(competitionId);
  }
}
