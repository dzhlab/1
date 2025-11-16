// apps/api/src/modules/judging/services/brigade.service.ts
// Service for managing judging brigades

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateBrigadeDto {
  name: string;
  number?: number;
  description?: string;
  competitionId?: string;
  specializationType?: string;
  createdBy?: string;
}

export interface UpdateBrigadeDto {
  name?: string;
  number?: number;
  description?: string;
  specializationType?: string;
  isActive?: boolean;
}

export interface AssignJudgeDto {
  judgeId: string;
  judgeName: string;
  judgeRole: string;
  panelType: string;
  isPrimary?: boolean;
  assignedBy?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class BrigadeService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all brigades
   */
  async findAll(params?: {
    competitionId?: string;
    isActive?: boolean;
    includeJudges?: boolean;
  }) {
    const brigades = await this.prisma.judgingBrigade.findMany({
      where: {
        competitionId: params?.competitionId,
        isActive: params?.isActive,
      },
      include: {
        judges: params?.includeJudges
          ? {
              where: { isActive: true },
              orderBy: { judgeRole: 'asc' },
            }
          : false,
        _count: {
          select: {
            judges: true,
            sessions: true,
          },
        },
      },
      orderBy: [{ number: 'asc' }, { createdAt: 'desc' }],
    });

    return brigades.map((brigade) => ({
      ...brigade,
      judgesCount: brigade._count.judges,
      sessionsCount: brigade._count.sessions,
    }));
  }

  /**
   * Get brigade by ID
   */
  async findOne(id: string, includeJudges = true) {
    const brigade = await this.prisma.judgingBrigade.findUnique({
      where: { id },
      include: {
        judges: includeJudges
          ? {
              where: { isActive: true },
              orderBy: { judgeRole: 'asc' },
            }
          : false,
        sessions: {
          select: {
            id: true,
            name: true,
            status: true,
            apparatus: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            judges: true,
            sessions: true,
          },
        },
      },
    });

    if (!brigade) {
      throw new NotFoundException(`Brigade ${id} not found`);
    }

    return {
      ...brigade,
      judgesCount: brigade._count.judges,
      sessionsCount: brigade._count.sessions,
    };
  }

  /**
   * Create new brigade
   */
  async create(dto: CreateBrigadeDto) {
    // Check if brigade with same name already exists
    const existing = await this.prisma.judgingBrigade.findFirst({
      where: {
        name: dto.name,
        competitionId: dto.competitionId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Brigade with name "${dto.name}" already exists for this competition`
      );
    }

    return this.prisma.judgingBrigade.create({
      data: {
        name: dto.name,
        number: dto.number,
        description: dto.description,
        competitionId: dto.competitionId,
        specializationType: dto.specializationType,
        createdBy: dto.createdBy,
      },
      include: {
        _count: {
          select: {
            judges: true,
          },
        },
      },
    });
  }

  /**
   * Update brigade
   */
  async update(id: string, dto: UpdateBrigadeDto) {
    const brigade = await this.prisma.judgingBrigade.findUnique({
      where: { id },
    });

    if (!brigade) {
      throw new NotFoundException(`Brigade ${id} not found`);
    }

    return this.prisma.judgingBrigade.update({
      where: { id },
      data: dto,
      include: {
        _count: {
          select: {
            judges: true,
          },
        },
      },
    });
  }

  /**
   * Delete brigade
   */
  async delete(id: string) {
    const brigade = await this.prisma.judgingBrigade.findUnique({
      where: { id },
      include: {
        judges: true,
        sessions: true,
      },
    });

    if (!brigade) {
      throw new NotFoundException(`Brigade ${id} not found`);
    }

    // Check if brigade has active sessions
    const activeSessions = brigade.sessions.filter(
      (s) => s.status === 'ACTIVE' || s.status === 'PENDING'
    );

    if (activeSessions.length > 0) {
      throw new BadRequestException(
        `Cannot delete brigade with ${activeSessions.length} active sessions. ` +
          `Please complete or cancel sessions first.`
      );
    }

    return this.prisma.judgingBrigade.delete({
      where: { id },
    });
  }

  // ==========================================================================
  // JUDGE ASSIGNMENT
  // ==========================================================================

  /**
   * Assign judge to brigade
   */
  async assignJudge(brigadeId: string, dto: AssignJudgeDto) {
    const brigade = await this.prisma.judgingBrigade.findUnique({
      where: { id: brigadeId },
    });

    if (!brigade) {
      throw new NotFoundException(`Brigade ${brigadeId} not found`);
    }

    // Check if judge already assigned
    const existing = await this.prisma.judgeInBrigade.findUnique({
      where: {
        brigadeId_judgeId: {
          brigadeId,
          judgeId: dto.judgeId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Judge ${dto.judgeName} is already assigned to this brigade`
      );
    }

    // Check if role already taken
    const roleTaken = await this.prisma.judgeInBrigade.findFirst({
      where: {
        brigadeId,
        judgeRole: dto.judgeRole,
        isPrimary: dto.isPrimary ?? true,
        isActive: true,
      },
    });

    if (roleTaken) {
      throw new BadRequestException(
        `Role ${dto.judgeRole} is already assigned to another judge in this brigade`
      );
    }

    return this.prisma.judgeInBrigade.create({
      data: {
        brigadeId,
        judgeId: dto.judgeId,
        judgeName: dto.judgeName,
        judgeRole: dto.judgeRole,
        panelType: dto.panelType,
        isPrimary: dto.isPrimary ?? true,
        assignedBy: dto.assignedBy,
      },
    });
  }

  /**
   * Update judge assignment
   */
  async updateJudgeAssignment(
    brigadeId: string,
    assignmentId: string,
    updates: { isPrimary?: boolean; isActive?: boolean }
  ) {
    const assignment = await this.prisma.judgeInBrigade.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.brigadeId !== brigadeId) {
      throw new NotFoundException(`Assignment ${assignmentId} not found in this brigade`);
    }

    return this.prisma.judgeInBrigade.update({
      where: { id: assignmentId },
      data: updates,
    });
  }

