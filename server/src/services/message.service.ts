import { Injectable } from '@nestjs/common';
import { Message } from '../types';
import { MessageRepository } from '../repositories/message.repository';
import { randomUUID } from 'crypto';

/**
 * Message Service - 管理消息业务逻辑
 */
@Injectable()
export class MessageService {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * 创建新消息
   */
  createMessage(
    senderIP: string,
    receiverIP: string,
    content: string,
    messageId?: string,
  ): Message {
    const message: Message = {
      id: messageId || randomUUID(), // 使用前端提供的ID，如果没有则生成新的
      content,
      senderIP,
      receiverIP,
      timestamp: Date.now(),
      direction: 'sent', // 默认方向，客户端会根据自己的IP调整
      status: 'pending',
    };

    this.saveMessage(message);
    return message;
  }

  /**
   * 获取消息历史（所有消息）
   */
  getMessageHistory(limit?: number): Message[] {
    return this.messageRepository.findAll(limit);
  }

  /**
   * 获取特定用户的消息历史
   */
  getUserMessageHistory(userIP: string, limit?: number): Message[] {
    return this.messageRepository.findByUserIP(userIP, limit);
  }

  /**
   * 获取两个用户之间的对话
   */
  getConversation(
    userIP1: string,
    userIP2: string,
    limit?: number,
  ): Message[] {
    return this.messageRepository.findConversation(userIP1, userIP2, limit);
  }

  /**
   * 存储消息
   */
  saveMessage(message: Message): void {
    this.messageRepository.save(message);
  }

  /**
   * 清理旧消息（当消息数量超过限制时）
   */
  cleanupOldMessages(maxMessages: number): void {
    this.messageRepository.cleanup(maxMessages);
  }

  /**
   * 获取消息统计
   */
  getMessageStats(): {
    totalMessages: number;
    messagesInLastHour: number;
  } {
    const allMessages = this.messageRepository.findAll();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const messagesInLastHour = allMessages.filter(
      (msg) => msg.timestamp > oneHourAgo,
    ).length;

    return {
      totalMessages: allMessages.length,
      messagesInLastHour,
    };
  }
}
