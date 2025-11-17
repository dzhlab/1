import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JudgesService } from './judges.service';
import { CreateJudgeDto, UpdateJudgeDto, AssignJudgeToCompetitionDto } from './dto/judge.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

@ApiTags('judges')
@Controller('judges')
export class JudgesController {
  constructor(private readonly judgesService: JudgesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать судью' })
  @ApiResponse({ status: 201, description: 'Судья создан' })
  create(@Body() dto: CreateJudgeDto) {
    return this.judgesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список судей' })
  @ApiResponse({ status: 200, description: 'Список судей' })
  findAll(@Query('search') search?: string) {
    return this.judgesService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить судью по ID' })
  @ApiResponse({ status: 200, description: 'Судья найден' })
  findOne(@Param('id') id: string) {
    return this.judgesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить судью' })
  @ApiResponse({ status: 200, description: 'Судья обновлен' })
  update(@Param('id') id: string, @Body() dto: UpdateJudgeDto) {
    return this.judgesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить судью' })
  @ApiResponse({ status: 200, description: 'Судья удален' })
  remove(@Param('id') id: string) {
    return this.judgesService.remove(id);
  }

  // ============================================
  // COMPETITION ASSIGNMENTS
  // ============================================

  @Post('competitions/:competitionId/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Назначить судью на соревнование' })
  @ApiResponse({ status: 201, description: 'Судья назначен' })
  assignToCompetition(
    @Param('competitionId') competitionId: string,
    @Body() dto: AssignJudgeToCompetitionDto,
  ) {
    return this.judgesService.assignToCompetition(competitionId, dto);
  }

  @Delete('competitions/:competitionId/:judgeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить судью с соревнования' })
  @ApiResponse({ status: 200, description: 'Судья удален' })
  removeFromCompetition(
    @Param('competitionId') competitionId: string,
    @Param('judgeId') judgeId: string,
  ) {
    return this.judgesService.removeFromCompetition(competitionId, judgeId);
  }

  @Get('competitions/:competitionId')
  @ApiOperation({ summary: 'Получить судей соревнования' })
  @ApiResponse({ status: 200, description: 'Список судей' })
  getCompetitionJudges(
    @Param('competitionId') competitionId: string,
    @Query('brigade') brigade?: string,
  ) {
    return this.judgesService.getCompetitionJudges(competitionId, brigade);
  }

  @Post('competitions/:competitionId/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменить порядок судей' })
  @ApiResponse({ status: 200, description: 'Порядок изменен' })
  reorderJudges(
    @Param('competitionId') competitionId: string,
    @Body() orders: { judgeId: string; position: number }[],
  ) {
    return this.judgesService.reorderJudges(competitionId, orders);
  }
}
