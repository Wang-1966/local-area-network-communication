import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { MessageRepository } from '../repositories/message.repository';
import { Message } from '../types';

describe('MessageService', () => {
  let service: MessageService;
  let repository: MessageRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageService, MessageRepository],
    }).compile();

    service = module.get<MessageService>(MessageService);
    repository = module.get<MessageRepository>(MessageRepository);
  });

  afterEach(() => {
    repository.clear();
  });

  describe('createMessage', () => {
    it('应该创建一个新消息', () => {
      const senderIP = '192.168.1.1';
      const receiverIP = '192.168.1.2';
      const content = 'Hello World';

      const message = service.createMessage(senderIP, receiverIP, content);

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.senderIP).toBe(senderIP);
      expect(message.receiverIP).toBe(receiverIP);
      expect(message.content).toBe(content);
      expect(message.direction).toBe('sent');
      expect(message.status).toBe('pending');
      expect(message.timestamp).toBeGreaterThan(0);
    });

    it('应该自动保存创建的消息', () => {
      const senderIP = '192.168.1.1';
      const receiverIP = '192.168.1.2';
      const content = 'Hello World';

      service.createMessage(senderIP, receiverIP, content);

      const messages = service.getMessageHistory();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(content);
    });
  });

  describe('getMessageHistory', () => {
    it('应该返回所有消息', () => {
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 1');
      service.createMessage('192.168.1.2', '192.168.1.1', 'Message 2');

      const messages = service.getMessageHistory();
      expect(messages).toHaveLength(2);
    });

    it('应该支持限制返回数量', () => {
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 1');
      service.createMessage('192.168.1.2', '192.168.1.1', 'Message 2');
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 3');

      const messages = service.getMessageHistory(2);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 2');
      expect(messages[1].content).toBe('Message 3');
    });
  });

  describe('getUserMessageHistory', () => {
    it('应该返回特定用户的消息历史', () => {
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 1');
      service.createMessage('192.168.1.2', '192.168.1.1', 'Message 2');
      service.createMessage('192.168.1.3', '192.168.1.1', 'Message 3');

      const messages = service.getUserMessageHistory('192.168.1.1');
      expect(messages).toHaveLength(3);
    });

    it('应该支持限制返回数量', () => {
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 1');
      service.createMessage('192.168.1.2', '192.168.1.1', 'Message 2');
      service.createMessage('192.168.1.1', '192.168.1.3', 'Message 3');

      const messages = service.getUserMessageHistory('192.168.1.1', 2);
      expect(messages).toHaveLength(2);
    });
  });

  describe('getConversation', () => {
    it('应该返回两个用户之间的对话', () => {
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 1');
      service.createMessage('192.168.1.2', '192.168.1.1', 'Message 2');
      service.createMessage('192.168.1.1', '192.168.1.3', 'Message 3');

      const messages = service.getConversation('192.168.1.1', '192.168.1.2');
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
    });

    it('应该支持限制返回数量', () => {
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 1');
      service.createMessage('192.168.1.2', '192.168.1.1', 'Message 2');
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 3');

      const messages = service.getConversation('192.168.1.1', '192.168.1.2', 2);
      expect(messages).toHaveLength(2);
    });
  });

  describe('saveMessage', () => {
    it('应该保存消息', () => {
      const message: Message = {
        id: 'test-id',
        content: 'Test message',
        senderIP: '192.168.1.1',
        receiverIP: '192.168.1.2',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'pending',
      };

      service.saveMessage(message);

      const messages = service.getMessageHistory();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });
  });

  describe('cleanupOldMessages', () => {
    it('应该清理旧消息', () => {
      // 创建5条消息
      for (let i = 1; i <= 5; i++) {
        service.createMessage('192.168.1.1', '192.168.1.2', `Message ${i}`);
      }

      expect(service.getMessageHistory()).toHaveLength(5);

      // 清理，只保留3条
      service.cleanupOldMessages(3);

      const messages = service.getMessageHistory();
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 3');
      expect(messages[1].content).toBe('Message 4');
      expect(messages[2].content).toBe('Message 5');
    });
  });

  describe('getMessageStats', () => {
    it('应该返回消息统计信息', () => {
      service.createMessage('192.168.1.1', '192.168.1.2', 'Message 1');
      service.createMessage('192.168.1.2', '192.168.1.1', 'Message 2');

      const stats = service.getMessageStats();
      expect(stats.totalMessages).toBe(2);
      expect(stats.messagesInLastHour).toBe(2);
    });

    it('应该正确计算最近一小时的消息数量', () => {
      // 创建一条旧消息（超过1小时）
      const oldMessage: Message = {
        id: 'old-message',
        content: 'Old message',
        senderIP: '192.168.1.1',
        receiverIP: '192.168.1.2',
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2小时前
        direction: 'sent',
        status: 'sent',
      };
      service.saveMessage(oldMessage);

      // 创建一条新消息
      service.createMessage('192.168.1.1', '192.168.1.2', 'New message');

      const stats = service.getMessageStats();
      expect(stats.totalMessages).toBe(2);
      expect(stats.messagesInLastHour).toBe(1);
    });
  });
});