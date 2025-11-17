import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto, UpdateParticipantDto } from './dto/create-participant.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

@ApiTags('participants')
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать участника' })
  create(@Body() dto: CreateParticipantDto) {
    return this.participantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список участников' })
  findAll(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('club') club?: string,
  ) {
    return this.participantsService.findAll({ category, city, club });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить участника по ID' })
  findOne(@Param('id') id: string) {
    return this.participantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить участника' })
  update(@Param('id') id: string, @Body() dto: UpdateParticipantDto) {
    return this.participantsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить участника' })
  remove(@Param('id') id: string) {
    return this.participantsService.remove(id);
  }

  @Post(':id/competitions/:competitionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить участника в соревнование' })
  addToCompetition(
    @Param('id') participantId: string,
    @Param('competitionId') competitionId: string,
  ) {
    return this.participantsService.addToCompetition(participantId, competitionId);
  }

  @Delete(':id/competitions/:competitionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить участника из соревнования' })
  removeFromCompetition(
    @Param('id') participantId: string,
    @Param('competitionId') competitionId: string,
  ) {
    return this.participantsService.removeFromCompetition(participantId, competitionId);
  }
}
