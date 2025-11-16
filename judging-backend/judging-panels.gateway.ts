// apps/api/src/modules/judging/websocket/judging-panels.gateway.ts
// Updated WebSocket Gateway for Panel-Specific Judging

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================================================
// TYPES
// ============================================================================

interface JudgeSocket extends Socket {
  data: {
    userId: string;
    judgeId: string;
    judgeName: string;
    judgeRole: string;
    panelType: string;
    sessionId?: string;
  };
}

interface DScoreSubmitData {
  sessionId: string;
  performerId: string;
  scoreData: {
    bodyDifficulties: Array<{ code: string; value: number; validated: boolean }>;
    apparatusDifficulties: Array<{ code: string; value: number; validated: boolean }>;
    totalBD: number;
    totalAD: number;
    totalD: number;
    notes?: string;
  };
}

interface EScoreSubmitData {
  sessionId: string;
  performerId: string;
  scoreData: {
    artisticDeductions: any[];
    technicalDeductions: any[];
    lineFaults: number;
    linePenalty: number;
    totalArtisticDeductions: number;
    totalTechnicalDeductions: number;
    totalDeductions: number;
    finalE: number;
    notes?: string;
  };
}

interface AScoreSubmitData {
  sessionId: string;
  performerId: string;
  scoreData: {
    musicRelation: number;
    bodyExpression: number;
    spaceUse: number;
    composition: number;
    unity: number;
    totalA: number;
    notes?: string;
  };
}

