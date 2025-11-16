// apps/api/src/modules/judging/controllers/brigade.controller.ts
// REST API endpoints for brigade management

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BrigadeService, CreateBrigadeDto, UpdateBrigadeDto, AssignJudgeDto } from '../services/brigade.service';

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller('brigades')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class BrigadeController {
  constructor(private readonly brigadeService: BrigadeService) {}

  // ==========================================================================
  // BRIGADE CRUD
  // ==========================================================================

  /**
   * GET /brigades
   * Get all brigades
   */
  @Get()
  async findAll(
    @Query('competitionId') competitionId?: string,
    @Query('isActive') isActive?: string,
    @Query('includeJudges') includeJudges?: string,
  ) {
    return this.brigadeService.findAll({
      competitionId,
      isActive: isActive === 'true',
      includeJudges: includeJudges === 'true',
    });
  }

  /**
   * GET /brigades/:id
   * Get brigade by ID
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('includeJudges') includeJudges?: string,
  ) {
    return this.brigadeService.findOne(id, includeJudges !== 'false');
  }

  /**
   * POST /brigades
   * Create new brigade
   */
  @Post()
  async create(@Body() dto: CreateBrigadeDto, @Request() req?: any) {
    return this.brigadeService.create({
      ...dto,
      createdBy: req?.user?.id, // From JWT token
    });
  }

  /**
   * PATCH /brigades/:id
   * Update brigade
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBrigadeDto) {
    return this.brigadeService.update(id, dto);
  }

  /**
   * DELETE /brigades/:id
   * Delete brigade
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.brigadeService.delete(id);
  }

  // ==========================================================================
  // JUDGE ASSIGNMENT
  // ==========================================================================

  /**
   * GET /brigades/:id/judges
   * Get all judges in brigade
   */
  @Get(':id/judges')
  async getBrigadeJudges(@Param('id') id: string) {
    return this.brigadeService.getBrigadeJudges(id);
  }

  /**
   * POST /brigades/:id/judges
   * Assign judge to brigade
   */
  @Post(':id/judges')
  async assignJudge(
    @Param('id') brigadeId: string,
    @Body() dto: AssignJudgeDto,
    @Request() req?: any,
  ) {
    return this.brigadeService.assignJudge(brigadeId, {
      ...dto,
      assignedBy: req?.user?.id,
    });
  }

  /**
   * PATCH /brigades/:id/judges/:assignmentId
   * Update judge assignment
   */
  @Patch(':id/judges/:assignmentId')
  async updateJudgeAssignment(
    @Param('id') brigadeId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() updates: { isPrimary?: boolean; isActive?: boolean },
  ) {
    return this.brigadeService.updateJudgeAssignment(
      brigadeId,
      assignmentId,
      updates,
    );
  }

  /**
   * DELETE /brigades/:id/judges/:assignmentId
   * Remove judge from brigade
   */
  @Delete(':id/judges/:assignmentId')
  async removeJudge(
    @Param('id') brigadeId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.brigadeService.removeJudge(brigadeId, assignmentId);
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * GET /brigades/:id/stats
   * Get brigade statistics
   */
  @Get(':id/stats')
  async getBrigadeStats(@Param('id') id: string) {
    return this.brigadeService.getBrigadeStats(id);
  }
}

// ============================================================================
// JUDGE LOGIN CONTROLLER
// ============================================================================

@Controller('auth')
export class JudgeAuthController {
  constructor(private readonly brigadeService: BrigadeService) {}

  /**
   * POST /auth/judge-login
   * Simplified login for judges
   */
  @Post('judge-login')
  async judgeLogin(
    @Body() body: { judgeId: string; brigadeId: string },
  ) {
    // Get judge's brigade assignment
    const assignments = await this.brigadeService.getJudgeBrigade(body.judgeId);

    const assignment = assignments.find((a) => a.brigadeId === body.brigadeId);

    if (!assignment) {
      throw new Error('Judge not assigned to this brigade');
    }

    // Generate JWT token (simplified - should use real JWT)
    const token = Buffer.from(
      JSON.stringify({
        userId: body.judgeId,
        name: assignment.judgeName,
        role: assignment.judgeRole,
        panelType: assignment.panelType,
        brigadeId: body.brigadeId,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      })
    ).toString('base64');

    return {
      token,
      sessionId: assignment.currentSession?.id || null,
      judge: {
        id: body.judgeId,
        name: assignment.judgeName,
        role: assignment.judgeRole,
        panelType: assignment.panelType,
      },
      brigade: {
        id: body.brigadeId,
        name: assignment.brigade.name,
      },
    };
  }

  /**
   * GET /auth/judge-brigades/:judgeId
   * Get all brigades for a judge
   */
  @Get('judge-brigades/:judgeId')
  async getJudgeBrigades(@Param('judgeId') judgeId: string) {
    return this.brigadeService.getJudgeBrigade(judgeId);
  }
}
