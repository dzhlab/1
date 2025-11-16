// apps/api/src/modules/websocket/groups.gateway.ts

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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/groups',
})
export class GroupsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GroupsGateway');
  private connectedClients = new Map<string, Set<string>>(); // groupId -> Set<socketId>

  /**
   * Обработка подключения клиента
   */
  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Обработка отключения клиента
   */
  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Удаляем клиента из всех групп
    for (const [groupId, clients] of this.connectedClients.entries()) {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        this.logger.log(`Client ${client.id} left group ${groupId}`);

        if (clients.size === 0) {
          this.connectedClients.delete(groupId);
        }
      }
    }
  }

  /**
   * Подписка на обновления группы
   */
  @SubscribeMessage('subscribe:group')
  handleSubscribeGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const { groupId } = data;

    // Добавляем клиента в комнату группы
    client.join(`group:${groupId}`);

    // Отслеживаем клиентов
    if (!this.connectedClients.has(groupId)) {
      this.connectedClients.set(groupId, new Set());
    }
    this.connectedClients.get(groupId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to group ${groupId}`);

    // Отправляем подтверждение
    client.emit('subscribed:group', {
      groupId,
      timestamp: new Date(),
      activeUsers: this.connectedClients.get(groupId)!.size,
    });

    // Уведомляем других пользователей
    this.emitToGroup(groupId, 'user:joined', {
      socketId: client.id,
      activeUsers: this.connectedClients.get(groupId)!.size,
    });
  }

  /**
   * Отписка от обновлений группы
   */
  @SubscribeMessage('unsubscribe:group')
  handleUnsubscribeGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const { groupId } = data;

    // Удаляем клиента из комнаты
    client.leave(`group:${groupId}`);

    // Удаляем из отслеживания
    if (this.connectedClients.has(groupId)) {
      this.connectedClients.get(groupId)!.delete(client.id);
      if (this.connectedClients.get(groupId)!.size === 0) {
        this.connectedClients.delete(groupId);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from group ${groupId}`);

    // Уведомляем других пользователей
    this.emitToGroup(groupId, 'user:left', {
      socketId: client.id,
      activeUsers: this.connectedClients.get(groupId)?.size || 0,
    });
  }

  /**
   * Emit events для различных операций
   */

  // Group Events
  emitGroupCreated(group: any) {
    this.server.emit('group:created', { group, timestamp: new Date() });
  }

  emitGroupUpdated(groupId: string, group: any) {
    this.emitToGroup(groupId, 'group:updated', { group, timestamp: new Date() });
  }

  emitGroupDeleted(groupId: string) {
    this.emitToGroup(groupId, 'group:deleted', { groupId, timestamp: new Date() });
  }

  // Athlete Events
  emitAthleteAdded(groupId: string, athlete: any) {
    this.emitToGroup(groupId, 'athlete:added', { athlete, timestamp: new Date() });
  }

  emitAthleteUpdated(groupId: string, athlete: any) {
    this.emitToGroup(groupId, 'athlete:updated', { athlete, timestamp: new Date() });
  }

  emitAthleteDeleted(groupId: string, athleteId: string) {
    this.emitToGroup(groupId, 'athlete:deleted', { athleteId, timestamp: new Date() });
  }

  emitAthletesReordered(groupId: string, athletes: any[]) {
    this.emitToGroup(groupId, 'athletes:reordered', {
      athletes,
      timestamp: new Date(),
    });
  }

  emitAthletesCleared(groupId: string) {
    this.emitToGroup(groupId, 'athletes:cleared', { groupId, timestamp: new Date() });
  }

  // Draw Events
  emitDrawStarted(groupId: string, strategy: string) {
    this.emitToGroup(groupId, 'draw:started', { strategy, timestamp: new Date() });
  }

  emitDrawCompleted(groupId: string, result: any) {
    this.emitToGroup(groupId, 'draw:completed', { result, timestamp: new Date() });
  }

  // Stream Events
  emitStreamsGenerated(groupId: string, streams: any[]) {
    this.emitToGroup(groupId, 'streams:generated', {
      streams,
      timestamp: new Date(),
    });
  }

  emitStreamUpdated(groupId: string, stream: any) {
    this.emitToGroup(groupId, 'stream:updated', { stream, timestamp: new Date() });
  }

  emitStreamDeleted(groupId: string, streamId: string) {
    this.emitToGroup(groupId, 'stream:deleted', { streamId, timestamp: new Date() });
  }

  emitStreamsCleared(groupId: string) {
    this.emitToGroup(groupId, 'streams:cleared', { groupId, timestamp: new Date() });
  }

  emitAthleteAssignedToStream(groupId: string, athleteId: string, streamId: string) {
    this.emitToGroup(groupId, 'athlete:stream-assigned', {
      athleteId,
      streamId,
      timestamp: new Date(),
    });
  }

  emitAthleteUnassignedFromStream(groupId: string, athleteId: string) {
    this.emitToGroup(groupId, 'athlete:stream-unassigned', {
      athleteId,
      timestamp: new Date(),
    });
  }

  // Import Events
  emitImportStarted(groupId: string) {
    this.emitToGroup(groupId, 'import:started', { groupId, timestamp: new Date() });
  }

  emitImportProgress(groupId: string, processed: number, total: number) {
    this.emitToGroup(groupId, 'import:progress', {
      processed,
      total,
      percentage: Math.round((processed / total) * 100),
      timestamp: new Date(),
    });
  }

  emitImportCompleted(groupId: string, result: any) {
    this.emitToGroup(groupId, 'import:completed', { result, timestamp: new Date() });
  }

  emitImportFailed(groupId: string, error: string) {
    this.emitToGroup(groupId, 'import:failed', { error, timestamp: new Date() });
  }

  // Export Events
  emitExportStarted(groupId: string) {
    this.emitToGroup(groupId, 'export:started', { groupId, timestamp: new Date() });
  }

  emitExportCompleted(groupId: string) {
    this.emitToGroup(groupId, 'export:completed', { groupId, timestamp: new Date() });
  }

  // Notification Events
  emitNotification(groupId: string, message: string, type: 'info' | 'success' | 'warning' | 'error') {
    this.emitToGroup(groupId, 'notification', {
      message,
      type,
      timestamp: new Date(),
    });
  }

  /**
   * Отправка сообщения всем клиентам в группе
   */
  private emitToGroup(groupId: string, event: string, data: any) {
    this.server.to(`group:${groupId}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to group ${groupId}`, data);
  }

  /**
   * Broadcast сообщение всем клиентам кроме отправителя
   */
  private broadcastToGroup(
    groupId: string,
    event: string,
    data: any,
    excludeSocketId: string,
  ) {
    this.server
      .to(`group:${groupId}`)
      .except(excludeSocketId)
      .emit(event, data);
    this.logger.debug(`Broadcasted ${event} to group ${groupId} (except ${excludeSocketId})`, data);
  }

  /**
   * Получить количество активных пользователей в группе
   */
  getActiveUsers(groupId: string): number {
    return this.connectedClients.get(groupId)?.size || 0;
  }

  /**
   * Получить все группы с активными пользователями
   */
  getActiveGroups(): Map<string, number> {
    const activeGroups = new Map<string, number>();
    for (const [groupId, clients] of this.connectedClients.entries()) {
      activeGroups.set(groupId, clients.size);
    }
    return activeGroups;
  }

  /**
   * Heartbeat для поддержания соединения
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date() });
  }

  /**
   * Синхронизация состояния
   */
  @SubscribeMessage('sync:request')
  handleSyncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    // Этот обработчик можно использовать для запроса полного состояния группы
    // Фактическая реализация будет зависеть от вашей бизнес-логики
    this.logger.log(`Sync request from ${client.id} for group ${data.groupId}`);
    client.emit('sync:response', {
      groupId: data.groupId,
      timestamp: new Date(),
      message: 'Sync request received',
    });
  }

  /**
   * Обработка ошибок
   */
  @SubscribeMessage('error')
  handleError(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.error(`Error from client ${client.id}:`, data);
    client.emit('error:acknowledged', {
      timestamp: new Date(),
      originalError: data,
    });
  }
}