// ============================================================================
// GATEWAY
// ============================================================================

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/judging',
})
export class JudgingPanelsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('JudgingPanelsGateway');

  // Track judges in each session
  private sessionsMap = new Map<string, Set<string>>(); // sessionId -> Set<socketId>

  constructor(private prisma: PrismaService) {}

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * Handle client connection
   */
  async handleConnection(@ConnectedSocket() client: JudgeSocket) {
    try {
      // Authenticate from handshake
      const token = client.handshake.auth.token;
      const user = await this.authenticateToken(token);

      if (!user) {
        client.disconnect();
        return;
      }

      // Store user data in socket
      client.data.userId = user.id;
      client.data.judgeName = user.name;
      client.data.judgeRole = user.role;
      client.data.panelType = this.getPanelTypeFromRole(user.role);

      this.logger.log(`Judge connected: ${user.name} (${user.role}, ${client.data.panelType})`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(@ConnectedSocket() client: JudgeSocket) {
    const { judgeName, sessionId } = client.data;

    if (sessionId) {
      // Remove from session
      const judges = this.sessionsMap.get(sessionId);
      if (judges) {
        judges.delete(client.id);

        // Update connection status in DB
        await this.prisma.judgeAssignment.updateMany({
          where: {
            sessionId,
            judgeId: client.data.userId,
          },
          data: {
            isConnected: false,
            disconnectedAt: new Date(),
          },
        });

        // Notify other judges and chief judge
        this.emitToSession(sessionId, 'judge:disconnected', {
          judgeId: client.data.userId,
          judgeName,
          judgeRole: client.data.judgeRole,
          disconnectedAt: new Date(),
        });

        this.logger.log(`Judge disconnected: ${judgeName} from session ${sessionId}`);
      }
    }
  }

  // ==========================================================================
  // SESSION JOINING
  // ==========================================================================

  @SubscribeMessage('join:session')
  async handleJoinSession(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const { sessionId } = data;

      // Verify judge is assigned to this session
      const judgeAssignment = await this.prisma.judgeAssignment.findFirst({
        where: {
          sessionId,
          judgeId: client.data.userId,
        },
      });

      if (!judgeAssignment) {
        client.emit('error', {
          message: 'You are not assigned to this session',
        });
        return;
      }

      // Join socket room
      client.join(`session:${sessionId}`);
      client.data.sessionId = sessionId;

      // Add to sessions map
      if (!this.sessionsMap.has(sessionId)) {
        this.sessionsMap.set(sessionId, new Set());
      }
      this.sessionsMap.get(sessionId)!.add(client.id);

      // Update connection status
      await this.prisma.judgeAssignment.update({
        where: { id: judgeAssignment.id },
        data: {
          isConnected: true,
          connectedAt: new Date(),
          lastSeen: new Date(),
        },
      });

      // Get current session state
      const session = await this.prisma.judgingSession.findUnique({
        where: { id: sessionId },
        include: {
          athletes: {
            orderBy: { orderNumber: 'asc' },
          },
          judges: true,
        },
      });

      const currentPerformer = session?.athletes[session.currentAthleteIndex];

      // Get judge's existing score for current performer (if any)
      let myScore = null;
      if (currentPerformer) {
        myScore = await this.prisma.score.findUnique({
          where: {
            sessionId_performerId_judgeAssignmentId: {
              sessionId,
              performerId: currentPerformer.id,
              judgeAssignmentId: judgeAssignment.id,
            },
          },
          include: {
            dPanelData: true,
            ePanelData: true,
            aPanelData: true,
          },
        });
      }

      // Get other judges' status in same panel
      const otherJudges = await this.getOtherJudgesStatus(
        sessionId,
        client.data.panelType,
        client.data.judgeRole,
        currentPerformer?.id,
      );

      // Send current state to judge
      client.emit('session:joined', {
        sessionId,
        sessionStatus: session?.status,
        currentPerformer,
        myScore,
        otherDJudges: client.data.panelType === 'D_PANEL' ? otherJudges : undefined,
        otherEJudges: client.data.panelType === 'E_PANEL' ? otherJudges : undefined,
        otherAJudges: client.data.panelType === 'A_PANEL' ? otherJudges : undefined,
      });

      // Notify others
      this.emitToSession(sessionId, 'judge:connected', {
        judgeId: client.data.userId,
        judgeName: client.data.judgeName,
        judgeRole: client.data.judgeRole,
        panelType: client.data.panelType,
      });

      this.logger.log(`Judge ${client.data.judgeName} joined session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error joining session: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // ==========================================================================
  // D-PANEL SCORING
  // ==========================================================================

  @SubscribeMessage('d:score:submit')
  async handleDScoreSubmit(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: DScoreSubmitData,
  ) {
    try {
      const { sessionId, performerId, scoreData } = data;

      // Get judge assignment
      const judgeAssignment = await this.prisma.judgeAssignment.findFirst({
        where: {
          sessionId,
          judgeId: client.data.userId,
        },
      });

      if (!judgeAssignment) {
        throw new Error('Judge assignment not found');
      }

      // Create or update score
      const score = await this.prisma.score.upsert({
        where: {
          sessionId_performerId_judgeAssignmentId: {
            sessionId,
            performerId,
            judgeAssignmentId: judgeAssignment.id,
          },
        },
        create: {
          sessionId,
          performerId,
          judgeAssignmentId: judgeAssignment.id,
          value: scoreData.totalD,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          dPanelData: {
            create: {
              bodyDifficulties: scoreData.bodyDifficulties,
              apparatusDifficulties: scoreData.apparatusDifficulties,
              totalBD: scoreData.totalBD,
              totalAD: scoreData.totalAD,
              totalD: scoreData.totalD,
              notes: scoreData.notes,
            },
          },
        },
        update: {
          value: scoreData.totalD,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          version: { increment: 1 },
          dPanelData: {
            upsert: {
              create: {
                bodyDifficulties: scoreData.bodyDifficulties,
                apparatusDifficulties: scoreData.apparatusDifficulties,
                totalBD: scoreData.totalBD,
                totalAD: scoreData.totalAD,
                totalD: scoreData.totalD,
                notes: scoreData.notes,
              },
              update: {
                bodyDifficulties: scoreData.bodyDifficulties,
                apparatusDifficulties: scoreData.apparatusDifficulties,
                totalBD: scoreData.totalBD,
                totalAD: scoreData.totalAD,
                totalD: scoreData.totalD,
                notes: scoreData.notes,
              },
            },
          },
        },
        include: {
          dPanelData: true,
        },
      });

      // Broadcast to session
      this.emitToSession(sessionId, 'd:score:submitted', {
        judgeId: client.data.userId,
        judgeRole: client.data.judgeRole,
        performerId,
        totalD: scoreData.totalD,
        timestamp: new Date(),
      });

      // Check if all judges submitted
      await this.checkAllJudgesSubmitted(sessionId, performerId);

      this.logger.log(
        `D-score submitted by ${client.data.judgeRole}: ${scoreData.totalD.toFixed(3)}`,
      );
    } catch (error) {
      this.logger.error(`Error submitting D-score: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // ==========================================================================
  // E-PANEL SCORING
  // ==========================================================================

  @SubscribeMessage('e:score:submit')
  async handleEScoreSubmit(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: EScoreSubmitData,
  ) {
    try {
      const { sessionId, performerId, scoreData } = data;

      const judgeAssignment = await this.prisma.judgeAssignment.findFirst({
        where: {
          sessionId,
          judgeId: client.data.userId,
        },
      });

      if (!judgeAssignment) {
        throw new Error('Judge assignment not found');
      }

      const score = await this.prisma.score.upsert({
        where: {
          sessionId_performerId_judgeAssignmentId: {
            sessionId,
            performerId,
            judgeAssignmentId: judgeAssignment.id,
          },
        },
        create: {
          sessionId,
          performerId,
          judgeAssignmentId: judgeAssignment.id,
          value: scoreData.finalE,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          ePanelData: {
            create: {
              artisticDeductions: scoreData.artisticDeductions,
              technicalDeductions: scoreData.technicalDeductions,
              lineFaults: scoreData.lineFaults,
              linePenalty: scoreData.linePenalty,
              totalArtisticDeductions: scoreData.totalArtisticDeductions,
              totalTechnicalDeductions: scoreData.totalTechnicalDeductions,
              totalDeductions: scoreData.totalDeductions,
              finalE: scoreData.finalE,
              notes: scoreData.notes,
            },
          },
        },
        update: {
          value: scoreData.finalE,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          version: { increment: 1 },
          ePanelData: {
            upsert: {
              create: {
                artisticDeductions: scoreData.artisticDeductions,
                technicalDeductions: scoreData.technicalDeductions,
                lineFaults: scoreData.lineFaults,
                linePenalty: scoreData.linePenalty,
                totalArtisticDeductions: scoreData.totalArtisticDeductions,
                totalTechnicalDeductions: scoreData.totalTechnicalDeductions,
                totalDeductions: scoreData.totalDeductions,
                finalE: scoreData.finalE,
                notes: scoreData.notes,
              },
              update: {
                artisticDeductions: scoreData.artisticDeductions,
                technicalDeductions: scoreData.technicalDeductions,
                lineFaults: scoreData.lineFaults,
                linePenalty: scoreData.linePenalty,
                totalArtisticDeductions: scoreData.totalArtisticDeductions,
                totalTechnicalDeductions: scoreData.totalTechnicalDeductions,
                totalDeductions: scoreData.totalDeductions,
                finalE: scoreData.finalE,
                notes: scoreData.notes,
              },
            },
          },
        },
      });

      this.emitToSession(sessionId, 'e:score:submitted', {
        judgeId: client.data.userId,
        judgeRole: client.data.judgeRole,
        performerId,
        finalE: scoreData.finalE,
        timestamp: new Date(),
      });

      await this.checkAllJudgesSubmitted(sessionId, performerId);

      this.logger.log(
        `E-score submitted by ${client.data.judgeRole}: ${scoreData.finalE.toFixed(3)}`,
      );
    } catch (error) {
      this.logger.error(`Error submitting E-score: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // ==========================================================================
  // A-PANEL SCORING
  // ==========================================================================

  @SubscribeMessage('a:score:submit')
  async handleAScoreSubmit(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: AScoreSubmitData,
  ) {
    try {
      const { sessionId, performerId, scoreData } = data;

      const judgeAssignment = await this.prisma.judgeAssignment.findFirst({
        where: {
          sessionId,
          judgeId: client.data.userId,
        },
      });

      if (!judgeAssignment) {
        throw new Error('Judge assignment not found');
      }

      const score = await this.prisma.score.upsert({
        where: {
          sessionId_performerId_judgeAssignmentId: {
            sessionId,
            performerId,
            judgeAssignmentId: judgeAssignment.id,
          },
        },
        create: {
          sessionId,
          performerId,
          judgeAssignmentId: judgeAssignment.id,
          value: scoreData.totalA,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          aPanelData: {
            create: {
              musicRelation: scoreData.musicRelation,
              bodyExpression: scoreData.bodyExpression,
              spaceUse: scoreData.spaceUse,
              composition: scoreData.composition,
              unity: scoreData.unity,
              totalA: scoreData.totalA,
              notes: scoreData.notes,
            },
          },
        },
        update: {
          value: scoreData.totalA,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          version: { increment: 1 },
          aPanelData: {
            upsert: {
              create: {
                musicRelation: scoreData.musicRelation,
                bodyExpression: scoreData.bodyExpression,
                spaceUse: scoreData.spaceUse,
                composition: scoreData.composition,
                unity: scoreData.unity,
                totalA: scoreData.totalA,
                notes: scoreData.notes,
              },
              update: {
                musicRelation: scoreData.musicRelation,
                bodyExpression: scoreData.bodyExpression,
                spaceUse: scoreData.spaceUse,
                composition: scoreData.composition,
                unity: scoreData.unity,
                totalA: scoreData.totalA,
                notes: scoreData.notes,
              },
            },
          },
        },
      });

      this.emitToSession(sessionId, 'a:score:submitted', {
        judgeId: client.data.userId,
        judgeRole: client.data.judgeRole,
        performerId,
        totalA: scoreData.totalA,
        timestamp: new Date(),
      });

      await this.checkAllJudgesSubmitted(sessionId, performerId);

      this.logger.log(
        `A-score submitted by ${client.data.judgeRole}: ${scoreData.totalA.toFixed(3)}`,
      );
    } catch (error) {
      this.logger.error(`Error submitting A-score: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // ==========================================================================
  // LINE JUDGE
  // ==========================================================================

  @SubscribeMessage('line:fault:added')
  async handleLineFaultAdded(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: any,
  ) {
    try {
      const { sessionId, performerId, fault, totalFaults, penalty } = data;

      // Update or create line judge data
      await this.prisma.lineJudgeData.upsert({
        where: {
          sessionId_performerId: {
            sessionId,
            performerId,
          },
        },
        create: {
          sessionId,
          performerId,
          faults: [fault],
          totalFaults,
          penalty,
        },
        update: {
          faults: {
            push: fault,
          },
          totalFaults,
          penalty,
        },
      });

      // Broadcast to E-judges
      this.emitToSession(sessionId, 'line:faults:updated', {
        performerId,
        totalFaults,
        penalty,
      });

      this.logger.log(`Line fault added: ${totalFaults} faults`);
    } catch (error) {
      this.logger.error(`Error adding line fault: ${error.message}`);
    }
  }

  // ==========================================================================
  // TIME KEEPER
  // ==========================================================================

  @SubscribeMessage('time:performance:started')
  async handleTimePerformanceStarted(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: any,
  ) {
    try {
      const { sessionId, performerId, startTime } = data;

      // Broadcast to all judges
      this.emitToSession(sessionId, 'performance:started', {
        performerId,
        startTime,
      });

      this.logger.log(`Performance started for ${performerId}`);
    } catch (error) {
      this.logger.error(`Error starting performance: ${error.message}`);
    }
  }

  @SubscribeMessage('time:performance:stopped')
  async handleTimePerformanceStopped(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: any,
  ) {
    try {
      const { sessionId, performerId, endTime, duration, timePenalty } = data;

      // Save time data
      await this.prisma.timeKeeperData.upsert({
        where: {
          sessionId_performerId: {
            sessionId,
            performerId,
          },
        },
        create: {
          sessionId,
          performerId,
          startTime: data.startTime,
          endTime,
          duration,
          timePenalty,
          isOvertime: data.isOvertime,
          overtimeSeconds: data.overtimeSeconds,
          isUndertime: data.isUndertime,
          undertimeSeconds: data.undertimeSeconds,
        },
        update: {
          endTime,
          duration,
          timePenalty,
          isOvertime: data.isOvertime,
          overtimeSeconds: data.overtimeSeconds,
          isUndertime: data.isUndertime,
          undertimeSeconds: data.undertimeSeconds,
        },
      });

      // Broadcast to all judges
      this.emitToSession(sessionId, 'performance:ended', {
        performerId,
        endTime,
        duration,
        timePenalty,
      });

      this.logger.log(`Performance ended for ${performerId}: ${duration}ms`);
    } catch (error) {
      this.logger.error(`Error stopping performance: ${error.message}`);
    }
  }

  // ==========================================================================
  // CHIEF JUDGE CONTROLS
  // ==========================================================================

  @SubscribeMessage('chief:performer:next')
  async handleChiefNextPerformer(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string; force?: boolean },
  ) {
    try {
      if (!this.canControlSession(client)) {
        throw new Error('Insufficient permissions');
      }

      const { sessionId } = data;

      // Get session
      const session = await this.prisma.judgingSession.findUnique({
        where: { id: sessionId },
        include: {
          athletes: {
            orderBy: { orderNumber: 'asc' },
          },
        },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const currentPerformer = session.athletes[session.currentAthleteIndex];

      // Lock current performer scores
      if (currentPerformer) {
        await this.prisma.score.updateMany({
          where: {
            sessionId,
            performerId: currentPerformer.id,
            status: 'SUBMITTED',
          },
          data: {
            status: 'LOCKED',
            lockedAt: new Date(),
          },
        });

        this.emitToSession(sessionId, 'score:locked', {
          performerId: currentPerformer.id,
        });
      }

      // Move to next
      const nextIndex = session.currentAthleteIndex + 1;

      if (nextIndex < session.athletes.length) {
        await this.prisma.judgingSession.update({
          where: { id: sessionId },
          data: {
            currentAthleteIndex: nextIndex,
            currentAthleteId: session.athletes[nextIndex].id,
          },
        });

        const nextPerformer = session.athletes[nextIndex];

        // Mark as performing
        await this.prisma.performerInSession.update({
          where: { id: nextPerformer.id },
          data: {
            status: 'PERFORMING',
            startedAt: new Date(),
          },
        });

        // Broadcast to all judges
        this.emitToSession(sessionId, 'performer:changed', {
          currentPerformer: nextPerformer,
          currentIndex: nextIndex,
        });

        this.logger.log(`Moved to next performer: ${nextPerformer.fullName}`);
      }
    } catch (error) {
      this.logger.error(`Error moving to next performer: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async authenticateToken(token: string): Promise<any> {
    // TODO: Implement JWT verification
    // For now, mock implementation
    return {
      id: 'user-1',
      name: 'Judge Name',
      role: 'D1',
    };
  }

  private getPanelTypeFromRole(role: string): string {
    if (role.startsWith('D')) return 'D_PANEL';
    if (role.startsWith('E')) return 'E_PANEL';
    if (role.startsWith('A')) return 'A_PANEL';
    return 'TECHNICAL';
  }

  private canControlSession(client: JudgeSocket): boolean {
    const controlRoles = ['CHIEF_JUDGE', 'ORGANIZER', 'SECRETARY', 'TECHNICAL_SPECIALIST'];
    return controlRoles.includes(client.data.judgeRole);
  }

  private emitToSession(sessionId: string, event: string, data: any) {
    this.server.to(`session:${sessionId}`).emit(event, data);
  }

  private async getOtherJudgesStatus(
    sessionId: string,
    panelType: string,
    myRole: string,
    performerId?: string,
  ) {
    const judges = await this.prisma.judgeAssignment.findMany({
      where: {
        sessionId,
        panelType,
        judgeRole: { not: myRole },
      },
      include: {
        scores: performerId
          ? {
              where: { performerId },
              take: 1,
            }
          : false,
      },
    });

    return judges.map((j) => ({
      role: j.judgeRole,
      status: j.scores?.[0]?.status === 'SUBMITTED' ? 'submitted' : 'pending',
      totalD: j.scores?.[0]?.value,
      finalE: j.scores?.[0]?.value,
      totalA: j.scores?.[0]?.value,
    }));
  }

  private async checkAllJudgesSubmitted(sessionId: string, performerId: string) {
    const totalJudges = await this.prisma.judgeAssignment.count({
      where: { sessionId },
    });

    const submittedCount = await this.prisma.score.count({
      where: {
        sessionId,
        performerId,
        status: 'SUBMITTED',
      },
    });

    if (submittedCount === totalJudges) {
      this.emitToSession(sessionId, 'all:submitted', {
        performerId,
        submittedCount,
        totalJudges,
      });
    }
  }
}
