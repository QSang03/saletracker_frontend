// lib/wsClient.ts - Fixed version
import { io, Socket } from 'socket.io-client';

export type WSClientEvents = 
  | 'user_login' 
  | 'user_logout' 
  | 'user_block' 
  | 'user_blocked' 
  | 'data_updated' 
  | 'new_notification' 
  | 'realtime_metric_update'
  // Schedule collaboration events
  | 'schedule:presence:update'
  | 'schedule:edit:start'
  | 'schedule:edit:renew'
  | 'schedule:edit:stop'
  | 'schedule:preview:patch'
  | 'schedule:conflict:detected'
  | 'schedule:version:update'
  // Campaign schedule presence events
  | 'campaign:schedule:join'
  | 'campaign:schedule:leave'
  | 'campaign:schedule:get-users'
  | 'campaign:schedule:current-users'
  | 'campaign:schedule:user-joined'
  | 'campaign:schedule:user-left'
  | string;

class WSClient {
  public socket: Socket | null = null; // Make public for access
  private reconnectInterval = 3000;
  private token: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect(token: string, url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || '') {
    console.log('[WSClient] Environment variable NEXT_PUBLIC_WEBSOCKET_URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL);
    console.log('[WSClient] Final URL to connect:', url);
    this.token = token;
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectInterval,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      // Performance optimizations
      upgrade: true,
      rememberUpgrade: true,
      // Connection pooling
      multiplex: true,
    });
    
    this.socket.on('connect', () => {
      console.log('[WSClient] Connected successfully to:', url);
      console.log('[WSClient] Socket ID:', this.socket?.id);
      console.log('[WSClient] Auth token:', this.token ? 'Present' : 'Missing');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });
    
    this.socket.on('connect_error', (err) => {
      console.error('[WSClient] Connection error:', err);
      this.connectionStatus = 'disconnected';
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.reconnect(), this.reconnectInterval);
      } else {
        console.error('[WSClient] Max reconnection attempts reached');
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('[WSClient] Disconnected:', reason);
      this.connectionStatus = 'disconnected';
      this.stopHeartbeat();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[WSClient] Reconnected after', attemptNumber, 'attempts');
      this.connectionStatus = 'connected';
      this.startHeartbeat();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[WSClient] Reconnection error:', error);
      this.connectionStatus = 'disconnected';
    });
  }

  reconnect() {
    if (this.token) {
      this.connect(this.token);
    }
  }

  // Heartbeat methods
  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('heartbeat', { clientTime: Date.now() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Connection status methods
  getConnectionStatus() {
    return this.connectionStatus;
  }

  isConnected() {
    return this.connectionStatus === 'connected' && this.socket?.connected;
  }

  on(event: WSClientEvents, handler: (data: any) => void) {
    if (!this.socket) {
      console.warn('[WSClient] Socket not connected, cannot add listener for:', event);
      return;
    }
    this.socket.on(event, handler);
  }

  off(event: WSClientEvents, handler?: (data: any) => void) {
    if (!this.socket) return;
    
    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.removeAllListeners(event);
    }
  }

  removeAllListeners(event?: WSClientEvents) {
    if (!this.socket) return;
    
    if (event) {
      this.socket.removeAllListeners(event);
    } else {
      this.socket.removeAllListeners();
    }
  }

  emit(event: WSClientEvents, data: any) {
    if (!this.socket) {
      console.warn('[WSClient] Socket not connected, cannot emit:', event);
      return;
    }
    console.log('[WSClient] Emitting event:', event, 'with data:', data);
    this.socket.emit(event, data);
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus = 'disconnected';
  }
}

export const wsClient = new WSClient();