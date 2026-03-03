/**
 * Message interface representing a message in the system
 */
export interface Message {
  id: string;              // 唯一标识符（UUID）
  content: string;         // 消息内容（最大1000字符）
  senderIP: string;        // 发送方IP地址
  receiverIP: string;      // 接收方IP地址
  timestamp: number;       // Unix时间戳（毫秒）
  direction: 'sent' | 'received';  // 消息方向（客户端使用）
  status: 'pending' | 'sent' | 'failed';  // 发送状态
}

/**
 * DTO for sending a message
 */
export interface SendMessageDto {
  messageId?: string;      // 可选：前端生成的消息ID（用于状态同步）
  targetIP: string;        // 目标用户IP
  content: string;         // 消息内容
}

/**
 * Response for message operations
 */
export interface MessageResponse {
  success: boolean;        // 是否成功
  message?: Message;       // 消息对象（成功时）
  error?: string;          // 错误信息（失败时）
}

/**
 * DTO for getting message history
 */
export interface GetMessageHistoryDto {
  targetIP?: string;       // 可选：特定用户的对话历史
  limit?: number;          // 可选：限制返回数量（默认100）
}

/**
 * Event for new message notification
 */
export interface NewMessageEvent {
  message: Message;        // 消息对象
}

/**
 * Event for message sent confirmation
 */
export interface MessageSentEvent {
  message: Message;        // 已发送的消息对象
}

/**
 * Event for message error notification
 */
export interface MessageErrorEvent {
  error: string;           // 错误信息
  code: 'INVALID_INPUT' | 'USER_OFFLINE' | 'SEND_FAILED' | 'UNKNOWN';
}

/**
 * Event for message history response
 */
export interface MessageHistoryEvent {
  messages: Message[];     // 消息历史数组
  total: number;           // 总消息数
}
