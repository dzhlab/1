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
import { CompetitionsService } from './competitions.service';
import { CreateCompetitionDto, UpdateCompetitionDto, AddDateDto, AddEventDto } from './dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать новое соревнование' })
  @ApiResponse({ status: 201, description: 'Соревнование создано' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  create(@Body() dto: CreateCompetitionDto, @CurrentUser() user: any) {
    return this.competitionsService.create(dto, user?.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех соревнований' })
  @ApiResponse({ status: 200, description: 'Список соревнований' })
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('city') city?: string,
  ) {
    return this.competitionsService.findAll({ status, category, city });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить соревнование по ID' })
  @ApiResponse({ status: 200, description: 'Соревнование найдено' })
  @ApiResponse({ status: 404, description: 'Соревнование не найдено' })
  findOne(@Param('id') id: string) {
    return this.competitionsService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Получить статистику соревнования' })
  @ApiResponse({ status: 200, description: 'Статистика' })
  getStatistics(@Param('id') id: string) {
    return this.competitionsService.getStatistics(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить соревнование' })
  @ApiResponse({ status: 200, description: 'Соревнование обновлено' })
  @ApiResponse({ status: 404, description: 'Соревнование не найдено' })
  update(@Param('id') id: string, @Body() dto: UpdateCompetitionDto) {
    return this.competitionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить соревнование' })
  @ApiResponse({ status: 200, description: 'Соревнование удалено' })
  @ApiResponse({ status: 404, description: 'Соревнование не найдено' })
  remove(@Param('id') id: string) {
    return this.competitionsService.remove(id);
  }

  // ============================================
  // DATE MANAGEMENT
  // ============================================

  @Post(':id/dates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить дату к соревнованию' })
  @ApiResponse({ status: 201, description: 'Дата добавлена' })
  addDate(@Param('id') competitionId: string, @Body() dto: AddDateDto) {
    return this.competitionsService.addDate(competitionId, dto);
  }

  @Patch('dates/:dateId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить дату' })
  @ApiResponse({ status: 200, description: 'Дата обновлена' })
  updateDate(
    @Param('dateId') dateId: string,
    @Body() dto: { startTime?: string; date?: string },
  ) {
    return this.competitionsService.updateDate(dateId, dto);
  }

  @Delete('dates/:dateId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить дату' })
  @ApiResponse({ status: 200, description: 'Дата удалена' })
  removeDate(@Param('dateId') dateId: string) {
    return this.competitionsService.removeDate(dateId);
  }

  // ============================================
  // EVENT MANAGEMENT
  // ============================================

  @Post('dates/:dateId/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить событие к дате' })
  @ApiResponse({ status: 201, description: 'Событие добавлено' })
  addEvent(@Param('dateId') dateId: string, @Body() dto: AddEventDto) {
    return this.competitionsService.addEvent(dateId, dto);
  }

  @Patch('events/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить событие' })
  @ApiResponse({ status: 200, description: 'Событие обновлено' })
  updateEvent(@Param('eventId') eventId: string, @Body() dto: Partial<AddEventDto>) {
    return this.competitionsService.updateEvent(eventId, dto);
  }

  @Delete('events/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER', 'CHIEF_JUDGE', 'SECRETARY', 'TECHNICAL_SPECIALIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить событие' })
  @ApiResponse({ status: 200, description: 'Событие удалено' })
  removeEvent(@Param('eventId') eventId: string) {
    return this.competitionsService.removeEvent(eventId);
  }
}
