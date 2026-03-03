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
import {
  SendMessageDto,
  Message,
  User,
  MessageResponse,
  GetMessageHistoryDto,
} from '../types';
import { MessageService } from '../services/message.service';
import { UserService } from '../services/user.service';
import { ValidationService } from '../services/validation.service';

/**
 * Messaging Gateway - 处理所有WebSocket连接和事件
 */
@WebSocketGateway({
  cors: {
    origin: '*', // 生产环境应限制为特定域名
  },
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly userService: UserService,
    private readonly validationService: ValidationService,
  ) {}

  /**
   * 处理客户端连接
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const clientIP = this.getClientIP(client);
      this.logger.log(`Client connecting: ${client.id} from IP: ${clientIP}`);

      // 注册用户
      const user = this.userService.registerUser(client.id, clientIP);

      // 发送连接成功事件给当前用户
      client.emit('connected', {
        user,
        onlineUsers: this.userService.getOnlineUsers(),
      });

      // 广播用户上线通知给其他用户
      this.broadcastUserJoined(user);

      // 广播更新在线用户列表
      this.broadcastOnlineUsers();

      this.logger.log(
        `Client connected: ${client.id}, Total users: ${this.userService.getOnlineUserCount()}`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      client.emit('error', {
        message: '连接失败',
        code: 'CONNECTION_FAILED',
      });
    }
  }

  /**
   * 处理客户端断开
   */
  async handleDisconnect(client: Socket): Promise<void> {
    try {
      this.logger.log(`Client disconnecting: ${client.id}`);

      // 移除用户
      const user = this.userService.removeUser(client.id);

      if (user) {
        // 广播用户下线通知
        this.broadcastUserLeft(user.ip);

        // 广播更新在线用户列表
        this.broadcastOnlineUsers();

        this.logger.log(
          `Client disconnected: ${client.id}, Total users: ${this.userService.getOnlineUserCount()}`,
        );
      }
    } catch (error) {
      this.logger.error(`Disconnection error: ${error.message}`, error.stack);
    }
  }

  /**
   * 处理发送消息事件
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ): Promise<MessageResponse> {
    try {
      this.logger.log(
        `Message from ${client.id} to ${payload.targetIP}: ${payload.content.substring(0, 50)}...`,
      );

      // 验证消息
      const validation =
        this.validationService.validateSendMessageRequest(payload);
      if (!validation.isValid) {
        this.logger.warn(`Validation failed: ${validation.error}`);
        client.emit('messageError', {
          error: validation.error,
          code: 'INVALID_INPUT',
        });
        return {
          success: false,
          error: validation.error,
        };
      }

      // 查找发送方用户
      const sender = this.userService.findUserBySocketId(client.id);
      if (!sender) {
        const error = '发送方用户未找到';
        this.logger.warn(error);
        client.emit('messageError', {
          error,
          code: 'UNKNOWN',
        });
        return {
          success: false,
          error,
        };
      }

      // 查找目标用户
      const targetUser = this.userService.findUserByIP(payload.targetIP);
      if (!targetUser || !targetUser.isOnline) {
        const error = '目标用户不在线';
        this.logger.warn(`Target user ${payload.targetIP} is offline`);
        client.emit('messageError', {
          error,
          code: 'USER_OFFLINE',
        });
        return {
          success: false,
          error,
        };
      }

      // 创建消息（使用前端提供的ID，如果有的话）
      const message = this.messageService.createMessage(
        sender.ip,
        payload.targetIP,
        payload.content,
        payload.messageId, // 传递前端提供的消息ID
      );

      // 更新消息状态为已发送
      message.status = 'sent';

      // 发送消息给目标用户
      this.sendMessageToUser(targetUser.socketId, message);

      // 发送确认给发送方
      client.emit('messageSent', message);

      this.logger.log(`Message sent successfully: ${message.id}`);

      return {
        success: true,
        message,
      };
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`, error.stack);
      client.emit('messageError', {
        error: '消息发送失败',
        code: 'SEND_FAILED',
      });
      return {
        success: false,
        error: '消息发送失败',
      };
    }
  }

  /**
   * 处理获取在线用户事件
   */
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket): User[] {
    try {
      const users = this.userService.getOnlineUsers();
      this.logger.log(`Get online users request from ${client.id}`);
      client.emit('onlineUsersList', { users });
      return users;
    } catch (error) {
      this.logger.error(
        `Get online users error: ${error.message}`,
        error.stack,
      );
      client.emit('error', {
        message: '获取在线用户列表失败',
        code: 'UNKNOWN_ERROR',
      });
      return [];
    }
  }

  /**
   * 处理获取消息历史事件
   */
  @SubscribeMessage('getMessageHistory')
  handleGetMessageHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GetMessageHistoryDto,
  ): Message[] {
    try {
      this.logger.log(`Get message history request from ${client.id}`);

      const user = this.userService.findUserBySocketId(client.id);
      if (!user) {
        this.logger.warn('User not found for message history request');
        client.emit('error', {
          message: '用户未找到',
          code: 'UNKNOWN_ERROR',
        });
        return [];
      }

      let messages: Message[];

      if (payload.targetIP) {
        // 获取与特定用户的对话
        messages = this.messageService.getConversation(
          user.ip,
          payload.targetIP,
          payload.limit || 100,
        );
      } else {
        // 获取用户的所有消息
        messages = this.messageService.getUserMessageHistory(
          user.ip,
          payload.limit || 100,
        );
      }

      client.emit('messageHistory', {
        messages,
        total: messages.length,
      });

      return messages;
    } catch (error) {
      this.logger.error(
        `Get message history error: ${error.message}`,
        error.stack,
      );
      client.emit('error', {
        message: '获取消息历史失败',
        code: 'UNKNOWN_ERROR',
      });
      return [];
    }
  }

  /**
   * 推送消息到特定用户（内部方法）
   */
  private sendMessageToUser(targetSocketId: string, message: Message): void {
    try {
      const targetSocket = this.server.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('newMessage', message);
        this.logger.log(`Message sent to socket ${targetSocketId}`);
      } else {
        this.logger.warn(`Target socket ${targetSocketId} not found`);
      }
    } catch (error) {
      this.logger.error(`Error sending message to socket: ${error.message}`, error.stack);
    }
  }

  /**
   * 广播在线用户列表更新（内部方法）
   */
  private broadcastOnlineUsers(): void {
    const users = this.userService.getOnlineUsers();
    this.server.emit('onlineUsersUpdate', { users });
  }

  /**
   * 广播用户上线通知（内部方法）
   */
  private broadcastUserJoined(user: User): void {
    this.server.emit('userJoined', user);
  }

  /**
   * 广播用户下线通知（内部方法）
   */
  private broadcastUserLeft(userIP: string): void {
    this.server.emit('userLeft', { userIP });
  }

  /**
   * 获取客户端IP地址（内部方法）
   */
  private getClientIP(client: Socket): string {
    // 尝试从不同的来源获取真实IP
    const forwarded = client.handshake.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    const realIP = client.handshake.headers['x-real-ip'];
    if (realIP) {
      return realIP as string;
    }

    // 从socket地址获取
    let ip = client.handshake.address || 'unknown';
    
    // 处理IPv6映射的IPv4地址 (::ffff:192.168.9.81 -> 192.168.9.81)
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    
    // 处理IPv6 localhost (::1 -> 127.0.0.1)
    if (ip === '::1') {
      ip = '127.0.0.1';
    }
    
    // 验证是否为有效的IPv4地址
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(ip)) {
      this.logger.warn(`Invalid IP format: ${ip}, using default`);
      ip = '127.0.0.1';
    }
    
    return ip;
  }
}
