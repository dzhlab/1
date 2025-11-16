// apps/api/src/modules/competitions/competitions.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompetitionsService } from './competitions.service';
import { JudgesService } from '../judges/judges.service';
import { RankingService } from '../ranking/ranking.service';
import { EventsGateway } from '../websocket/events.gateway';
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
  AddJudgeDto,
  UpdateJudgeDto,
  ReorderJudgesDto,
} from './dto';

@Controller('api/competitions')
export class CompetitionsController {
  constructor(
    private readonly competitionsService: CompetitionsService,
    private readonly judgesService: JudgesService,
    private readonly rankingService: RankingService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ============================================
  // COMPETITIONS CRUD
  // ============================================

  @Post()
  async create(@Body() dto: CreateCompetitionDto) {
    const competition = await this.competitionsService.create(dto);

    // Отправить WebSocket событие
    this.eventsGateway.emitCompetitionCreated(competition);

    return competition;
  }

  @Get()
  async findAll(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.competitionsService.findAll({
      city,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.competitionsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompetitionDto,
  ) {
    const competition = await this.competitionsService.update(id, dto);

    // WebSocket событие
    this.eventsGateway.emitCompetitionUpdated(id, competition);

    return competition;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.competitionsService.remove(id);

    // WebSocket событие
    this.eventsGateway.emitCompetitionDeleted(id);

    return { success: true };
  }

  // ============================================
  // LOGO UPLOAD
  // ============================================

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|svg)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.competitionsService.uploadLogo(id, file);

    // WebSocket событие
    this.eventsGateway.emitCompetitionUpdated(id, result);

    return result;
  }

  // ============================================
  // JUDGES MANAGEMENT
  // ============================================

  @Get(':id/judges')
  async getJudges(@Param('id') id: string) {
    return this.judgesService.getCompetitionJudges(id);
  }

  @Post(':id/judges')
  async addJudge(
    @Param('id') competitionId: string,
    @Body() dto: AddJudgeDto,
  ) {
    const judge = await this.judgesService.addJudgeToCompetition(
      competitionId,
      dto,
    );

    // WebSocket событие
    this.eventsGateway.emitJudgeAdded(competitionId, judge);

    return judge;
  }

  @Patch(':competitionId/judges/:judgeId')
  async updateJudge(
    @Param('competitionId') competitionId: string,
    @Param('judgeId') judgeId: string,
    @Body() dto: UpdateJudgeDto,
  ) {
    const judge = await this.judgesService.updateJudge(judgeId, dto);

    // WebSocket событие
    this.eventsGateway.emitJudgeUpdated(competitionId, judgeId, judge);

    return judge;
  }

  @Delete(':competitionId/judges/:judgeId')
  async removeJudge(
    @Param('competitionId') competitionId: string,
    @Param('judgeId') judgeId: string,
  ) {
    await this.judgesService.removeJudgeFromCompetition(competitionId, judgeId);

    // WebSocket событие
    this.eventsGateway.emitJudgeDeleted(competitionId, judgeId);

    return { success: true };
  }

  @Post(':id/judges/reorder')
  async reorderJudges(
    @Param('id') competitionId: string,
    @Body() dto: ReorderJudgesDto,
  ) {
    const judges = await this.judgesService.reorderJudges(
      competitionId,
      dto.orders,
    );

    // WebSocket событие
    this.eventsGateway.emitJudgesReordered(competitionId, judges);

    return judges;
  }

  @Post(':id/judges/brigades')
  async formBrigades(@Param('id') competitionId: string) {
    const result = await this.judgesService.formBrigades(competitionId);

    // WebSocket событие
    this.eventsGateway.emitBrigadesFormed(competitionId, result);

    return result;
  }

  @Post(':id/judges/import')
  @UseInterceptors(FileInterceptor('file'))
  async importJudges(
    @Param('id') competitionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const judges = await this.judgesService.importFromExcel(
      competitionId,
      file.buffer,
    );

    // WebSocket событие
    this.eventsGateway.emitJudgesImported(competitionId, judges);

    return judges;
  }

  @Get(':id/judges/export')
  async exportJudges(@Param('id') competitionId: string) {
    const buffer = await this.judgesService.exportToExcel(competitionId);

    return {
      data: buffer.toString('base64'),
      filename: `judges_${competitionId}_${Date.now()}.xlsx`,
    };
  }

  // ============================================
  // RESULTS & RANKING
  // ============================================

  @Get(':id/results')
  async getResults(@Param('id') competitionId: string) {
    return this.rankingService.calculateRanking(competitionId);
  }

  @Get(':id/podium')
  async getPodium(@Param('id') competitionId: string) {
    const results = await this.rankingService.calculateRanking(competitionId);
    return results.slice(0, 3); // Top 3
  }

  @Post(':id/recalculate')
  async recalculate(@Param('id') competitionId: string) {
    const results = await this.rankingService.calculateRanking(competitionId);

    // WebSocket событие
    this.eventsGateway.emitResultsRecalculated(competitionId, results);

    return results;
  }
}
