import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../types';
import * as fc from 'fast-check';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, UserRepository],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    // Clear repository after each test
    repository.clear();
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should register a user', () => {
      const user = service.registerUser('socket1', '192.168.1.1');
      expect(user).toBeDefined();
      expect(user.ip).toBe('192.168.1.1');
      expect(user.socketId).toBe('socket1');
      expect(user.isOnline).toBe(true);
    });

    it('should remove a user', () => {
      service.registerUser('socket1', '192.168.1.1');
      const removed = service.removeUser('socket1');
      expect(removed).toBeDefined();
      expect(removed?.socketId).toBe('socket1');
    });
  });

  /**
   * Feature: lan-messaging-app, Property 3: 在线用户列表准确性
   * 
   * 对于任意时刻，获取在线用户列表应该返回所有当前已连接的用户，
   * 且每个用户对象应该包含有效的IP地址和Socket ID。
   * 
   * **验证需求: 2.1, 2.2, 2.3**
   */
  describe('Property 3: 在线用户列表准确性', () => {
    it('should return all currently connected users with valid IP and Socket ID', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              socketId: fc.string({ minLength: 1, maxLength: 50 }),
              ip: fc.ipV4(),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (userSpecs) => {
            // Clear repository before test
            repository.clear();
            
            // Create unique socket IDs to avoid duplicates
            const uniqueUserSpecs = new Map<string, { socketId: string; ip: string }>();
            for (const spec of userSpecs) {
              uniqueUserSpecs.set(spec.socketId, spec);
            }
            const uniqueSpecs = Array.from(uniqueUserSpecs.values());
            
            // Register all users
            const registeredUsers: User[] = [];
            for (const spec of uniqueSpecs) {
              const user = service.registerUser(spec.socketId, spec.ip);
              registeredUsers.push(user);
            }

            // Get online users
            const onlineUsers = service.getOnlineUsers();

            // Verify count matches (should match unique users)
            expect(onlineUsers.length).toBe(uniqueSpecs.length);

            // Verify each user has valid IP and Socket ID
            for (const user of onlineUsers) {
              expect(user.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
              expect(user.socketId).toBeTruthy();
              expect(typeof user.socketId).toBe('string');
              expect(user.socketId.length).toBeGreaterThan(0);
              expect(user.isOnline).toBe(true);
            }

            // Verify all registered users are in online list
            for (const registered of registeredUsers) {
              const found = onlineUsers.find(u => u.socketId === registered.socketId);
              expect(found).toBeDefined();
              expect(found?.ip).toBe(registered.ip);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only return online users (filter out offline users)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              socketId: fc.string({ minLength: 1, maxLength: 50 }),
              ip: fc.ipV4(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: 0, max: 10 }),
          (userSpecs, removeCount) => {
            // Clear repository before test
            repository.clear();
            
            // Create unique socket IDs to avoid duplicates
            const uniqueUserSpecs = new Map<string, { socketId: string; ip: string }>();
            for (const spec of userSpecs) {
              uniqueUserSpecs.set(spec.socketId, spec);
            }
            const uniqueSpecs = Array.from(uniqueUserSpecs.values());
            
            // Register all users
            const registeredUsers: User[] = [];
            for (const spec of uniqueSpecs) {
              const user = service.registerUser(spec.socketId, spec.ip);
              registeredUsers.push(user);
            }

            // Remove some users (simulate disconnect)
            const actualRemoveCount = Math.min(removeCount, uniqueSpecs.length);
            const removedUsers: User[] = [];
            for (let i = 0; i < actualRemoveCount; i++) {
              const removed = service.removeUser(registeredUsers[i].socketId);
              if (removed) {
                removedUsers.push(removed);
              }
            }

            // Get online users
            const onlineUsers = service.getOnlineUsers();

            // Verify count is correct (total - removed)
            expect(onlineUsers.length).toBe(uniqueSpecs.length - removedUsers.length);

            // Verify no removed users are in online list
            for (const removed of removedUsers) {
              const found = onlineUsers.find(u => u.socketId === removed.socketId);
              expect(found).toBeUndefined();
            }

            // Verify all online users are actually online
            for (const user of onlineUsers) {
              expect(user.isOnline).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: lan-messaging-app, Property 4: 用户连接和断开的一致性
   * 
   * 对于任意用户，当用户建立WebSocket连接时，该用户应该出现在在线列表中；
   * 当用户断开连接时，该用户应该从在线列表中移除。
   * 
   * **验证需求: 2.1, 4.1**
   */
  describe('Property 4: 用户连接和断开的一致性', () => {
    it('should add user to online list when connected and remove when disconnected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.ipV4(),
          (socketId, ip) => {
            // Clear repository before test
            repository.clear();
            
            // Initially no users should be online
            expect(service.getOnlineUsers()).toHaveLength(0);
            expect(service.isUserOnline(ip)).toBe(false);

            // Register user (simulate connection)
            const user = service.registerUser(socketId, ip);
            
            // User should appear in online list
            const onlineUsers = service.getOnlineUsers();
            expect(onlineUsers).toHaveLength(1);
            expect(onlineUsers[0].socketId).toBe(socketId);
            expect(onlineUsers[0].ip).toBe(ip);
            expect(onlineUsers[0].isOnline).toBe(true);
            expect(service.isUserOnline(ip)).toBe(true);

            // User should be findable by IP and socketId
            const foundByIP = service.findUserByIP(ip);
            const foundBySocketId = service.findUserBySocketId(socketId);
            expect(foundByIP).toBeDefined();
            expect(foundBySocketId).toBeDefined();
            expect(foundByIP?.socketId).toBe(socketId);
            expect(foundBySocketId?.ip).toBe(ip);

            // Remove user (simulate disconnect)
            const removed = service.removeUser(socketId);
            expect(removed).toBeDefined();
            expect(removed?.socketId).toBe(socketId);

            // User should be removed from online list
            expect(service.getOnlineUsers()).toHaveLength(0);
            expect(service.isUserOnline(ip)).toBe(false);

            // User should not be findable anymore
            expect(service.findUserByIP(ip)).toBeNull();
            expect(service.findUserBySocketId(socketId)).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple users connecting and disconnecting', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              socketId: fc.string({ minLength: 1, maxLength: 50 }),
              ip: fc.ipV4(),
            }),
            { minLength: 1, maxLength: 15 }
          ),
          fc.array(fc.integer(), { maxLength: 15 }),
          (userSpecs, disconnectIndices) => {
            // Clear repository before test
            repository.clear();
            
            // Create unique socket IDs to avoid duplicates
            const uniqueUserSpecs = new Map<string, { socketId: string; ip: string }>();
            for (const spec of userSpecs) {
              uniqueUserSpecs.set(spec.socketId, spec);
            }
            const uniqueSpecs = Array.from(uniqueUserSpecs.values());
            
            // Register all users
            const registeredUsers: User[] = [];
            for (const spec of uniqueSpecs) {
              const user = service.registerUser(spec.socketId, spec.ip);
              registeredUsers.push(user);
              
              // Verify user is immediately online
              expect(service.isUserOnline(spec.ip)).toBe(true);
            }

            // All users should be online (should match unique users)
            expect(service.getOnlineUsers()).toHaveLength(uniqueSpecs.length);

            // Disconnect some users based on indices
            const validIndices = disconnectIndices
              .filter(idx => idx >= 0 && idx < uniqueSpecs.length)
              .slice(0, uniqueSpecs.length); // Limit to avoid duplicates
            
            const uniqueIndices = [...new Set(validIndices)];
            const disconnectedUsers: User[] = [];
            
            for (const idx of uniqueIndices) {
              const user = registeredUsers[idx];
              const removed = service.removeUser(user.socketId);
              if (removed) {
                disconnectedUsers.push(removed);
                // Verify user is immediately offline
                expect(service.isUserOnline(user.ip)).toBe(false);
              }
            }

            // Verify final online count
            const expectedOnlineCount = uniqueSpecs.length - disconnectedUsers.length;
            expect(service.getOnlineUsers()).toHaveLength(expectedOnlineCount);

            // Verify consistency: all remaining users should be online
            const onlineUsers = service.getOnlineUsers();
            for (const user of onlineUsers) {
              expect(user.isOnline).toBe(true);
              expect(service.isUserOnline(user.ip)).toBe(true);
              
              // Should not be in disconnected list
              const wasDisconnected = disconnectedUsers.some(d => d.socketId === user.socketId);
              expect(wasDisconnected).toBe(false);
            }

            // Verify disconnected users are not online
            for (const disconnected of disconnectedUsers) {
              expect(service.isUserOnline(disconnected.ip)).toBe(false);
              expect(service.findUserBySocketId(disconnected.socketId)).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency when same IP connects with different socket IDs', () => {
      fc.assert(
        fc.property(
          fc.ipV4(),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          (ip, socketIds) => {
            // Clear repository before test
            repository.clear();
            
            const uniqueSocketIds = [...new Set(socketIds)];
            
            // Connect multiple socket IDs with same IP
            for (const socketId of uniqueSocketIds) {
              service.registerUser(socketId, ip);
              
              // IP should be online
              expect(service.isUserOnline(ip)).toBe(true);
            }

            // Should have all socket connections
            expect(service.getOnlineUsers()).toHaveLength(uniqueSocketIds.length);

            // Disconnect all but one
            for (let i = 0; i < uniqueSocketIds.length - 1; i++) {
              service.removeUser(uniqueSocketIds[i]);
            }

            // IP should still be online (one connection remains)
            if (uniqueSocketIds.length > 1) {
              expect(service.isUserOnline(ip)).toBe(true);
              expect(service.getOnlineUsers()).toHaveLength(1);
            }

            // Disconnect the last one
            service.removeUser(uniqueSocketIds[uniqueSocketIds.length - 1]);

            // Now IP should be offline
            expect(service.isUserOnline(ip)).toBe(false);
            expect(service.getOnlineUsers()).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});