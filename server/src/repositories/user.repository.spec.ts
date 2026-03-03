import { UserRepository } from './user.repository';
import { User } from '../types/user.interface';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
  });

  describe('add', () => {
    it('should add a user to the repository', () => {
      const user: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user);

      expect(repository.count()).toBe(1);
      expect(repository.findBySocketId('socket-1')).toEqual(user);
    });

    it('should add multiple users', () => {
      const user1: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      const user2: User = {
        id: 'socket-2',
        ip: '192.168.1.11',
        socketId: 'socket-2',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user1);
      repository.add(user2);

      expect(repository.count()).toBe(2);
    });

    it('should overwrite existing user with same socketId', () => {
      const user1: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      const user2: User = {
        id: 'socket-1',
        ip: '192.168.1.20',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user1);
      repository.add(user2);

      expect(repository.count()).toBe(1);
      expect(repository.findBySocketId('socket-1')?.ip).toBe('192.168.1.20');
    });
  });

  describe('remove', () => {
    it('should remove a user from the repository', () => {
      const user: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user);
      const removed = repository.remove('socket-1');

      expect(removed).toEqual(user);
      expect(repository.count()).toBe(0);
    });

    it('should return null when removing non-existent user', () => {
      const removed = repository.remove('non-existent');

      expect(removed).toBeNull();
    });

    it('should not affect other users when removing one', () => {
      const user1: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      const user2: User = {
        id: 'socket-2',
        ip: '192.168.1.11',
        socketId: 'socket-2',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user1);
      repository.add(user2);
      repository.remove('socket-1');

      expect(repository.count()).toBe(1);
      expect(repository.findBySocketId('socket-2')).toEqual(user2);
    });
  });

  describe('findBySocketId', () => {
    it('should find a user by socketId', () => {
      const user: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user);
      const found = repository.findBySocketId('socket-1');

      expect(found).toEqual(user);
    });

    it('should return null when user not found', () => {
      const found = repository.findBySocketId('non-existent');

      expect(found).toBeNull();
    });

    it('should return null from empty repository', () => {
      const found = repository.findBySocketId('socket-1');

      expect(found).toBeNull();
    });
  });

  describe('findByIP', () => {
    it('should find a user by IP address', () => {
      const user: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user);
      const found = repository.findByIP('192.168.1.10');

      expect(found).toEqual(user);
    });

    it('should return null when IP not found', () => {
      const found = repository.findByIP('192.168.1.99');

      expect(found).toBeNull();
    });

    it('should find correct user when multiple users exist', () => {
      const user1: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      const user2: User = {
        id: 'socket-2',
        ip: '192.168.1.11',
        socketId: 'socket-2',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user1);
      repository.add(user2);
      const found = repository.findByIP('192.168.1.11');

      expect(found).toEqual(user2);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no users', () => {
      const users = repository.findAll();

      expect(users).toEqual([]);
    });

    it('should return all users', () => {
      const user1: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      const user2: User = {
        id: 'socket-2',
        ip: '192.168.1.11',
        socketId: 'socket-2',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user1);
      repository.add(user2);
      const users = repository.findAll();

      expect(users).toHaveLength(2);
      expect(users).toContainEqual(user1);
      expect(users).toContainEqual(user2);
    });

    it('should return a copy of the users array', () => {
      const user: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user);
      const users1 = repository.findAll();
      const users2 = repository.findAll();

      expect(users1).not.toBe(users2);
      expect(users1).toEqual(users2);
    });
  });

  describe('update', () => {
    it('should update a user', () => {
      const user: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user);
      const updated = repository.update('socket-1', { isOnline: false });

      expect(updated?.isOnline).toBe(false);
      expect(updated?.ip).toBe('192.168.1.10');
    });

    it('should return null when updating non-existent user', () => {
      const updated = repository.update('non-existent', { isOnline: false });

      expect(updated).toBeNull();
    });

    it('should update multiple fields', () => {
      const user: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user);
      const newTime = Date.now() + 1000;
      const updated = repository.update('socket-1', {
        isOnline: false,
        lastActivity: newTime,
      });

      expect(updated?.isOnline).toBe(false);
      expect(updated?.lastActivity).toBe(newTime);
    });
  });

  describe('count', () => {
    it('should return 0 for empty repository', () => {
      expect(repository.count()).toBe(0);
    });

    it('should return correct count', () => {
      const user1: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      const user2: User = {
        id: 'socket-2',
        ip: '192.168.1.11',
        socketId: 'socket-2',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user1);
      expect(repository.count()).toBe(1);

      repository.add(user2);
      expect(repository.count()).toBe(2);

      repository.remove('socket-1');
      expect(repository.count()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all users', () => {
      const user1: User = {
        id: 'socket-1',
        ip: '192.168.1.10',
        socketId: 'socket-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      const user2: User = {
        id: 'socket-2',
        ip: '192.168.1.11',
        socketId: 'socket-2',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      };

      repository.add(user1);
      repository.add(user2);
      repository.clear();

      expect(repository.count()).toBe(0);
      expect(repository.findAll()).toEqual([]);
    });
  });

  describe('boundary conditions', () => {
    it('should handle empty repository operations', () => {
      expect(repository.findAll()).toEqual([]);
      expect(repository.count()).toBe(0);
      expect(repository.remove('any')).toBeNull();
      expect(repository.findBySocketId('any')).toBeNull();
      expect(repository.findByIP('any')).toBeNull();
    });

    it('should handle large number of users', () => {
      const users: User[] = [];
      for (let i = 0; i < 100; i++) {
        const user: User = {
          id: `socket-${i}`,
          ip: `192.168.1.${i}`,
          socketId: `socket-${i}`,
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          isOnline: true,
        };
        users.push(user);
        repository.add(user);
      }

      expect(repository.count()).toBe(100);
      expect(repository.findAll()).toHaveLength(100);
      expect(repository.findByIP('192.168.1.50')).toEqual(users[50]);
    });
  });
});
