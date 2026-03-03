import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { MessageRepository } from '../repositories/message.repository';
import { Message } from '../types';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for MessageService
 * 
 * 这些测试验证 MessageService 的通用属性，使用 fast-check 库
 * 进行基于属性的测试，确保在各种输入下系统行为的正确性。
 */
describe('MessageService - Property-Based Tests', () => {
  let service: MessageService;
  let repository: MessageRepository;

  beforeEach(async () => {
    // 为每个测试创建新的模块实例，确保完全隔离
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService, 
        {
          provide: MessageRepository,
          useFactory: () => new MessageRepository(),
        }
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    repository = module.get<MessageRepository>(MessageRepository);
  });

  afterEach(() => {
    // 清理所有消息，确保测试之间的隔离
    repository.clear();
  });

  /**
   * 属性 6: 消息历史持久性
   * **验证需求: 5.1, 5.2**
   * 
   * 对于任意成功发送的消息，该消息应该被存储在消息历史中，
   * 并且可以通过查询消息历史获取。
   */
  describe('Property 6: Message History Persistence', () => {
    it('**Validates: Requirements 5.1, 5.2** - Any successfully sent message should be stored in message history and retrievable', () => {
      fc.assert(
        fc.property(
          // 生成有效的IP地址
          fc.ipV4(),
          fc.ipV4(),
          // 生成有效的消息内容（1-1000字符）
          fc.string({ minLength: 1, maxLength: 1000 }),
          (senderIP, receiverIP, content) => {
            // 清理仓库确保测试隔离
            repository.clear();
            
            // 创建消息
            const message = service.createMessage(senderIP, receiverIP, content);
            
            // 验证消息被创建
            expect(message).toBeDefined();
            expect(message.id).toBeDefined();
            expect(message.senderIP).toBe(senderIP);
            expect(message.receiverIP).toBe(receiverIP);
            expect(message.content).toBe(content);
            
            // 验证消息在历史记录中可以找到
            const allMessages = service.getMessageHistory();
            const foundMessage = allMessages.find(m => m.id === message.id);
            
            expect(foundMessage).toBeDefined();
            expect(foundMessage).toEqual(message);
            
            // 验证可以通过用户消息历史查询找到
            const senderMessages = service.getUserMessageHistory(senderIP);
            const receiverMessages = service.getUserMessageHistory(receiverIP);
            
            expect(senderMessages.some(m => m.id === message.id)).toBe(true);
            expect(receiverMessages.some(m => m.id === message.id)).toBe(true);
            
            // 验证可以通过对话查询找到
            const conversation = service.getConversation(senderIP, receiverIP);
            expect(conversation.some(m => m.id === message.id)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('**Validates: Requirements 5.1, 5.2** - Multiple messages should all be persisted and retrievable', () => {
      fc.assert(
        fc.property(
          // 生成多个消息的数组
          fc.array(
            fc.record({
              senderIP: fc.ipV4(),
              receiverIP: fc.ipV4(),
              content: fc.string({ minLength: 1, maxLength: 1000 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (messageData) => {
            // 清理仓库确保测试隔离
            repository.clear();
            
            const createdMessages: Message[] = [];
            
            // 创建所有消息
            for (const data of messageData) {
              const message = service.createMessage(
                data.senderIP,
                data.receiverIP,
                data.content
              );
              createdMessages.push(message);
            }
            
            // 验证所有消息都在历史记录中
            const allMessages = service.getMessageHistory();
            expect(allMessages.length).toBe(createdMessages.length);
            
            for (const createdMessage of createdMessages) {
              const foundMessage = allMessages.find(m => m.id === createdMessage.id);
              expect(foundMessage).toBeDefined();
              expect(foundMessage).toEqual(createdMessage);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('**Validates: Requirements 5.1, 5.2** - Saved messages should be retrievable through saveMessage method', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            senderIP: fc.ipV4(),
            receiverIP: fc.ipV4(),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
            direction: fc.constantFrom('sent' as const, 'received' as const),
            status: fc.constantFrom('pending' as const, 'sent' as const, 'failed' as const)
          }),
          (messageData) => {
            // 清理仓库确保测试隔离
            repository.clear();
            
            const message: Message = messageData as Message;
            
            // 直接保存消息
            service.saveMessage(message);
            
            // 验证消息在历史记录中可以找到
            const allMessages = service.getMessageHistory();
            const foundMessage = allMessages.find(m => m.id === message.id);
            
            expect(foundMessage).toBeDefined();
            expect(foundMessage).toEqual(message);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 7: 消息时间顺序
   * **验证需求: 5.5**
   * 
   * 对于任意消息历史查询，返回的消息数组应该按时间戳升序排列
   * （最早的在前，最新的在后）。
   */
  describe('Property 7: Message Time Ordering', () => {
    it('**Validates: Requirements 5.5** - Message history should be sorted by timestamp in ascending order', () => {
      fc.assert(
        fc.property(
          // 生成多个消息，每个消息有不同的时间戳
          fc.array(
            fc.record({
              senderIP: fc.ipV4(),
              receiverIP: fc.ipV4(),
              content: fc.string({ minLength: 1, maxLength: 1000 }),
              timestamp: fc.integer({ min: 1000000000000, max: Date.now() }) // 有效的时间戳范围
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (messageData) => {
            // 清理仓库确保测试隔离
            repository.clear();
            
            // 按随机顺序创建消息，但使用指定的时间戳
            const shuffledData = [...messageData].sort(() => Math.random() - 0.5);
            
            for (const data of shuffledData) {
              const message: Message = {
                id: `test-${Math.random()}`,
                content: data.content,
                senderIP: data.senderIP,
                receiverIP: data.receiverIP,
                timestamp: data.timestamp,
                direction: 'sent',
                status: 'pending'
              };
              service.saveMessage(message);
            }
            
            // 获取消息历史
            const messages = service.getMessageHistory();
            
            // 验证消息按时间戳升序排列
            for (let i = 1; i < messages.length; i++) {
              expect(messages[i].timestamp).toBeGreaterThanOrEqual(messages[i - 1].timestamp);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('**Validates: Requirements 5.5** - User message history should be sorted by timestamp in ascending order', () => {
      fc.assert(
        fc.property(
          fc.ipV4(), // 目标用户IP
          fc.array(
            fc.record({
              senderIP: fc.ipV4(),
              receiverIP: fc.ipV4(),
              content: fc.string({ minLength: 1, maxLength: 1000 }),
              timestamp: fc.integer({ min: 1000000000000, max: Date.now() })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (targetUserIP, messageData) => {
            // 清理仓库确保测试隔离
            repository.clear();
            
            // 确保至少有一些消息涉及目标用户
            const modifiedData = messageData.map((data, index) => {
              if (index % 2 === 0) {
                return { ...data, senderIP: targetUserIP };
              } else {
                return { ...data, receiverIP: targetUserIP };
              }
            });
            
            // 按随机顺序创建消息
            const shuffledData = [...modifiedData].sort(() => Math.random() - 0.5);
            
            for (const data of shuffledData) {
              const message: Message = {
                id: `test-${Math.random()}`,
                content: data.content,
                senderIP: data.senderIP,
                receiverIP: data.receiverIP,
                timestamp: data.timestamp,
                direction: 'sent',
                status: 'pending'
              };
              service.saveMessage(message);
            }
            
            // 获取用户消息历史
            const userMessages = service.getUserMessageHistory(targetUserIP);
            
            // 验证消息按时间戳升序排列
            for (let i = 1; i < userMessages.length; i++) {
              expect(userMessages[i].timestamp).toBeGreaterThanOrEqual(userMessages[i - 1].timestamp);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('**Validates: Requirements 5.5** - Conversation history should be sorted by timestamp in ascending order', () => {
      fc.assert(
        fc.property(
          fc.ipV4(), // 用户1 IP
          fc.ipV4(), // 用户2 IP
          fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 1000 }),
              timestamp: fc.integer({ min: 1000000000000, max: Date.now() }),
              direction: fc.boolean() // true = user1 -> user2, false = user2 -> user1
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (user1IP, user2IP, messageData) => {
            // 清理仓库确保测试隔离
            repository.clear();
            
            // 跳过相同IP的情况
            if (user1IP === user2IP) return;
            
            // 按随机顺序创建对话消息
            const shuffledData = [...messageData].sort(() => Math.random() - 0.5);
            
            for (const data of shuffledData) {
              const message: Message = {
                id: `test-${Math.random()}`,
                content: data.content,
                senderIP: data.direction ? user1IP : user2IP,
                receiverIP: data.direction ? user2IP : user1IP,
                timestamp: data.timestamp,
                direction: 'sent',
                status: 'pending'
              };
              service.saveMessage(message);
            }
            
            // 获取对话历史
            const conversation = service.getConversation(user1IP, user2IP);
            
            // 验证消息按时间戳升序排列
            for (let i = 1; i < conversation.length; i++) {
              expect(conversation[i].timestamp).toBeGreaterThanOrEqual(conversation[i - 1].timestamp);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('**Validates: Requirements 5.5** - Messages created with createMessage should maintain chronological order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              senderIP: fc.ipV4(),
              receiverIP: fc.ipV4(),
              content: fc.string({ minLength: 1, maxLength: 1000 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (messageData) => {
            // 清理仓库确保测试隔离
            repository.clear();
            
            const createdMessages: Message[] = [];
            
            // 按顺序创建消息（createMessage 使用当前时间戳）
            for (const data of messageData) {
              const message = service.createMessage(
                data.senderIP,
                data.receiverIP,
                data.content
              );
              createdMessages.push(message);
              
              // 添加小延迟确保时间戳不同
              const start = Date.now();
              while (Date.now() - start < 1) {
                // 忙等待1毫秒
              }
            }
            
            // 获取消息历史
            const messages = service.getMessageHistory();
            
            // 验证消息按创建顺序排列（时间戳升序）
            const relevantMessages = messages.filter(m => 
              createdMessages.some(cm => cm.id === m.id)
            );
            
            for (let i = 1; i < relevantMessages.length; i++) {
              expect(relevantMessages[i].timestamp).toBeGreaterThanOrEqual(relevantMessages[i - 1].timestamp);
            }
          }
        ),
        { numRuns: 30 } // 减少运行次数因为有延迟
      );
    });
  });
});