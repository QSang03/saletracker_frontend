// lib/wsClient.ts - Fixed version
import { io, Socket } from 'socket.io-client';

export type WSClientEvents = 'user_login' | 'user_logout' | 'user_block' | 'user_blocked' | 'data_updated' | 'new_notification' | 'realtime_metric_update' | string;

class WSClient {
  public socket: Socket | null = null; // Make public for access
  private reconnectInterval = 3000;
  private token: string | null = null;

  connect(token: string, url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || '') {
    this.token = token;
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.socket = io(url, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: this.reconnectInterval,
    });
    
    this.socket.on('connect', () => {
      console.log('[WSClient] Connected successfully');
    });
    
    this.socket.on('connect_error', (err) => {
      console.error('[WSClient] Connection error:', err);
      setTimeout(() => this.reconnect(), this.reconnectInterval);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('[WSClient] Disconnected:', reason);
    });
  }

  reconnect() {
    if (this.token) {
      this.connect(this.token);
    }
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
    this.socket.emit(event, data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const wsClient = new WSClient();