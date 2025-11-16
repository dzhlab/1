// apps/web/src/hooks/useSocket.ts

'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection if not already connected
    if (!socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      socket = io(`${apiUrl}/events`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('[WebSocket] Connected:', socket?.id);
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        setIsConnected(false);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('[WebSocket] Reconnection attempt:', attemptNumber);
      });

      // System messages
      socket.on('system:message', (data) => {
        console.log(`[System ${data.level}]:`, data.message);
        // You can show a toast notification here
      });
    }

    return () => {
      // Don't disconnect on component unmount, keep connection alive
      // Only disconnect when the app is closing
    };
  }, []);

  // Cleanup on app close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket) {
        socket.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return socket;
}

// Hook to get connection status
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial state
    setIsConnected(socket.connected);

    return () => {
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
    };
  }, []);

  return isConnected;
}

// Hook to subscribe to competition events
export function useCompetitionEvents(competitionId: string, handlers: {
  onCompetitionUpdated?: (data: any) => void;
  onJudgeAdded?: (data: any) => void;
  onJudgeUpdated?: (data: any) => void;
  onJudgeDeleted?: (data: any) => void;
  onJudgesReordered?: (data: any) => void;
  onBrigadesFormed?: (data: any) => void;
  onScoreSubmitted?: (data: any) => void;
  onResultsRecalculated?: (data: any) => void;
}) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !competitionId) return;

    // Join competition room
    socket.emit('competition:join', { competitionId });

    // Register event handlers
    if (handlers.onCompetitionUpdated) {
      socket.on('competition:updated', handlers.onCompetitionUpdated);
    }
    if (handlers.onJudgeAdded) {
      socket.on('judge:added', handlers.onJudgeAdded);
    }
    if (handlers.onJudgeUpdated) {
      socket.on('judge:updated', handlers.onJudgeUpdated);
    }
    if (handlers.onJudgeDeleted) {
      socket.on('judge:deleted', handlers.onJudgeDeleted);
    }
    if (handlers.onJudgesReordered) {
      socket.on('judges:reordered', handlers.onJudgesReordered);
    }
    if (handlers.onBrigadesFormed) {
      socket.on('brigades:formed', handlers.onBrigadesFormed);
    }
    if (handlers.onScoreSubmitted) {
      socket.on('score:submitted', handlers.onScoreSubmitted);
    }
    if (handlers.onResultsRecalculated) {
      socket.on('results:recalculated', handlers.onResultsRecalculated);
    }

    return () => {
      // Leave competition room
      socket.emit('competition:leave', { competitionId });

      // Cleanup event handlers
      socket.off('competition:updated');
      socket.off('judge:added');
      socket.off('judge:updated');
      socket.off('judge:deleted');
      socket.off('judges:reordered');
      socket.off('brigades:formed');
      socket.off('score:submitted');
      socket.off('results:recalculated');
    };
  }, [socket, competitionId, handlers]);
}
