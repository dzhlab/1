// apps/api/src/modules/judging/websocket/judging.gateway.ts

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
import { Logger, UseGuards } from '@nestjs/common';
import { JudgingSessionService } from '../services/judging-session.service';
import { ScoreService } from '../services/score.service';

interface JudgeSocket extends Socket {
  data: {
    userId: string;
    judgeId: string;
    judgeName: string;
    judgeRole: string;
    sessionId?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/judging',
})
export class JudgingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('JudgingGateway');

  // Track judges in each session
  private sessionsMap = new Map<string, Set<string>>(); // sessionId -> Set<socketId>

  constructor(
    private judgingSessionService: JudgingSessionService,
    private scoreService: ScoreService,
  ) {}

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

      this.logger.log(`Judge connected: ${user.name} (${user.role})`);
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
        await this.judgingSessionService.updateJudgeConnection(
          sessionId,
          client.data.userId,
          false,
        );

        // Notify other judges
        this.emitToSession(sessionId, 'judge:disconnected', {
          judgeId: client.data.userId,
          judgeName,
          disconnectedAt: new Date(),
        });

        this.logger.log(`Judge disconnected: ${judgeName} from session ${sessionId}`);
      }
    }
  }

  /**
   * Join a judging session
   */
  @SubscribeMessage('join:session')
  async handleJoinSession(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const { sessionId } = data;

    try {
      // Verify judge is assigned to this session
      const session = await this.judgingSessionService.getSession(sessionId);
      const judgeAssignment = session.judges.find(
        (j) => j.judgeId === client.data.userId,
      );

      if (!judgeAssignment) {
        client.emit('error', {
          message: 'You are not assigned to this judging session',
        });
        return;
      }

      // Join socket room
      client.join(`session:${sessionId}`);
      client.data.sessionId = sessionId;
      client.data.judgeId = judgeAssignment.id;

      // Track in sessions map
      if (!this.sessionsMap.has(sessionId)) {
        this.sessionsMap.set(sessionId, new Set());
      }
      this.sessionsMap.get(sessionId)!.add(client.id);

      // Update connection status in DB
      await this.judgingSessionService.updateJudgeConnection(
        sessionId,
        client.data.userId,
        true,
      );

      // Send current session state to judge
      const currentState = await this.judgingSessionService.getCurrentState(sessionId);

      client.emit('session:joined', {
        session: currentState.session,
        currentPerformer: currentState.currentPerformer,
        allPerformers: currentState.performers,
        myScore: currentState.myScore,
        otherJudgesStatus: currentState.otherJudgesStatus,
      });

      // Notify other judges
      this.emitToSession(sessionId, 'judge:connected', {
        judgeId: client.data.userId,
        judgeName: client.data.judgeName,
        judgeRole: client.data.judgeRole,
        connectedAt: new Date(),
      }, client.id);

      this.logger.log(`Judge ${client.data.judgeName} joined session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to join session: ${error.message}`);
      client.emit('error', {
        message: 'Failed to join session',
        details: error.message,
      });
    }
  }

  /**
   * Leave a judging session
   */
  @SubscribeMessage('leave:session')
  async handleLeaveSession(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const { sessionId } = data;

    client.leave(`session:${sessionId}`);

    const judges = this.sessionsMap.get(sessionId);
    if (judges) {
      judges.delete(client.id);
    }

    await this.judgingSessionService.updateJudgeConnection(
      sessionId,
      client.data.userId,
      false,
    );

    this.emitToSession(sessionId, 'judge:left', {
      judgeId: client.data.userId,
      judgeName: client.data.judgeName,
    });
  }

  /**
   * Submit a score
   */
  @SubscribeMessage('score:submit')
  async handleSubmitScore(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string; performerId: string; score: number },
  ) {
    try {
      const { sessionId, performerId, score } = data;

      // Save score
      const savedScore = await this.scoreService.submitScore({
        sessionId,
        performerId,
        judgeAssignmentId: client.data.judgeId,
        value: score,
      });

      // Emit to all in session
      this.emitToSession(sessionId, 'score:submitted', {
        performerId,
        judgeId: client.data.userId,
        judgeRole: client.data.judgeRole,
        score: savedScore.value,
        submittedAt: savedScore.submittedAt,
      });

      // Check if all judges submitted
      const allSubmitted = await this.judgingSessionService.checkAllJudgesSubmitted(
        sessionId,
        performerId,
      );

      if (allSubmitted) {
        this.emitToSession(sessionId, 'all:submitted', {
          performerId,
          allScores: await this.scoreService.getPerformerScores(performerId),
        });
      }

      client.emit('score:confirmed', {
        scoreId: savedScore.id,
        success: true,
      });
    } catch (error) {
      client.emit('score:error', {
        message: error.message,
      });
    }
  }

  /**
   * Control: Start session (organizer/chief only)
   */
  @SubscribeMessage('control:start')
  async handleStartSession(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!this.canControlSession(client)) {
      client.emit('error', { message: 'Insufficient permissions' });
      return;
    }

    const { sessionId } = data;

    try {
      const session = await this.judgingSessionService.startSession(sessionId);

      this.emitToSession(sessionId, 'session:started', {
        sessionId,
        currentPerformer: session.currentPerformer,
        startedAt: session.startedAt,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Control: Next performer
   */
  @SubscribeMessage('control:next')
  async handleNextPerformer(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string; force?: boolean },
  ) {
    if (!this.canControlSession(client)) {
      client.emit('error', { message: 'Insufficient permissions' });
      return;
    }

    const { sessionId, force } = data;

    try {
      const result = await this.judgingSessionService.moveToNext(sessionId, force);

      // Close previous performer's scores
      if (result.previousPerformer) {
        this.emitToSession(sessionId, 'score:closed', {
          performerId: result.previousPerformer.id,
          closedAt: new Date(),
          finalScores: result.previousScores,
        });
      }

      // Emit new performer
      this.emitToSession(sessionId, 'performer:changed', {
        sessionId,
        currentIndex: result.currentIndex,
        currentPerformer: result.currentPerformer,
        totalPerformers: result.totalPerformers,
        previousPerformer: result.previousPerformer,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Control: Pause session
   */
  @SubscribeMessage('control:pause')
  async handlePauseSession(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!this.canControlSession(client)) {
      client.emit('error', { message: 'Insufficient permissions' });
      return;
    }

    const { sessionId } = data;

    await this.judgingSessionService.pauseSession(sessionId);

    this.emitToSession(sessionId, 'session:paused', {
      sessionId,
      pausedAt: new Date(),
    });
  }

  /**
   * Control: Resume session
   */
  @SubscribeMessage('control:resume')
  async handleResumeSession(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!this.canControlSession(client)) {
      client.emit('error', { message: 'Insufficient permissions' });
      return;
    }

    const { sessionId } = data;

    await this.judgingSessionService.resumeSession(sessionId);

    this.emitToSession(sessionId, 'session:resumed', {
      sessionId,
      resumedAt: new Date(),
    });
  }

  /**
   * Request sync (after reconnect)
   */
  @SubscribeMessage('sync:request')
  async handleSyncRequest(
    @ConnectedSocket() client: JudgeSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const { sessionId } = data;

    try {
      const currentState = await this.judgingSessionService.getCurrentState(sessionId);

      client.emit('session:sync', {
        session: currentState.session,
        currentPerformer: currentState.currentPerformer,
        myScore: currentState.myScore,
        otherJudgesStatus: currentState.otherJudgesStatus,
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Heartbeat/ping
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: JudgeSocket) {
    client.emit('pong', { timestamp: new Date() });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Emit event to all judges in a session
   */
  private emitToSession(sessionId: string, event: string, data: any, excludeSocketId?: string) {
    if (excludeSocketId) {
      this.server
        .to(`session:${sessionId}`)
        .except(excludeSocketId)
        .emit(event, data);
    } else {
      this.server.to(`session:${sessionId}`).emit(event, data);
    }

    this.logger.debug(`Emitted ${event} to session ${sessionId}`);
  }

  /**
   * Check if judge can control session
   */
  private canControlSession(client: JudgeSocket): boolean {
    const allowedRoles = [
      'ORGANIZER',
      'CHIEF_JUDGE',
      'SECRETARY',
      'TECHNICAL_SPECIALIST',
    ];

    return allowedRoles.includes(client.data.judgeRole);
  }

  /**
   * Authenticate JWT token
   */
  private async authenticateToken(token: string): Promise<any> {
    // Implement JWT verification
    // This is a placeholder
    return {
      id: 'user-123',
      name: 'John Doe',
      role: 'JUDGE',
    };
  }

  /**
   * Get active judges count for a session
   */
  getActiveJudgesCount(sessionId: string): number {
    return this.sessionsMap.get(sessionId)?.size || 0;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessionsMap.keys());
  }
}
