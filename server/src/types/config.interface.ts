/**
 * Application configuration interface
 */
export interface AppConfig {
  port: number;            // 服务器端口（HTTP和WebSocket共用，默认3000）
  messageTimeout: number;  // 消息发送超时时间（毫秒，默认5000）
  maxMessageLength: number; // 最大消息长度（默认1000）
  maxMessagesInMemory: number; // 内存中保存的最大消息数（默认1000）
  heartbeatInterval: number; // 心跳间隔（毫秒，默认30000）
  reconnectDelay: number;  // 重连延迟（毫秒，默认3000）
  maxReconnectAttempts: number; // 最大重连次数（默认5）
  corsOrigin: string;      // CORS允许的源（生产环境应设置为特定域名）
  staticAssetsPath: string; // 前端静态资源路径（默认'./client/dist'）
}

/**
 * Error codes used throughout the application
 */
export enum ErrorCode {
  // 连接错误
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  DISCONNECTED = 'DISCONNECTED',
  
  // 消息错误
  USER_OFFLINE = 'USER_OFFLINE',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  MESSAGE_TIMEOUT = 'MESSAGE_TIMEOUT',
  
  // 验证错误
  INVALID_IP = 'INVALID_IP',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  MESSAGE_EMPTY = 'MESSAGE_EMPTY',
  
  // 数据错误
  INVALID_FORMAT = 'INVALID_FORMAT',
  MISSING_FIELD = 'MISSING_FIELD',
  
  // 系统错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;           // 错误代码（如'USER_OFFLINE', 'INVALID_INPUT'）
    message: string;        // 用户友好的错误消息
    details?: any;          // 可选的详细信息（仅开发环境）
    timestamp: number;      // 错误发生时间
  };
}
