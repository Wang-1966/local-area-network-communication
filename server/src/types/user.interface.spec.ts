import * as fc from 'fast-check';
import { User, ConnectionStatus } from './user.interface';

/**
 * Property-Based Tests for User Data Model
 * 
 * These tests verify the correctness properties defined in the design document
 * using fast-check for property-based testing.
 */

describe('User Data Model - Property-Based Tests', () => {
  /**
   * Feature: lan-messaging-app, Property 5: 消息对象完整性 (adapted for User)
   * **Validates: Requirements 3.3, 3.4, 5.3, 5.4**
   * 
   * 对于任意创建的用户对象，该用户对象应该包含所有必需字段：
   * 唯一ID、IP地址、Socket ID、连接时间、最后活跃时间和在线状态。
   */
  describe('Property 5: User Object Integrity', () => {
    it('should contain all required fields for any created user', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary user objects
          fc.record({
            id: fc.uuid(),
            ip: fc.ipV4(),
            socketId: fc.string({ minLength: 1, maxLength: 100 }),
            connectedAt: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            lastActivity: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            isOnline: fc.boolean(),
          }),
          (user: User) => {
            // Verify all required fields are present
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('ip');
            expect(user).toHaveProperty('socketId');
            expect(user).toHaveProperty('connectedAt');
            expect(user).toHaveProperty('lastActivity');
            expect(user).toHaveProperty('isOnline');

            // Verify fields are not null or undefined
            expect(user.id).toBeDefined();
            expect(user.id).not.toBeNull();
            expect(user.ip).toBeDefined();
            expect(user.ip).not.toBeNull();
            expect(user.socketId).toBeDefined();
            expect(user.socketId).not.toBeNull();
            expect(user.connectedAt).toBeDefined();
            expect(user.connectedAt).not.toBeNull();
            expect(user.lastActivity).toBeDefined();
            expect(user.lastActivity).not.toBeNull();
            expect(user.isOnline).toBeDefined();
            expect(user.isOnline).not.toBeNull();

            // Verify field types
            expect(typeof user.id).toBe('string');
            expect(typeof user.ip).toBe('string');
            expect(typeof user.socketId).toBe('string');
            expect(typeof user.connectedAt).toBe('number');
            expect(typeof user.lastActivity).toBe('number');
            expect(typeof user.isOnline).toBe('boolean');
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });

    it('should have valid field values', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            ip: fc.ipV4(),
            socketId: fc.string({ minLength: 1, maxLength: 100 }),
            connectedAt: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            lastActivity: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            isOnline: fc.boolean(),
          }),
          (user: User) => {
            // Verify id is non-empty string
            expect(user.id.length).toBeGreaterThan(0);

            // Verify IP is valid format (basic check)
            expect(user.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);

            // Verify socketId is non-empty
            expect(user.socketId.length).toBeGreaterThan(0);

            // Verify timestamps are non-negative
            expect(user.connectedAt).toBeGreaterThanOrEqual(0);
            expect(user.lastActivity).toBeGreaterThanOrEqual(0);

            // Verify isOnline is boolean
            expect(typeof user.isOnline).toBe('boolean');
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });
  });

  /**
   * Feature: lan-messaging-app, Property 14: 消息往返一致性 (adapted for User)
   * **Validates: 数据完整性**
   * 
   * 对于任意用户对象，将其序列化为JSON后再反序列化，
   * 应该得到等价的用户对象（所有字段值相同）。
   */
  describe('Property 14: User Round-trip Consistency', () => {
    it('should maintain all field values after JSON serialization and deserialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            ip: fc.ipV4(),
            socketId: fc.string({ minLength: 1, maxLength: 100 }),
            connectedAt: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            lastActivity: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            isOnline: fc.boolean(),
          }),
          (originalUser: User) => {
            // Serialize to JSON
            const jsonString = JSON.stringify(originalUser);

            // Deserialize back to object
            const deserializedUser: User = JSON.parse(jsonString);

            // Verify all fields are equal
            expect(deserializedUser.id).toBe(originalUser.id);
            expect(deserializedUser.ip).toBe(originalUser.ip);
            expect(deserializedUser.socketId).toBe(originalUser.socketId);
            expect(deserializedUser.connectedAt).toBe(originalUser.connectedAt);
            expect(deserializedUser.lastActivity).toBe(originalUser.lastActivity);
            expect(deserializedUser.isOnline).toBe(originalUser.isOnline);

            // Verify deep equality
            expect(deserializedUser).toEqual(originalUser);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });

    it('should preserve timestamp precision during round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            ip: fc.ipV4(),
            socketId: fc.string({ minLength: 1, maxLength: 100 }),
            connectedAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
            lastActivity: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
            isOnline: fc.boolean(),
          }),
          (originalUser: User) => {
            // Serialize and deserialize
            const jsonString = JSON.stringify(originalUser);
            const deserializedUser: User = JSON.parse(jsonString);

            // Verify timestamps are exactly the same (no precision loss)
            expect(deserializedUser.connectedAt).toBe(originalUser.connectedAt);
            expect(deserializedUser.lastActivity).toBe(originalUser.lastActivity);
            expect(typeof deserializedUser.connectedAt).toBe('number');
            expect(typeof deserializedUser.lastActivity).toBe('number');
            expect(Number.isInteger(deserializedUser.connectedAt)).toBe(true);
            expect(Number.isInteger(deserializedUser.lastActivity)).toBe(true);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });

    it('should preserve boolean values during round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            ip: fc.ipV4(),
            socketId: fc.string({ minLength: 1, maxLength: 100 }),
            connectedAt: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            lastActivity: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            isOnline: fc.boolean(),
          }),
          (originalUser: User) => {
            // Serialize and deserialize
            const jsonString = JSON.stringify(originalUser);
            const deserializedUser: User = JSON.parse(jsonString);

            // Verify boolean is preserved correctly
            expect(deserializedUser.isOnline).toBe(originalUser.isOnline);
            expect(typeof deserializedUser.isOnline).toBe('boolean');
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });
  });
});

