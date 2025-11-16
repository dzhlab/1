// Judging Panel Router Component
// Automatically routes judge to appropriate panel based on their role

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { DPanel } from './panels/DPanel';
import { EPanel } from './panels/EPanel';
import { APanel } from './panels/APanel';
import { LineJudgePanel } from './panels/LineJudgePanel';
import { TimeKeeperPanel } from './panels/TimeKeeperPanel';
import { ChiefJudgePanel } from './panels/ChiefJudgePanel';

// ============================================================================
// TYPES
// ============================================================================

interface JudgingPanelRouterProps {
  sessionId: string;
  token: string;
}

interface JudgeInfo {
  userId: string;
  judgeName: string;
  judgeRole: JudgeRole;
  panelType: PanelType;
}

type JudgeRole = 'D1' | 'D2' | 'D3' | 'D4' | 'E1' | 'E2' | 'E3' | 'E4' | 'A1' | 'A2' | 'LINE_JUDGE' | 'TIME_KEEPER' | 'CHIEF_JUDGE';
type PanelType = 'D_PANEL' | 'E_PANEL' | 'A_PANEL' | 'TECHNICAL' | 'CONTROL';

// ============================================================================
// COMPONENT
// ============================================================================

export const JudgingPanelRouter: React.FC<JudgingPanelRouterProps> = ({
  sessionId,
  token,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [judgeInfo, setJudgeInfo] = useState<JudgeInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // SOCKET CONNECTION
  // ============================================================================

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:3001/judging', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('Connected to judging WebSocket');
      setIsConnecting(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from judging WebSocket');
      setIsConnecting(true);
    });

    newSocket.on('error', (err) => {
      console.error('WebSocket error:', err);
      setError(err.message || 'Connection error');
      setIsConnecting(false);
    });

    // Get judge info from token
    const judgeData = parseJWT(token);
    if (judgeData) {
      setJudgeInfo({
        userId: judgeData.userId,
        judgeName: judgeData.name,
        judgeRole: judgeData.role,
        panelType: getPanelTypeFromRole(judgeData.role),
      });
    }

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const parseJWT = (token: string): any => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  };

  const getPanelTypeFromRole = (role: JudgeRole): PanelType => {
    if (role.startsWith('D')) return 'D_PANEL';
    if (role.startsWith('E')) return 'E_PANEL';
    if (role.startsWith('A')) return 'A_PANEL';
    if (role === 'CHIEF_JUDGE') return 'CONTROL';
    return 'TECHNICAL';
  };

  // ============================================================================
  // RENDER PANEL BASED ON ROLE
  // ============================================================================

  const renderPanel = () => {
    if (!socket || !judgeInfo) {
      return null;
    }

    switch (judgeInfo.judgeRole) {
      // D-Panel Judges
      case 'D1':
      case 'D2':
      case 'D3':
      case 'D4':
        return (
          <DPanel
            sessionId={sessionId}
            judgeRole={judgeInfo.judgeRole}
            socket={socket}
            token={token}
          />
        );

      // E-Panel Judges
      case 'E1':
      case 'E2':
      case 'E3':
      case 'E4':
        return (
          <EPanel
            sessionId={sessionId}
            judgeRole={judgeInfo.judgeRole}
            socket={socket}
            token={token}
          />
        );

      // A-Panel Judges
      case 'A1':
      case 'A2':
        return (
          <APanel
            sessionId={sessionId}
            judgeRole={judgeInfo.judgeRole}
            socket={socket}
            token={token}
          />
        );

      // Line Judge
      case 'LINE_JUDGE':
        return (
          <LineJudgePanel
            sessionId={sessionId}
            socket={socket}
            token={token}
          />
        );

      // Time Keeper
      case 'TIME_KEEPER':
        return (
          <TimeKeeperPanel
            sessionId={sessionId}
            socket={socket}
            token={token}
          />
        );

      // Chief Judge
      case 'CHIEF_JUDGE':
        return (
          <ChiefJudgePanel
            sessionId={sessionId}
            socket={socket}
            token={token}
          />
        );

      default:
        return (
          <div className="error-panel">
            <h2>Unknown Judge Role</h2>
            <p>Your role "{judgeInfo.judgeRole}" is not recognized.</p>
          </div>
        );
    }
  };

  // ============================================================================
  // LOADING / ERROR STATES
  // ============================================================================

  if (error) {
    return (
      <div className="judging-panel-error">
        <div className="error-card">
          <h1>❌ Connection Error</h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="judging-panel-loading">
        <div className="loading-card">
          <div className="spinner"></div>
          <h2>Connecting to judging system...</h2>
          <p>Session ID: {sessionId}</p>
        </div>
      </div>
    );
  }

  if (!judgeInfo) {
    return (
      <div className="judging-panel-error">
        <div className="error-card">
          <h1>❌ Authentication Error</h1>
          <p>Could not verify your judge credentials.</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="judging-panel-router">
      {/* Header with judge info */}
      <div className="router-header">
        <div className="judge-badge">
          <span className="judge-name">{judgeInfo.judgeName}</span>
          <span className="judge-role">{judgeInfo.judgeRole}</span>
          <span className={`connection-status ${isConnecting ? 'connecting' : 'connected'}`}>
            {isConnecting ? '🟡 Connecting...' : '🟢 Connected'}
          </span>
        </div>
      </div>

      {/* Render appropriate panel */}
      <div className="panel-container">
        {renderPanel()}
      </div>
    </div>
  );
};

export default JudgingPanelRouter;
