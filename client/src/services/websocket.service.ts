import { io, Socket } from 'socket.io-client';
import type {
  SendMessageDto,
  SendMultimediaMessageDto,
  ConnectedEvent,
  OnlineUsersUpdateEvent,
  UserJoinedEvent,
  UserLeftEvent,
  MessageErrorEvent,
  NewMessageEvent,
  MessageSentEvent,
  MultimediaMessageSentEvent,
  MessageHistoryEvent,
  GetMessageHistoryDto,
} from '../types';

/**
 * WebSocket service for managing Socket.io client connection
 * Handles connection, disconnection, reconnection, and event management
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000; // 3 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null;

  /**
   * Connect to the WebSocket server
   * @param url - Server URL (default: backend server)
   */
  connect(url?: string): void {
    console.log('[WebSocket] Starting connection...');
    
    // Prevent multiple connections
    if (this.socket && this.socket.connected) {
      console.log('[WebSocket] Already connected, skipping');
      return;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      console.log('[WebSocket] Cleaning up existing socket');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // In development, try to connect to the backend server's LAN IP
    // In production, use the same origin
    let serverUrl = url;
    
    if (!serverUrl) {
      if (import.meta.env.DEV) {
        // In development, use the current host but port 3000
        const currentHost = window.location.hostname;
        serverUrl = `http://${currentHost}:3000`;
      } else {
        serverUrl = window.location.origin;
      }
    }

    console.log('[WebSocket] Connecting to:', serverUrl);

    // iOS Safari works better with polling first, then upgrade to websocket
    this.socket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Try polling first for iOS compatibility
      reconnection: false, // We'll handle reconnection manually
      timeout: 10000, // 10 second timeout
      forceNew: true, // Force a new connection
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Check if the socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Send a message to a target user
   * @param targetIP - Target user's IP address
   * @param content - Message content
   * @param messageId - Optional message ID from frontend
   */
  sendMessage(targetIP: string, content: string, messageId?: string): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    const payload: SendMessageDto = { 
      targetIP, 
      content,
      messageId, // 包含前端生成的消息ID
    };
    this.socket.emit('sendMessage', payload);
  }

  /**
   * Send a multimedia message to a target user
   * @param targetIP - Target user's IP address
   * @param fileId - File ID from storage service
   * @param messageId - Optional message ID from frontend
   */
  sendMultimediaMessage(targetIP: string, fileId: string, messageId?: string): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    const payload: SendMultimediaMessageDto = {
      targetIP,
      fileId,
      messageId,
    };
    this.socket.emit('sendMultimediaMessage', payload);
  }

  /**
   * Request the list of online users
   */
  getOnlineUsers(): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('getOnlineUsers');
  }

  /**
   * Request message history
   * @param options - Optional filters for message history
   */
  getMessageHistory(options?: GetMessageHistoryDto): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('getMessageHistory', options || {});
  }

  /**
   * Register event listeners
   */
  on(event: 'connected', handler: (data: ConnectedEvent) => void): void;
  on(event: 'newMessage', handler: (data: NewMessageEvent) => void): void;
  on(event: 'newMultimediaMessage', handler: (data: NewMessageEvent) => void): void;
  on(event: 'messageSent', handler: (data: MessageSentEvent) => void): void;
  on(event: 'multimediaMessageSent', handler: (data: MultimediaMessageSentEvent) => void): void;
  on(event: 'messageError', handler: (data: MessageErrorEvent) => void): void;
  on(event: 'multimediaMessageError', handler: (data: MessageErrorEvent) => void): void;
  on(event: 'onlineUsersUpdate', handler: (data: OnlineUsersUpdateEvent) => void): void;
  on(event: 'userJoined', handler: (data: UserJoinedEvent) => void): void;
  on(event: 'userLeft', handler: (data: UserLeftEvent) => void): void;
  on(event: 'messageHistory', handler: (data: MessageHistoryEvent) => void): void;
  on(event: 'error', handler: (error: any) => void): void;
  on(event: 'connect', handler: () => void): void;
  on(event: 'disconnect', handler: (reason: string) => void): void;
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.on(event, handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) {
      return;
    }

    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Setup internal event handlers for connection management
   */
  private setupEventHandlers(): void {
    if (!this.socket) {
      console.error('[WebSocket] Cannot setup handlers: socket is null');
      return;
    }

    console.log('[WebSocket] Setting up event handlers');

    // Handle successful connection
    this.socket.on('connect', () => {
      console.log('[WebSocket] ✅ Connected successfully');
      console.log('[WebSocket] Transport:', this.socket?.io.engine.transport.name);
      this.reconnectAttempts = 0;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] ❌ Disconnected:', reason);
      
      // Attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    // Handle connection errors
    this.socket.on('connect_error', (error: Error) => {
      console.error('[WebSocket] ⚠️ Connection error:', error.message);
      this.attemptReconnect();
    });

    // Handle transport upgrade (polling -> websocket)
    this.socket.io.engine.on('upgrade', (transport: any) => {
      console.log('[WebSocket] 🔄 Transport upgraded to:', transport.name);
    });

    console.log('[WebSocket] Event handlers setup complete');
  }

  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      console.log('[WebSocket] Reconnection already scheduled');
      return; // Already attempting to reconnect
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] 🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      console.log(`[WebSocket] Executing reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, this.reconnectDelay);
  }

  /**
   * Manually trigger reconnection
   */
  reconnect(): void {
    this.reconnectAttempts = 0;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      if (this.socket.connected) {
        this.socket.disconnect();
      }
      this.socket.connect();
    } else {
      this.connect();
    }
  }
}

// Export a singleton instance
export const websocketService = new WebSocketService();