  /**
   * Remove judge from brigade
   */
  async removeJudge(brigadeId: string, assignmentId: string) {
    const assignment = await this.prisma.judgeInBrigade.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.brigadeId !== brigadeId) {
      throw new NotFoundException(`Assignment ${assignmentId} not found in this brigade`);
    }

    return this.prisma.judgeInBrigade.delete({
      where: { id: assignmentId },
    });
  }

  /**
   * Get all judges in brigade
   */
  async getBrigadeJudges(brigadeId: string) {
    return this.prisma.judgeInBrigade.findMany({
      where: {
        brigadeId,
        isActive: true,
      },
      orderBy: [{ panelType: 'asc' }, { judgeRole: 'asc' }],
    });
  }

  /**
   * Get judge's brigade assignment
   */
  async getJudgeBrigade(judgeId: string) {
    const assignments = await this.prisma.judgeInBrigade.findMany({
      where: {
        judgeId,
        isActive: true,
      },
      include: {
        brigade: {
          include: {
            sessions: {
              where: {
                status: {
                  in: ['PENDING', 'ACTIVE'],
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return assignments.map((assignment) => ({
      ...assignment,
      currentSession: assignment.brigade.sessions[0] || null,
    }));
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get brigade statistics
   */
  async getBrigadeStats(brigadeId: string) {
    const brigade = await this.prisma.judgingBrigade.findUnique({
      where: { id: brigadeId },
      include: {
        judges: {
          where: { isActive: true },
        },
        sessions: true,
      },
    });

    if (!brigade) {
      throw new NotFoundException(`Brigade ${brigadeId} not found`);
    }

    const judgesByPanel = {
      D_PANEL: brigade.judges.filter((j) => j.panelType === 'D_PANEL').length,
      E_PANEL: brigade.judges.filter((j) => j.panelType === 'E_PANEL').length,
      A_PANEL: brigade.judges.filter((j) => j.panelType === 'A_PANEL').length,
      TECHNICAL: brigade.judges.filter((j) => j.panelType === 'TECHNICAL').length,
      CONTROL: brigade.judges.filter((j) => j.panelType === 'CONTROL').length,
    };

    const sessionsByStatus = {
      PENDING: brigade.sessions.filter((s) => s.status === 'PENDING').length,
      ACTIVE: brigade.sessions.filter((s) => s.status === 'ACTIVE').length,
      COMPLETED: brigade.sessions.filter((s) => s.status === 'COMPLETED').length,
      PAUSED: brigade.sessions.filter((s) => s.status === 'PAUSED').length,
      CANCELLED: brigade.sessions.filter((s) => s.status === 'CANCELLED').length,
    };

    return {
      totalJudges: brigade.judges.length,
      judgesByPanel,
      totalSessions: brigade.sessions.length,
      sessionsByStatus,
    };
  }
}
