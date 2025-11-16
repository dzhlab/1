// apps/api/src/modules/websocket/events.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface CompetitionRoom {
  competitionId: string;
  clients: Set<string>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(EventsGateway.name);
  private competitionRooms = new Map<string, CompetitionRoom>();

  /**
   * Подключение клиента
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Отключение клиента
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Удалить клиента из всех комнат
    this.competitionRooms.forEach((room, competitionId) => {
      if (room.clients.has(client.id)) {
        room.clients.delete(client.id);
        this.logger.log(
          `Client ${client.id} left competition ${competitionId}`,
        );

        // Удалить комнату если пустая
        if (room.clients.size === 0) {
          this.competitionRooms.delete(competitionId);
          this.logger.log(`Room for competition ${competitionId} removed`);
        }
      }
    });
  }

  /**
   * Присоединиться к соревнованию (подписка на события)
   */
  @SubscribeMessage('competition:join')
  handleJoinCompetition(
    @MessageBody() data: { competitionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { competitionId } = data;

    // Создать комнату если не существует
    if (!this.competitionRooms.has(competitionId)) {
      this.competitionRooms.set(competitionId, {
        competitionId,
        clients: new Set(),
      });
    }

    // Добавить клиента в комнату
    const room = this.competitionRooms.get(competitionId);
    room.clients.add(client.id);

    // Socket.io room для удобной рассылки
    client.join(`competition:${competitionId}`);

    this.logger.log(
      `Client ${client.id} joined competition ${competitionId}. Total clients: ${room.clients.size}`,
    );

    return {
      success: true,
      competitionId,
      connectedClients: room.clients.size,
    };
  }

  /**
   * Покинуть соревнование
   */
  @SubscribeMessage('competition:leave')
  handleLeaveCompetition(
    @MessageBody() data: { competitionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { competitionId } = data;

    const room = this.competitionRooms.get(competitionId);
    if (room) {
      room.clients.delete(client.id);
      client.leave(`competition:${competitionId}`);

      this.logger.log(
        `Client ${client.id} left competition ${competitionId}. Remaining: ${room.clients.size}`,
      );

      if (room.clients.size === 0) {
        this.competitionRooms.delete(competitionId);
      }
    }

    return { success: true };
  }

  // ============================================
  // EMISSION METHODS (вызываются из контроллеров)
  // ============================================

  /**
   * Соревнование создано
   */
  emitCompetitionCreated(competition: any) {
    this.server.emit('competition:created', competition);
    this.logger.log(`Competition created event emitted: ${competition.id}`);
  }

  /**
   * Соревнование обновлено
   */
  emitCompetitionUpdated(competitionId: string, competition: any) {
    this.server
      .to(`competition:${competitionId}`)
      .emit('competition:updated', {
        competitionId,
        data: competition,
      });
    this.logger.log(`Competition updated event emitted: ${competitionId}`);
  }

  /**
   * Соревнование удалено
   */
  emitCompetitionDeleted(competitionId: string) {
    this.server
      .to(`competition:${competitionId}`)
      .emit('competition:deleted', {
        competitionId,
      });
    this.logger.log(`Competition deleted event emitted: ${competitionId}`);
  }

  /**
   * Судья добавлен
   */
  emitJudgeAdded(competitionId: string, judge: any) {
    this.server.to(`competition:${competitionId}`).emit('judge:added', {
      competitionId,
      judge,
    });
    this.logger.log(
      `Judge added event emitted for competition ${competitionId}`,
    );
  }

  /**
   * Судья обновлен
   */
  emitJudgeUpdated(competitionId: string, judgeId: string, judge: any) {
    this.server.to(`competition:${competitionId}`).emit('judge:updated', {
      competitionId,
      judgeId,
      data: judge,
    });
    this.logger.log(
      `Judge updated event emitted: ${judgeId} in competition ${competitionId}`,
    );
  }

  /**
   * Судья удален
   */
  emitJudgeDeleted(competitionId: string, judgeId: string) {
    this.server.to(`competition:${competitionId}`).emit('judge:deleted', {
      competitionId,
      judgeId,
    });
    this.logger.log(
      `Judge deleted event emitted: ${judgeId} from competition ${competitionId}`,
    );
  }

  /**
   * Судьи пересортированы
   */
  emitJudgesReordered(competitionId: string, judges: any[]) {
    this.server.to(`competition:${competitionId}`).emit('judges:reordered', {
      competitionId,
      judges,
    });
    this.logger.log(
      `Judges reordered event emitted for competition ${competitionId}`,
    );
  }

  /**
   * Бригады сформированы
   */
  emitBrigadesFormed(competitionId: string, result: any) {
    this.server.to(`competition:${competitionId}`).emit('brigades:formed', {
      competitionId,
      result,
    });
    this.logger.log(
      `Brigades formed event emitted for competition ${competitionId}`,
    );
  }

  /**
   * Судьи импортированы
   */
  emitJudgesImported(competitionId: string, judges: any[]) {
    this.server.to(`competition:${competitionId}`).emit('judges:imported', {
      competitionId,
      count: judges.length,
      judges,
    });
    this.logger.log(
      `Judges imported event emitted for competition ${competitionId}: ${judges.length} judges`,
    );
  }

  /**
   * Оценка добавлена/обновлена
   */
  emitScoreSubmitted(competitionId: string, score: any) {
    this.server.to(`competition:${competitionId}`).emit('score:submitted', {
      competitionId,
      score,
    });
    this.logger.log(
      `Score submitted event emitted for competition ${competitionId}`,
    );
  }

  /**
   * Результаты пересчитаны
   */
  emitResultsRecalculated(competitionId: string, results: any[]) {
    this.server
      .to(`competition:${competitionId}`)
      .emit('results:recalculated', {
        competitionId,
        results,
      });
    this.logger.log(
      `Results recalculated event emitted for competition ${competitionId}`,
    );
  }

  /**
   * Получить количество подключенных клиентов для соревнования
   */
  getConnectedClients(competitionId: string): number {
    const room = this.competitionRooms.get(competitionId);
    return room ? room.clients.size : 0;
  }

  /**
   * Получить список всех активных соревнований
   */
  getActiveCompetitions(): string[] {
    return Array.from(this.competitionRooms.keys());
  }

  /**
   * Отправить системное сообщение всем клиентам
   */
  emitSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    this.server.emit('system:message', {
      message,
      level,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`System message emitted: ${message}`);
  }
}
