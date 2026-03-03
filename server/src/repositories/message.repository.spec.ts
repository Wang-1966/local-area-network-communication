import { MessageRepository } from './message.repository';
import { Message } from '../types/message.interface';

describe('MessageRepository', () => {
  let repository: MessageRepository;

  beforeEach(() => {
    repository = new MessageRepository();
  });

  describe('save', () => {
    it('should save a message to the repository', () => {
      const message: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      repository.save(message);

      expect(repository.count()).toBe(1);
      expect(repository.findAll()).toContainEqual(message);
    });

    it('should save multiple messages', () => {
      const message1: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      const message2: Message = {
        id: 'msg-2',
        content: 'Hi',
        senderIP: '192.168.1.11',
        receiverIP: '192.168.1.10',
        timestamp: Date.now() + 1000,
        direction: 'received',
        status: 'sent',
      };

      repository.save(message1);
      repository.save(message2);

      expect(repository.count()).toBe(2);
    });

    it('should auto-cleanup when exceeding max capacity', () => {
      // Save 1001 messages to exceed the 1000 limit
      for (let i = 0; i < 1001; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      // Should keep only 1000 messages
      expect(repository.count()).toBe(1000);
      // First message should be removed (FIFO)
      expect(repository.findAll()[0].id).toBe('msg-1');
    });
  });

  describe('findAll', () => {
    it('should return empty array when no messages', () => {
      const messages = repository.findAll();

      expect(messages).toEqual([]);
    });

    it('should return all messages', () => {
      const message1: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      const message2: Message = {
        id: 'msg-2',
        content: 'Hi',
        senderIP: '192.168.1.11',
        receiverIP: '192.168.1.10',
        timestamp: Date.now() + 1000,
        direction: 'received',
        status: 'sent',
      };

      repository.save(message1);
      repository.save(message2);
      const messages = repository.findAll();

      expect(messages).toHaveLength(2);
      expect(messages).toContainEqual(message1);
      expect(messages).toContainEqual(message2);
    });

    it('should return limited number of messages', () => {
      for (let i = 0; i < 10; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      const messages = repository.findAll(5);

      expect(messages).toHaveLength(5);
      // Should return the last 5 messages
      expect(messages[0].id).toBe('msg-5');
      expect(messages[4].id).toBe('msg-9');
    });

    it('should return copy of messages array', () => {
      const message: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      repository.save(message);
      const messages1 = repository.findAll();
      const messages2 = repository.findAll();

      expect(messages1).not.toBe(messages2);
      expect(messages1).toEqual(messages2);
    });
  });

  describe('findByUserIP', () => {
    it('should find messages by sender IP', () => {
      const message: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      repository.save(message);
      const messages = repository.findByUserIP('192.168.1.10');

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should find messages by receiver IP', () => {
      const message: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'received',
        status: 'sent',
      };

      repository.save(message);
      const messages = repository.findByUserIP('192.168.1.11');

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should find messages where user is sender or receiver', () => {
      const message1: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      const message2: Message = {
        id: 'msg-2',
        content: 'Hi',
        senderIP: '192.168.1.11',
        receiverIP: '192.168.1.10',
        timestamp: Date.now() + 1000,
        direction: 'received',
        status: 'sent',
      };

      repository.save(message1);
      repository.save(message2);
      const messages = repository.findByUserIP('192.168.1.10');

      expect(messages).toHaveLength(2);
    });

    it('should return empty array when no messages for user', () => {
      const messages = repository.findByUserIP('192.168.1.99');

      expect(messages).toEqual([]);
    });

    it('should return limited number of messages', () => {
      for (let i = 0; i < 10; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      const messages = repository.findByUserIP('192.168.1.10', 5);

      expect(messages).toHaveLength(5);
    });
  });

  describe('findConversation', () => {
    it('should find conversation between two users', () => {
      const message1: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      const message2: Message = {
        id: 'msg-2',
        content: 'Hi',
        senderIP: '192.168.1.11',
        receiverIP: '192.168.1.10',
        timestamp: Date.now() + 1000,
        direction: 'received',
        status: 'sent',
      };

      repository.save(message1);
      repository.save(message2);
      const messages = repository.findConversation('192.168.1.10', '192.168.1.11');

      expect(messages).toHaveLength(2);
      expect(messages).toContainEqual(message1);
      expect(messages).toContainEqual(message2);
    });

    it('should find conversation regardless of user order', () => {
      const message: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      repository.save(message);
      const messages1 = repository.findConversation('192.168.1.10', '192.168.1.11');
      const messages2 = repository.findConversation('192.168.1.11', '192.168.1.10');

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
      expect(messages1).toEqual(messages2);
    });

    it('should exclude messages with other users', () => {
      const message1: Message = {
        id: 'msg-1',
        content: 'Hello',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      const message2: Message = {
        id: 'msg-2',
        content: 'Hi',
        senderIP: '192.168.1.10',
        receiverIP: '192.168.1.12',
        timestamp: Date.now() + 1000,
        direction: 'sent',
        status: 'sent',
      };

      repository.save(message1);
      repository.save(message2);
      const messages = repository.findConversation('192.168.1.10', '192.168.1.11');

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-1');
    });

    it('should return empty array when no conversation', () => {
      const messages = repository.findConversation('192.168.1.10', '192.168.1.11');

      expect(messages).toEqual([]);
    });

    it('should return limited number of messages', () => {
      for (let i = 0; i < 10; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: i % 2 === 0 ? '192.168.1.10' : '192.168.1.11',
          receiverIP: i % 2 === 0 ? '192.168.1.11' : '192.168.1.10',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      const messages = repository.findConversation('192.168.1.10', '192.168.1.11', 5);

      expect(messages.length).toBeLessThanOrEqual(5);
    });
  });

  describe('cleanup', () => {
    it('should remove old messages to reach max capacity', () => {
      for (let i = 0; i < 20; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      repository.cleanup(10);

      expect(repository.count()).toBe(10);
      // Should keep the last 10 messages
      expect(repository.findAll()[0].id).toBe('msg-10');
    });

    it('should not remove messages if below max capacity', () => {
      for (let i = 0; i < 5; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      repository.cleanup(10);

      expect(repository.count()).toBe(5);
    });

    it('should handle cleanup with zero max capacity', () => {
      for (let i = 0; i < 5; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      repository.cleanup(0);

      expect(repository.count()).toBe(0);
    });
  });

  describe('count', () => {
    it('should return 0 for empty repository', () => {
      expect(repository.count()).toBe(0);
    });

    it('should return correct count', () => {
      for (let i = 0; i < 5; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      expect(repository.count()).toBe(5);
    });
  });

  describe('clear', () => {
    it('should clear all messages', () => {
      for (let i = 0; i < 5; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      repository.clear();

      expect(repository.count()).toBe(0);
      expect(repository.findAll()).toEqual([]);
    });
  });

  describe('boundary conditions', () => {
    it('should handle empty repository operations', () => {
      expect(repository.findAll()).toEqual([]);
      expect(repository.findByUserIP('192.168.1.10')).toEqual([]);
      expect(repository.findConversation('192.168.1.10', '192.168.1.11')).toEqual([]);
      expect(repository.count()).toBe(0);
    });

    it('should handle max capacity (1000 messages)', () => {
      for (let i = 0; i < 1000; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      expect(repository.count()).toBe(1000);
    });

    it('should maintain FIFO order during cleanup', () => {
      for (let i = 0; i < 15; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      repository.cleanup(10);

      const messages = repository.findAll();
      expect(messages[0].id).toBe('msg-5');
      expect(messages[9].id).toBe('msg-14');
    });

    it('should handle limit parameter edge cases', () => {
      for (let i = 0; i < 5; i++) {
        const message: Message = {
          id: `msg-${i}`,
          content: `Message ${i}`,
          senderIP: '192.168.1.10',
          receiverIP: '192.168.1.11',
          timestamp: Date.now() + i,
          direction: 'sent',
          status: 'sent',
        };
        repository.save(message);
      }

      expect(repository.findAll(0)).toHaveLength(5);
      expect(repository.findAll(-1)).toHaveLength(5);
      expect(repository.findAll(100)).toHaveLength(5);
    });
  });
});
