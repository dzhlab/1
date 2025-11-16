// apps/api/src/modules/groups/groups.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GroupsService } from './groups.service';
import { AthletesService } from '../athletes/athletes.service';
import { StreamsService } from '../streams/streams.service';
import { DrawService } from '../draw/draw.service';
import { ExcelService } from '../excel/excel.service';
import { GroupsGateway } from '../websocket/groups.gateway';
import {
  CreateGroupDto,
  UpdateGroupDto,
  GroupFilterDto,
  CreateAthleteDto,
  UpdateAthleteDto,
  ReorderAthletesDto,
  PerformDrawDto,
  GenerateStreamsDto,
} from './dto';

@Controller('api/groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly athletesService: AthletesService,
    private readonly streamsService: StreamsService,
    private readonly drawService: DrawService,
    private readonly excelService: ExcelService,
    private readonly groupsGateway: GroupsGateway,
  ) {}

  // ============================================
  // GROUP CRUD
  // ============================================

  @Get()
  async findAll(@Query() filter: GroupFilterDto) {
    return this.groupsService.findAll(filter);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post()
  async create(@Body() createGroupDto: CreateGroupDto) {
    const group = await this.groupsService.create(createGroupDto);

    // Emit WebSocket event
    this.groupsGateway.emitGroupCreated(group);

    return group;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    const group = await this.groupsService.update(id, updateGroupDto);

    // Emit WebSocket event
    this.groupsGateway.emitGroupUpdated(id, group);

    return group;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.groupsService.remove(id);

    // Emit WebSocket event
    this.groupsGateway.emitGroupDeleted(id);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    const group = await this.groupsService.duplicate(id);

    this.groupsGateway.emitGroupCreated(group);

    return group;
  }

  // ============================================
  // ATHLETES MANAGEMENT
  // ============================================

  @Get(':groupId/athletes')
  async getAthletes(@Param('groupId') groupId: string) {
    return this.athletesService.findByGroup(groupId);
  }

  @Post(':groupId/athletes')
  async addAthlete(
    @Param('groupId') groupId: string,
    @Body() createAthleteDto: CreateAthleteDto,
  ) {
    const athlete = await this.athletesService.create(groupId, createAthleteDto);

    // Emit WebSocket event
    this.groupsGateway.emitAthleteAdded(groupId, athlete);

    return athlete;
  }

  @Put(':groupId/athletes/:id')
  async updateAthlete(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body() updateAthleteDto: UpdateAthleteDto,
  ) {
    const athlete = await this.athletesService.update(id, updateAthleteDto);

    // Emit WebSocket event
    this.groupsGateway.emitAthleteUpdated(groupId, id, athlete);

    return athlete;
  }

  @Delete(':groupId/athletes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAthlete(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
  ) {
    await this.athletesService.remove(id);

    // Emit WebSocket event
    this.groupsGateway.emitAthleteDeleted(groupId, id);
  }

  @Post(':groupId/athletes/reorder')
  async reorderAthletes(
    @Param('groupId') groupId: string,
    @Body() reorderDto: ReorderAthletesDto,
  ) {
    const athletes = await this.athletesService.reorder(groupId, reorderDto.orders);

    // Emit WebSocket event
    this.groupsGateway.emitAthletesReordered(groupId, athletes);

    return athletes;
  }

  @Post(':groupId/athletes/:id/move-up')
  async moveAthleteUp(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
  ) {
    const athletes = await this.athletesService.moveUp(id);

    this.groupsGateway.emitAthletesReordered(groupId, athletes);

    return athletes;
  }

  @Post(':groupId/athletes/:id/move-down')
  async moveAthleteDown(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
  ) {
    const athletes = await this.athletesService.moveDown(id);

    this.groupsGateway.emitAthletesReordered(groupId, athletes);

    return athletes;
  }

  @Post(':groupId/athletes/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAthletes(@Param('groupId') groupId: string) {
    await this.athletesService.clear(groupId);

    // Emit WebSocket event
    this.groupsGateway.emitAthletesCleared(groupId);
  }

  // ============================================
  // DRAW / LOTTERY
  // ============================================

  @Post(':groupId/draw')
  async performDraw(
    @Param('groupId') groupId: string,
    @Body() drawDto: PerformDrawDto,
  ) {
    // Emit start event
    this.groupsGateway.emitDrawStarted(groupId, drawDto.strategy);

    const result = await this.drawService.performDraw(
      groupId,
      drawDto.strategy,
      drawDto.options,
    );

    // Emit completion event
    this.groupsGateway.emitDrawCompleted(groupId, result);

    return result;
  }

  @Post(':groupId/draw/random')
  async performRandomDraw(@Param('groupId') groupId: string) {
    this.groupsGateway.emitDrawStarted(groupId, 'random');

    const result = await this.drawService.randomDraw(groupId);

    this.groupsGateway.emitDrawCompleted(groupId, result);

    return result;
  }

  @Post(':groupId/draw/by-apparatus')
  async performApparatusDraw(@Param('groupId') groupId: string) {
    this.groupsGateway.emitDrawStarted(groupId, 'by_apparatus');

    const result = await this.drawService.apparatusDraw(groupId);

    this.groupsGateway.emitDrawCompleted(groupId, result);

    return result;
  }

  @Post(':groupId/draw/by-subgroup')
  async performSubgroupDraw(@Param('groupId') groupId: string) {
    this.groupsGateway.emitDrawStarted(groupId, 'by_subgroup');

    const result = await this.drawService.subgroupDraw(groupId);

    this.groupsGateway.emitDrawCompleted(groupId, result);

    return result;
  }

  @Post(':groupId/draw/by-group')
  async performGroupDraw(@Param('groupId') groupId: string) {
    this.groupsGateway.emitDrawStarted(groupId, 'by_group');

    const result = await this.drawService.groupDraw(groupId);

    this.groupsGateway.emitDrawCompleted(groupId, result);

    return result;
  }

  // ============================================
  // STREAMS MANAGEMENT
  // ============================================

  @Get(':groupId/streams')
  async getStreams(@Param('groupId') groupId: string) {
    return this.streamsService.findByGroup(groupId);
  }

  @Post(':groupId/streams/generate')
  async generateStreams(
    @Param('groupId') groupId: string,
    @Body() generateDto: GenerateStreamsDto,
  ) {
    const streams = await this.streamsService.generate(groupId, generateDto);

    // Emit WebSocket event
    this.groupsGateway.emitStreamsGenerated(groupId, streams);

    return streams;
  }

  @Put(':groupId/streams/:id')
  async updateStream(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    const stream = await this.streamsService.update(id, updateDto);

    this.groupsGateway.emitStreamUpdated(groupId, id, stream);

    return stream;
  }

  @Delete(':groupId/streams/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStream(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
  ) {
    await this.streamsService.remove(id);

    this.groupsGateway.emitStreamDeleted(groupId, id);
  }

  @Post(':groupId/streams/:streamId/assign')
  async assignAthletesToStream(
    @Param('groupId') groupId: string,
    @Param('streamId') streamId: string,
    @Body() body: { athleteIds: string[] },
  ) {
    const stream = await this.streamsService.assignAthletes(streamId, body.athleteIds);

    this.groupsGateway.emitAthletesAssigned(groupId, streamId, body.athleteIds);

    return stream;
  }

  // ============================================
  // EXCEL IMPORT / EXPORT
  // ============================================

  @Post(':groupId/import')
  @UseInterceptors(FileInterceptor('file'))
  async importAthletes(
    @Param('groupId') groupId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType: /(xlsx|xls)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Emit start event
    this.groupsGateway.emitImportStarted(groupId);

    try {
      const result = await this.excelService.importAthletes(
        groupId,
        file.buffer,
        (progress) => {
          // Emit progress
          this.groupsGateway.emitImportProgress(groupId, progress.processed, progress.total);
        },
      );

      // Emit completion event
      this.groupsGateway.emitImportCompleted(groupId, result);

      return result;
    } catch (error) {
      // Emit error event
      this.groupsGateway.emitImportError(groupId, error.message);
      throw error;
    }
  }

  @Get(':groupId/export')
  async exportAthletes(@Param('groupId') groupId: string) {
    const buffer = await this.excelService.exportAthletes(groupId);

    return {
      buffer: buffer.toString('base64'),
      filename: `athletes_${groupId}_${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  @Get(':groupId/template')
  async downloadTemplate(@Param('groupId') groupId: string) {
    const buffer = await this.excelService.generateTemplate(groupId);

    return {
      buffer: buffer.toString('base64'),
      filename: 'athletes_template.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  @Post(':groupId/validate-import')
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(
    @Param('groupId') groupId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.excelService.validateImport(groupId, file.buffer);
  }

  // ============================================
  // STATISTICS
  // ============================================

  @Get(':groupId/stats')
  async getStatistics(@Param('groupId') groupId: string) {
    return this.groupsService.getStatistics(groupId);
  }

  @Get(':groupId/history')
  async getHistory(@Param('groupId') groupId: string) {
    return this.groupsService.getHistory(groupId);
  }

  @Get(':groupId/draw-history')
  async getDrawHistory(@Param('groupId') groupId: string) {
    return this.drawService.getHistory(groupId);
  }
}
