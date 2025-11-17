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
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, AddAthleteDto, GenerateStreamsDto, DrawDto } from './dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать группу' })
  @ApiResponse({ status: 201, description: 'Группа создана' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список групп' })
  @ApiResponse({ status: 200, description: 'Список групп' })
  findAll(@Query('competitionId') competitionId?: string) {
    return this.groupsService.findAll(competitionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить группу по ID' })
  @ApiResponse({ status: 200, description: 'Группа найдена' })
  @ApiResponse({ status: 404, description: 'Группа не найдена' })
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Получить статистику группы' })
  @ApiResponse({ status: 200, description: 'Статистика' })
  getStatistics(@Param('id') id: string) {
    return this.groupsService.getStatistics(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить группу' })
  @ApiResponse({ status: 200, description: 'Группа обновлена' })
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить группу' })
  @ApiResponse({ status: 200, description: 'Группа удалена' })
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }

  // ============================================
  // ATHLETES MANAGEMENT
  // ============================================

  @Post(':id/athletes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить атлета в группу' })
  @ApiResponse({ status: 201, description: 'Атлет добавлен' })
  addAthlete(@Param('id') groupId: string, @Body() dto: AddAthleteDto) {
    return this.groupsService.addAthlete(groupId, dto);
  }

  @Delete(':id/athletes/:athleteId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить атлета из группы' })
  @ApiResponse({ status: 200, description: 'Атлет удален' })
  removeAthlete(
    @Param('id') groupId: string,
    @Param('athleteId') athleteId: string,
  ) {
    return this.groupsService.removeAthlete(groupId, athleteId);
  }

  @Post(':id/athletes/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменить порядок атлетов' })
  @ApiResponse({ status: 200, description: 'Порядок изменен' })
  reorderAthletes(
    @Param('id') groupId: string,
    @Body() orders: { athleteId: string; orderNumber: number }[],
  ) {
    return this.groupsService.reorderAthletes(groupId, orders);
  }

  // ============================================
  // STREAMS MANAGEMENT
  // ============================================

  @Post(':id/streams/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сгенерировать потоки' })
  @ApiResponse({ status: 201, description: 'Потоки созданы' })
  generateStreams(@Param('id') groupId: string, @Body() dto: GenerateStreamsDto) {
    return this.groupsService.generateStreams(groupId, dto);
  }

  @Delete(':id/streams')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить все потоки' })
  @ApiResponse({ status: 200, description: 'Потоки удалены' })
  deleteStreams(@Param('id') groupId: string) {
    return this.groupsService.deleteStreams(groupId);
  }

  // ============================================
  // DRAW (ЖЕРЕБЬЁВКА)
  // ============================================

  @Post(':id/draw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выполнить жеребьёвку' })
  @ApiResponse({ status: 200, description: 'Жеребьёвка выполнена' })
  performDraw(
    @Param('id') groupId: string,
    @Body() dto: DrawDto,
    @CurrentUser() user: any,
  ) {
    return this.groupsService.performDraw(groupId, dto, user?.userId);
  }
}