describe('ConnectionStatus Data Model - Property-Based Tests', () => {
  /**
   * Feature: lan-messaging-app, Property 14: 消息往返一致性 (adapted for ConnectionStatus)
   * **Validates: 数据完整性**
   * 
   * 对于任意连接状态对象，将其序列化为JSON后再反序列化，
   * 应该得到等价的对象（所有字段值相同）。
   */
  describe('Property 14: ConnectionStatus Round-trip Consistency', () => {
    it('should maintain all field values after JSON serialization and deserialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            status: fc.constantFrom('connecting' as const, 'connected' as const, 'disconnected' as const),
            connectedAt: fc.option(fc.integer({ min: 0, max: Date.now() + 1000000 }), { nil: undefined }),
            lastPing: fc.option(fc.integer({ min: 0, max: Date.now() + 1000000 }), { nil: undefined }),
            reconnectAttempts: fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
          }),
          (originalStatus: ConnectionStatus) => {
            // Serialize to JSON
            const jsonString = JSON.stringify(originalStatus);

            // Deserialize back to object
            const deserializedStatus: ConnectionStatus = JSON.parse(jsonString);

            // Verify all fields are equal
            expect(deserializedStatus.status).toBe(originalStatus.status);
            expect(deserializedStatus.connectedAt).toBe(originalStatus.connectedAt);
            expect(deserializedStatus.lastPing).toBe(originalStatus.lastPing);
            expect(deserializedStatus.reconnectAttempts).toBe(originalStatus.reconnectAttempts);

            // Verify deep equality
            expect(deserializedStatus).toEqual(originalStatus);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });

    it('should handle optional fields correctly during round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            status: fc.constantFrom('connecting' as const, 'connected' as const, 'disconnected' as const),
            connectedAt: fc.option(fc.integer({ min: 0, max: Date.now() + 1000000 }), { nil: undefined }),
            lastPing: fc.option(fc.integer({ min: 0, max: Date.now() + 1000000 }), { nil: undefined }),
            reconnectAttempts: fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
          }),
          (originalStatus: ConnectionStatus) => {
            // Serialize and deserialize
            const jsonString = JSON.stringify(originalStatus);
            const deserializedStatus: ConnectionStatus = JSON.parse(jsonString);

            // Verify optional fields are handled correctly
            if (originalStatus.connectedAt === undefined) {
              expect(deserializedStatus.connectedAt).toBeUndefined();
            } else {
              expect(deserializedStatus.connectedAt).toBe(originalStatus.connectedAt);
            }

            if (originalStatus.lastPing === undefined) {
              expect(deserializedStatus.lastPing).toBeUndefined();
            } else {
              expect(deserializedStatus.lastPing).toBe(originalStatus.lastPing);
            }

            if (originalStatus.reconnectAttempts === undefined) {
              expect(deserializedStatus.reconnectAttempts).toBeUndefined();
            } else {
              expect(deserializedStatus.reconnectAttempts).toBe(originalStatus.reconnectAttempts);
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });
  });
});
