/**
 * User interface representing a connected user
 */
export interface User {
  id: string;              // 用户唯一标识符（Socket ID）
  ip: string;              // 用户IP地址
  socketId: string;        // WebSocket连接ID
  connectedAt: number;     // 连接时间（Unix时间戳）
  lastActivity: number;    // 最后活跃时间（Unix时间戳）
  isOnline: boolean;       // 是否在线
}

/**
 * Connection status for the application
 */
export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected';
  connectedAt?: number;    // 连接建立时间
  lastPing?: number;       // 最后心跳时间
  reconnectAttempts?: number; // 重连尝试次数
}

/**
 * Validation result for input validation
 */
export interface ValidationResult {
  isValid: boolean;        // 是否有效
  error?: string;          // 错误信息
}

/**
 * Event for user connection notification
 */
export interface ConnectedEvent {
  user: User;              // 当前用户信息
  onlineUsers: User[];     // 当前在线用户列表
}

/**
 * Event for online users list update
 */
export interface OnlineUsersUpdateEvent {
  users: User[];           // 最新的在线用户列表
}

/**
 * Event for user joined notification
 */
export interface UserJoinedEvent {
  user: User;              // 新上线的用户
}

/**
 * Event for user left notification
 */
export interface UserLeftEvent {
  userIP: string;          // 下线用户的IP地址
}

/**
 * Generic error event
 */
export interface ErrorEvent {
  message: string;         // 错误描述
  code?: string;           // 错误代码
}
