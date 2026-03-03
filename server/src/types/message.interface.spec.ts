import * as fc from 'fast-check';
import { Message } from './message.interface';

/**
 * Property-Based Tests for Message Data Model
 * 
 * These tests verify the correctness properties defined in the design document
 * using fast-check for property-based testing.
 */

describe('Message Data Model - Property-Based Tests', () => {
  /**
   * Feature: lan-messaging-app, Property 5: 消息对象完整性
   * **Validates: Requirements 3.3, 3.4, 5.3, 5.4**
   * 
   * 对于任意创建的消息，该消息对象应该包含所有必需字段：
   * 唯一ID、内容、发送方IP、接收方IP和时间戳。
   */
  describe('Property 5: Message Object Integrity', () => {
    it('should contain all required fields for any created message', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary message objects
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            senderIP: fc.ipV4(),
            receiverIP: fc.ipV4(),
            timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            direction: fc.constantFrom('sent' as const, 'received' as const),
            status: fc.constantFrom('pending' as const, 'sent' as const, 'failed' as const),
          }),
          (message: Message) => {
            // Verify all required fields are present
            expect(message).toHaveProperty('id');
            expect(message).toHaveProperty('content');
            expect(message).toHaveProperty('senderIP');
            expect(message).toHaveProperty('receiverIP');
            expect(message).toHaveProperty('timestamp');

            // Verify fields are not null or undefined
            expect(message.id).toBeDefined();
            expect(message.id).not.toBeNull();
            expect(message.content).toBeDefined();
            expect(message.content).not.toBeNull();
            expect(message.senderIP).toBeDefined();
            expect(message.senderIP).not.toBeNull();
            expect(message.receiverIP).toBeDefined();
            expect(message.receiverIP).not.toBeNull();
            expect(message.timestamp).toBeDefined();
            expect(message.timestamp).not.toBeNull();

            // Verify field types
            expect(typeof message.id).toBe('string');
            expect(typeof message.content).toBe('string');
            expect(typeof message.senderIP).toBe('string');
            expect(typeof message.receiverIP).toBe('string');
            expect(typeof message.timestamp).toBe('number');
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
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            senderIP: fc.ipV4(),
            receiverIP: fc.ipV4(),
            timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            direction: fc.constantFrom('sent' as const, 'received' as const),
            status: fc.constantFrom('pending' as const, 'sent' as const, 'failed' as const),
          }),
          (message: Message) => {
            // Verify id is non-empty string
            expect(message.id.length).toBeGreaterThan(0);

            // Verify content is within valid length
            expect(message.content.length).toBeGreaterThan(0);
            expect(message.content.length).toBeLessThanOrEqual(1000);

            // Verify IPs are valid format (basic check)
            expect(message.senderIP).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
            expect(message.receiverIP).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);

            // Verify timestamp is non-negative
            expect(message.timestamp).toBeGreaterThanOrEqual(0);

            // Verify direction is valid
            expect(['sent', 'received']).toContain(message.direction);

            // Verify status is valid
            expect(['pending', 'sent', 'failed']).toContain(message.status);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });
  });

  /**
   * Feature: lan-messaging-app, Property 14: 消息往返一致性
   * **Validates: 数据完整性**
   * 
   * 对于任意消息对象，将其序列化为JSON后再反序列化，
   * 应该得到等价的消息对象（所有字段值相同）。
   */
  describe('Property 14: Message Round-trip Consistency', () => {
    it('should maintain all field values after JSON serialization and deserialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            senderIP: fc.ipV4(),
            receiverIP: fc.ipV4(),
            timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            direction: fc.constantFrom('sent' as const, 'received' as const),
            status: fc.constantFrom('pending' as const, 'sent' as const, 'failed' as const),
          }),
          (originalMessage: Message) => {
            // Serialize to JSON
            const jsonString = JSON.stringify(originalMessage);

            // Deserialize back to object
            const deserializedMessage: Message = JSON.parse(jsonString);

            // Verify all fields are equal
            expect(deserializedMessage.id).toBe(originalMessage.id);
            expect(deserializedMessage.content).toBe(originalMessage.content);
            expect(deserializedMessage.senderIP).toBe(originalMessage.senderIP);
            expect(deserializedMessage.receiverIP).toBe(originalMessage.receiverIP);
            expect(deserializedMessage.timestamp).toBe(originalMessage.timestamp);
            expect(deserializedMessage.direction).toBe(originalMessage.direction);
            expect(deserializedMessage.status).toBe(originalMessage.status);

            // Verify deep equality
            expect(deserializedMessage).toEqual(originalMessage);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });

    it('should handle special characters in content during round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            senderIP: fc.ipV4(),
            receiverIP: fc.ipV4(),
            timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            direction: fc.constantFrom('sent' as const, 'received' as const),
            status: fc.constantFrom('pending' as const, 'sent' as const, 'failed' as const),
          }),
          (originalMessage: Message) => {
            // Test with various special characters
            const specialChars = ['\n', '\t', '"', '\\', '/', '\b', '\f', '\r'];
            const contentWithSpecialChars = originalMessage.content + specialChars.join('');
            
            const messageWithSpecialContent: Message = {
              ...originalMessage,
              content: contentWithSpecialChars.substring(0, 1000), // Ensure within limit
            };

            // Serialize and deserialize
            const jsonString = JSON.stringify(messageWithSpecialContent);
            const deserializedMessage: Message = JSON.parse(jsonString);

            // Verify content is preserved correctly
            expect(deserializedMessage.content).toBe(messageWithSpecialContent.content);
            expect(deserializedMessage).toEqual(messageWithSpecialContent);
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
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            senderIP: fc.ipV4(),
            receiverIP: fc.ipV4(),
            timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
            direction: fc.constantFrom('sent' as const, 'received' as const),
            status: fc.constantFrom('pending' as const, 'sent' as const, 'failed' as const),
          }),
          (originalMessage: Message) => {
            // Serialize and deserialize
            const jsonString = JSON.stringify(originalMessage);
            const deserializedMessage: Message = JSON.parse(jsonString);

            // Verify timestamp is exactly the same (no precision loss)
            expect(deserializedMessage.timestamp).toBe(originalMessage.timestamp);
            expect(typeof deserializedMessage.timestamp).toBe('number');
            expect(Number.isInteger(deserializedMessage.timestamp)).toBe(true);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });
  });
});
