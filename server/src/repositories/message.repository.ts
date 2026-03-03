import { Injectable } from '@nestjs/common';
import { Message } from '../types/message.interface';

/**
 * MessageRepository manages message history in memory
 * Uses an array to store messages with a maximum capacity of 1000
 * Implements FIFO cleanup when capacity is exceeded
 */
@Injectable()
export class MessageRepository {
  private messages: Message[] = [];
  private readonly maxMessages: number = 1000;

  /**
   * Save a message to the repository
   * @param message - Message object to save
   */
  save(message: Message): void {
    this.messages.push(message);
    // Auto-cleanup if exceeding max capacity
    if (this.messages.length > this.maxMessages) {
      this.cleanup(this.maxMessages);
    }
  }

  /**
   * Get all messages from the repository
   * @param limit - Optional limit on number of messages to return
   * @returns Array of messages sorted by timestamp in ascending order
   */
  findAll(limit?: number): Message[] {
    const sorted = [...this.messages].sort((a, b) => a.timestamp - b.timestamp);
    if (limit && limit > 0) {
      return sorted.slice(-limit);
    }
    return sorted;
  }

  /**
   * Find messages involving a specific user IP (as sender or receiver)
   * @param userIP - IP address to search for
   * @param limit - Optional limit on number of messages to return
   * @returns Array of messages involving the user, sorted by timestamp in ascending order
   */
  findByUserIP(userIP: string, limit?: number): Message[] {
    const filtered = this.messages.filter(
      (msg) => msg.senderIP === userIP || msg.receiverIP === userIP,
    );
    const sorted = filtered.sort((a, b) => a.timestamp - b.timestamp);
    if (limit && limit > 0) {
      return sorted.slice(-limit);
    }
    return sorted;
  }

  /**
   * Find conversation between two users
   * @param userIP1 - First user's IP address
   * @param userIP2 - Second user's IP address
   * @param limit - Optional limit on number of messages to return
   * @returns Array of messages between the two users, sorted by timestamp in ascending order
   */
  findConversation(userIP1: string, userIP2: string, limit?: number): Message[] {
    const filtered = this.messages.filter(
      (msg) =>
        (msg.senderIP === userIP1 && msg.receiverIP === userIP2) ||
        (msg.senderIP === userIP2 && msg.receiverIP === userIP1),
    );
    const sorted = filtered.sort((a, b) => a.timestamp - b.timestamp);
    if (limit && limit > 0) {
      return sorted.slice(-limit);
    }
    return sorted;
  }

  /**
   * Clean up old messages using FIFO strategy
   * Removes oldest messages to keep total at or below maxMessages
   * @param maxMessages - Maximum number of messages to keep
   */
  cleanup(maxMessages: number): void {
    if (this.messages.length > maxMessages) {
      const removeCount = this.messages.length - maxMessages;
      this.messages.splice(0, removeCount);
    }
  }

  /**
   * Get the count of messages in the repository
   * @returns Number of messages
   */
  count(): number {
    return this.messages.length;
  }

  /**
   * Clear all messages from the repository
   */
  clear(): void {
    this.messages = [];
  }
}
