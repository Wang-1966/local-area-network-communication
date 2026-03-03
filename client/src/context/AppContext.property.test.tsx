/**
 * Property-based tests for AppContext
 * 
 * These tests verify universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { AppContextProvider, useAppContext } from './AppContext';
import { Message, User } from '../types';

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AppContextProvider>{children}</AppContextProvider>;
}

// Arbitraries for generating test data
const ipArbitrary = fc.tuple(
  fc.integer({ min: 1, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 1, max: 254 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

const messageContentArbitrary = fc.string({ minLength: 1, maxLength: 1000 });

const messageStatusArbitrary = fc.constantFrom('pending', 'sent', 'failed') as fc.Arbitrary<Message['status']>;

const userArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  ip: ipArbitrary,
  socketId: fc.string({ minLength: 1 }),
  connectedAt: fc.integer({ min: 0 }),
  lastActivity: fc.integer({ min: 0 }),
  isOnline: fc.boolean(),
});

const messageArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  content: messageContentArbitrary,
  senderIP: ipArbitrary,
  receiverIP: ipArbitrary,
  timestamp: fc.integer({ min: 0 }),
  direction: fc.constantFrom('sent', 'received') as fc.Arbitrary<Message['direction']>,
  status: messageStatusArbitrary,
});

describe('AppContext Property-Based Tests', () => {
  /**
   * Feature: lan-messaging-app, Property 11: 消息发送状态转换
   * 
   * 对于任意消息发送操作，消息状态应该遵循以下转换：
   * - 初始状态为'pending'
   * - 成功发送后转换为'sent'
   * - 发送失败后转换为'failed'
   * 
   * **Validates: Requirements 1.5, 8.3**
   */
  describe('Property 11: Message Status Transitions', () => {
    it('should always create messages with pending status initially', () => {
      fc.assert(
        fc.property(
          ipArbitrary,
          messageContentArbitrary,
          userArbitrary,
          (targetIP, content, currentUser) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Set current user
            act(() => {
              result.current.setCurrentUser(currentUser);
            });

            let createdMessage: Message;
            act(() => {
              createdMessage = result.current.createPendingMessage(targetIP, content);
            });

            // Property: All created messages must start with 'pending' status
            expect(createdMessage.status).toBe('pending');
            expect(result.current.state.messages[0].status).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly transition from pending to sent', () => {
      fc.assert(
        fc.property(
          messageArbitrary.filter(msg => msg.status === 'pending'),
          (pendingMessage) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add pending message
            act(() => {
              result.current.addMessage(pendingMessage);
            });

            // Verify initial state
            expect(result.current.state.messages[0].status).toBe('pending');

            // Transition to sent
            act(() => {
              result.current.markMessageAsSent(pendingMessage.id);
            });

            // Property: Status must transition from pending to sent
            expect(result.current.state.messages[0].status).toBe('sent');
            expect(result.current.state.messages[0].id).toBe(pendingMessage.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly transition from pending to failed', () => {
      fc.assert(
        fc.property(
          messageArbitrary.filter(msg => msg.status === 'pending'),
          (pendingMessage) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add pending message
            act(() => {
              result.current.addMessage(pendingMessage);
            });

            // Verify initial state
            expect(result.current.state.messages[0].status).toBe('pending');

            // Transition to failed
            act(() => {
              result.current.markMessageAsFailed(pendingMessage.id);
            });

            // Property: Status must transition from pending to failed
            expect(result.current.state.messages[0].status).toBe('failed');
            expect(result.current.state.messages[0].id).toBe(pendingMessage.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain message immutability during status transitions', () => {
      fc.assert(
        fc.property(
          messageArbitrary.filter(msg => msg.status === 'pending'),
          messageStatusArbitrary.filter(status => status !== 'pending'),
          (pendingMessage, newStatus) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add pending message
            act(() => {
              result.current.addMessage(pendingMessage);
            });

            const originalMessage = result.current.state.messages[0];

            // Update status
            act(() => {
              result.current.updateMessageStatus(pendingMessage.id, newStatus);
            });

            const updatedMessage = result.current.state.messages[0];

            // Property: Only status should change, all other fields remain the same
            expect(updatedMessage.status).toBe(newStatus);
            expect(updatedMessage.id).toBe(originalMessage.id);
            expect(updatedMessage.content).toBe(originalMessage.content);
            expect(updatedMessage.senderIP).toBe(originalMessage.senderIP);
            expect(updatedMessage.receiverIP).toBe(originalMessage.receiverIP);
            expect(updatedMessage.timestamp).toBe(originalMessage.timestamp);
            expect(updatedMessage.direction).toBe(originalMessage.direction);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect other messages when updating status', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          messageStatusArbitrary,
          (messages, targetIndex, newStatus) => {
            fc.pre(targetIndex < messages.length); // Precondition

            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add all messages
            act(() => {
              messages.forEach(msg => result.current.addMessage(msg));
            });

            const originalMessages = [...result.current.state.messages];
            const targetMessage = originalMessages[targetIndex];

            // Update status of target message
            act(() => {
              result.current.updateMessageStatus(targetMessage.id, newStatus);
            });

            const updatedMessages = result.current.state.messages;

            // Property: Only the target message should be affected
            expect(updatedMessages).toHaveLength(originalMessages.length);
            expect(updatedMessages[targetIndex].status).toBe(newStatus);

            // All other messages should remain unchanged
            updatedMessages.forEach((msg, index) => {
              if (index !== targetIndex) {
                expect(msg).toEqual(originalMessages[index]);
              }
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle non-existent message ID gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1 }).filter(id => !id.includes('existing')),
          messageStatusArbitrary,
          (messages, nonExistentId, newStatus) => {
            fc.pre(!messages.some(msg => msg.id === nonExistentId)); // Ensure ID doesn't exist

            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add messages
            act(() => {
              messages.forEach(msg => result.current.addMessage(msg));
            });

            const originalMessages = [...result.current.state.messages];

            // Try to update non-existent message
            act(() => {
              result.current.updateMessageStatus(nonExistentId, newStatus);
            });

            // Property: No messages should be affected when updating non-existent ID
            expect(result.current.state.messages).toEqual(originalMessages);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve message order during status updates', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 3, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          messageStatusArbitrary,
          (messages, targetIndex, newStatus) => {
            fc.pre(targetIndex < messages.length);

            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add messages in order
            act(() => {
              messages.forEach(msg => result.current.addMessage(msg));
            });

            const originalOrder = result.current.state.messages.map(msg => msg.id);

            // Update status of one message
            act(() => {
              result.current.updateMessageStatus(messages[targetIndex].id, newStatus);
            });

            const newOrder = result.current.state.messages.map(msg => msg.id);

            // Property: Message order should be preserved
            expect(newOrder).toEqual(originalOrder);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Reconnection Attempts Management', () => {
    it('should correctly increment reconnection attempts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (numAttempts) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Initial state should have 0 attempts
            expect(result.current.state.connectionStatus.reconnectAttempts).toBe(0);

            // Increment attempts
            for (let i = 0; i < numAttempts; i++) {
              act(() => {
                result.current.updateConnectionWithReconnectAttempt();
              });
            }

            // Property: Attempts should equal the number of increments
            expect(result.current.state.connectionStatus.reconnectAttempts).toBe(numAttempts);
            expect(result.current.state.connectionStatus.status).toBe('connecting');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reset attempts to zero regardless of current count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (initialAttempts) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Set up some attempts
            for (let i = 0; i < initialAttempts; i++) {
              act(() => {
                result.current.updateConnectionWithReconnectAttempt();
              });
            }

            expect(result.current.state.connectionStatus.reconnectAttempts).toBe(initialAttempts);

            // Reset attempts
            act(() => {
              result.current.resetReconnectAttempts();
            });

            // Property: Attempts should always be 0 after reset
            expect(result.current.state.connectionStatus.reconnectAttempts).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: State Consistency and Data Integrity', () => {
    it('should maintain user list uniqueness when adding users', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 1, maxLength: 10 }),
          (users) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add users multiple times (some may have duplicate IPs)
            act(() => {
              users.forEach(user => {
                result.current.addOnlineUser(user);
                // Try to add the same user again
                result.current.addOnlineUser(user);
              });
            });

            const onlineUsers = result.current.state.onlineUsers;
            const uniqueIPs = new Set(onlineUsers.map(user => user.ip));

            // Property: No duplicate IPs should exist in online users list
            expect(onlineUsers.length).toBe(uniqueIPs.size);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should correctly identify online users', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 1, maxLength: 5 }),
          ipArbitrary,
          (onlineUsers, testIP) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add online users
            act(() => {
              onlineUsers.forEach(user => result.current.addOnlineUser(user));
            });

            const isOnline = result.current.isUserOnline(testIP);
            const shouldBeOnline = onlineUsers.some(user => user.ip === testIP);

            // Property: isUserOnline should return true iff user IP exists in online list
            expect(isOnline).toBe(shouldBeOnline);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly filter conversation messages', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 5, maxLength: 20 }),
          ipArbitrary,
          ipArbitrary,
          (messages, userIP1, userIP2) => {
            fc.pre(userIP1 !== userIP2); // Ensure different IPs

            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Set current user
            act(() => {
              result.current.setCurrentUser({
                id: 'test-id',
                ip: userIP1,
                socketId: 'test-socket',
                connectedAt: Date.now(),
                lastActivity: Date.now(),
                isOnline: true,
              });
            });

            // Add messages
            act(() => {
              messages.forEach(msg => result.current.addMessage(msg));
            });

            const conversation = result.current.getConversationWith(userIP2);

            // Property: Conversation should only contain messages between userIP1 and userIP2
            conversation.forEach(msg => {
              const isValidConversationMessage = 
                (msg.senderIP === userIP1 && msg.receiverIP === userIP2) ||
                (msg.senderIP === userIP2 && msg.receiverIP === userIP1);
              expect(isValidConversationMessage).toBe(true);
            });

            // Property: Conversation should be sorted by timestamp
            for (let i = 1; i < conversation.length; i++) {
              expect(conversation[i].timestamp).toBeGreaterThanOrEqual(conversation[i - 1].timestamp);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should correctly filter pending messages', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 5, maxLength: 15 }),
          (messages) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Add messages
            act(() => {
              messages.forEach(msg => result.current.addMessage(msg));
            });

            const pendingMessages = result.current.getPendingMessages();

            // Property: All returned messages should have 'pending' status
            pendingMessages.forEach(msg => {
              expect(msg.status).toBe('pending');
            });

            // Property: Should include all pending messages from the state
            const expectedPendingCount = messages.filter(msg => msg.status === 'pending').length;
            expect(pendingMessages.length).toBe(expectedPendingCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain state immutability during updates', () => {
      fc.assert(
        fc.property(
          messageArbitrary,
          userArbitrary,
          (message, user) => {
            const { result } = renderHook(() => useAppContext(), {
              wrapper: TestWrapper,
            });

            // Get initial state reference
            const initialState = result.current.state;

            // Perform state updates
            act(() => {
              result.current.addMessage(message);
              result.current.addOnlineUser(user);
            });

            const newState = result.current.state;

            // Property: State reference should change (immutability)
            expect(newState).not.toBe(initialState);
            expect(newState.messages).not.toBe(initialState.messages);
            expect(newState.onlineUsers).not.toBe(initialState.onlineUsers);

            // Property: Original state should remain unchanged
            expect(initialState.messages).toHaveLength(0);
            expect(initialState.onlineUsers).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});