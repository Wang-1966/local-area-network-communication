import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MultimediaMessage,
  MessageType,
  StoredFileInfo,
  ValidationResult,
  SendMultimediaMessageDto,
} from '../types/multimedia.interface';
import { Message } from '../types/message.interface';
import { MessageRepository } from '../repositories/message.repository';
import { FileStorageService } from './file-storage.service';

/**
 * Service for managing multimedia messages
 * Handles creation, validation, and integration with message repository
 */
@Injectable()
export class MultimediaMessageService {
  private readonly logger = new Logger(MultimediaMessageService.name);

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Create a multimedia message from file information
   * @param senderIP - IP address of the sender
   * @param receiverIP - IP address of the receiver
   * @param fileInfo - Information about the stored file
   * @returns Created multimedia message
   */
  createMultimediaMessage(
    senderIP: string,
    receiverIP: string,
    fileInfo: StoredFileInfo,
  ): MultimediaMessage {
    // Determine message type based on MIME type
    const messageType = this.getMessageType(fileInfo.mimeType);
    const fileType = messageType === MessageType.IMAGE ? 'image' : 'video';

    const message: MultimediaMessage = {
      id: randomUUID(),
      senderIP,
      receiverIP,
      timestamp: Date.now(),
      type: messageType,
      fileType: fileType as 'image' | 'video',
      status: 'sent',
      direction: 'sent',
      content: `[${messageType.toUpperCase()}] ${fileInfo.originalName}`,
      fileId: fileInfo.fileId,
      fileName: fileInfo.originalName,
      fileSize: fileInfo.fileSize,
      downloadUrl: this.generateDownloadUrl(fileInfo.fileId),
    };

    // Save to repository
    this.messageRepository.save(message as Message);

    this.logger.log(
      `Multimedia message created: ${message.id} from ${senderIP} to ${receiverIP}`,
    );

    return message;
  }

  /**
   * Get a multimedia message by ID
   * @param messageId - ID of the message to retrieve
   * @returns Multimedia message or null if not found
   */
  getMultimediaMessage(messageId: string): MultimediaMessage | null {
    const allMessages = this.messageRepository.findAll();
    const message = allMessages.find((msg) => msg.id === messageId);

    if (!message || !this.isMultimediaMessage(message)) {
      return null;
    }

    return message as MultimediaMessage;
  }

  /**
   * Check if a message is a multimedia message
   * @param message - Message to check
   * @returns True if message is a multimedia message
   */
  private isMultimediaMessage(message: Message): boolean {
    return (
      'fileId' in message &&
      'fileName' in message &&
      'fileSize' in message &&
      'downloadUrl' in message
    );
  }

  /**
   * Generate a download URL for a file
   * @param fileId - ID of the file
   * @returns Download URL
   */
  generateDownloadUrl(fileId: string): string {
    return `/files/${fileId}`;
  }

  /**
   * Validate a multimedia message request
   * @param dto - Send multimedia message DTO
   * @returns Validation result
   */
  validateMultimediaMessageRequest(
    dto: SendMultimediaMessageDto,
  ): ValidationResult {
    // Validate target IP
    if (!dto.targetIP || typeof dto.targetIP !== 'string') {
      return {
        isValid: false,
        error: 'Invalid target IP address',
      };
    }

    // Validate file ID
    if (!dto.fileId || typeof dto.fileId !== 'string') {
      return {
        isValid: false,
        error: 'Invalid file ID',
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * Determine message type based on MIME type
   * @param mimeType - MIME type of the file
   * @returns Message type (IMAGE or VIDEO)
   */
  private getMessageType(mimeType: string): MessageType.IMAGE | MessageType.VIDEO {
    if (mimeType.startsWith('image/')) {
      return MessageType.IMAGE;
    }
    if (mimeType.startsWith('video/')) {
      return MessageType.VIDEO;
    }
    // Default to IMAGE if uncertain
    return MessageType.IMAGE;
  }

  /**
   * Get recent multimedia messages for a user
   * @param userIP - IP address of the user
   * @param limit - Maximum number of messages to return
   * @returns Array of multimedia messages
   */
  getRecentMultimediaMessages(userIP: string, limit: number = 50): MultimediaMessage[] {
    const messages = this.messageRepository.findByUserIP(userIP, limit);
    return messages.filter((msg) => this.isMultimediaMessage(msg)) as MultimediaMessage[];
  }

  /**
   * Get multimedia messages in a conversation between two users
   * @param userIP1 - First user's IP address
   * @param userIP2 - Second user's IP address
   * @param limit - Maximum number of messages to return
   * @returns Array of multimedia messages
   */
  getConversationMultimediaMessages(
    userIP1: string,
    userIP2: string,
    limit: number = 50,
  ): MultimediaMessage[] {
    const messages = this.messageRepository.findConversation(
      userIP1,
      userIP2,
      limit,
    );
    return messages.filter((msg) => this.isMultimediaMessage(msg)) as MultimediaMessage[];
  }
}
