import { describe, it, expect } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { AppContextProvider, useAppContext, useAppState } from './AppContext';
import { Message, User, ConnectionStatus } from '../types';

// Mock data
const mockUser: User = {
  id: 'test-socket-id',
  ip: '192.168.1.100',
  socketId: 'test-socket-id',
  connectedAt: Date.now(),
  lastActivity: Date.now(),
  isOnline: true,
};

const mockMessage: Message = {
  id: 'test-message-id',
  content: 'Test message',
  senderIP: '192.168.1.100',
  receiverIP: '192.168.1.101',
  timestamp: Date.now(),
  direction: 'sent',
  status: 'pending',
};

const mockConnectionStatus: ConnectionStatus = {
  status: 'connected',
  connectedAt: Date.now(),
  reconnectAttempts: 0,
};

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AppContextProvider>{children}</AppContextProvider>;
}

describe('AppContext', () => {
  describe('useAppContext hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useAppContext());
      }).toThrow('useAppContext must be used within an AppContextProvider');
    });

    it('should provide initial state', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state).toEqual({
        currentUser: null,
        messages: [],
        onlineUsers: [],
        connectionStatus: {
          status: 'disconnected',
          reconnectAttempts: 0,
        },
      });
    });
  });

  describe('state management', () => {
    it('should set current user', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setCurrentUser(mockUser);
      });

      expect(result.current.state.currentUser).toEqual(mockUser);
    });

    it('should set connection status', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setConnectionStatus(mockConnectionStatus);
      });

      expect(result.current.state.connectionStatus).toEqual(mockConnectionStatus);
    });

    it('should add message', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.addMessage(mockMessage);
      });

      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0]).toEqual(mockMessage);
    });

    it('should update message status', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      // First add a message
      act(() => {
        result.current.addMessage(mockMessage);
      });

      // Then update its status
      act(() => {
        result.current.updateMessageStatus(mockMessage.id, 'sent');
      });

      expect(result.current.state.messages[0].status).toBe('sent');
    });

    it('should set messages array', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      const messages = [mockMessage, { ...mockMessage, id: 'message-2' }];

      act(() => {
        result.current.setMessages(messages);
      });

      expect(result.current.state.messages).toEqual(messages);
    });

    it('should set online users', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      const users = [mockUser, { ...mockUser, id: 'user-2', ip: '192.168.1.102' }];

      act(() => {
        result.current.setOnlineUsers(users);
      });

      expect(result.current.state.onlineUsers).toEqual(users);
    });

    it('should add online user', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.addOnlineUser(mockUser);
      });

      expect(result.current.state.onlineUsers).toHaveLength(1);
      expect(result.current.state.onlineUsers[0]).toEqual(mockUser);
    });

    it('should not add duplicate online user', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.addOnlineUser(mockUser);
        result.current.addOnlineUser(mockUser); // Try to add same user again
      });

      expect(result.current.state.onlineUsers).toHaveLength(1);
    });

    it('should remove online user', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      // First add a user
      act(() => {
        result.current.addOnlineUser(mockUser);
      });

      expect(result.current.state.onlineUsers).toHaveLength(1);

      // Then remove the user
      act(() => {
        result.current.removeOnlineUser(mockUser.ip);
      });

      expect(result.current.state.onlineUsers).toHaveLength(0);
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      // Add some data
      act(() => {
        result.current.setCurrentUser(mockUser);
        result.current.addMessage(mockMessage);
        result.current.addOnlineUser(mockUser);
        result.current.setConnectionStatus(mockConnectionStatus);
      });

      // Verify data is added
      expect(result.current.state.currentUser).toEqual(mockUser);
      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.onlineUsers).toHaveLength(1);
      expect(result.current.state.connectionStatus).toEqual(mockConnectionStatus);

      // Reset state
      act(() => {
        result.current.resetState();
      });

      // Verify state is reset
      expect(result.current.state).toEqual({
        currentUser: null,
        messages: [],
        onlineUsers: [],
        connectionStatus: {
          status: 'disconnected',
          reconnectAttempts: 0,
        },
      });
    });
  });

  describe('convenience hooks', () => {
    it('should provide read-only state access', () => {
      const { result } = renderHook(() => useAppState(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toEqual({
        currentUser: null,
        messages: [],
        onlineUsers: [],
        connectionStatus: {
          status: 'disconnected',
          reconnectAttempts: 0,
        },
      });
    });
  });

  describe('provider rendering', () => {
    it('should render children correctly', () => {
      const TestComponent = () => <div data-testid="test-child">Test Child</div>;
      
      const { getByTestId } = render(
        <AppContextProvider>
          <TestComponent />
        </AppContextProvider>
      );

      expect(getByTestId('test-child')).toBeInTheDocument();
    });
  });

  describe('message status transitions', () => {
    it('should handle message status transitions correctly', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      // Add a pending message
      act(() => {
        result.current.addMessage(mockMessage);
      });

      expect(result.current.state.messages[0].status).toBe('pending');

      // Update to sent
      act(() => {
        result.current.updateMessageStatus(mockMessage.id, 'sent');
      });

      expect(result.current.state.messages[0].status).toBe('sent');

      // Update to failed
      act(() => {
        result.current.updateMessageStatus(mockMessage.id, 'failed');
      });

      expect(result.current.state.messages[0].status).toBe('failed');
    });

    it('should not update status for non-existent message', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.addMessage(mockMessage);
      });

      const originalMessage = result.current.state.messages[0];

      // Try to update non-existent message
      act(() => {
        result.current.updateMessageStatus('non-existent-id', 'sent');
      });

      // Original message should remain unchanged
      expect(result.current.state.messages[0]).toEqual(originalMessage);
    });
  });

  describe('online users management', () => {
    it('should handle multiple users correctly', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      const user1 = mockUser;
      const user2 = { ...mockUser, id: 'user-2', ip: '192.168.1.102', socketId: 'socket-2' };
      const user3 = { ...mockUser, id: 'user-3', ip: '192.168.1.103', socketId: 'socket-3' };

      // Add users one by one
      act(() => {
        result.current.addOnlineUser(user1);
        result.current.addOnlineUser(user2);
        result.current.addOnlineUser(user3);
      });

      expect(result.current.state.onlineUsers).toHaveLength(3);

      // Remove middle user
      act(() => {
        result.current.removeOnlineUser(user2.ip);
      });

      expect(result.current.state.onlineUsers).toHaveLength(2);
      expect(result.current.state.onlineUsers.find(u => u.ip === user2.ip)).toBeUndefined();
      expect(result.current.state.onlineUsers.find(u => u.ip === user1.ip)).toBeDefined();
      expect(result.current.state.onlineUsers.find(u => u.ip === user3.ip)).toBeDefined();
    });
  });

  describe('enhanced state update methods', () => {
    it('should create pending message correctly', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      // Set current user first
      act(() => {
        result.current.setCurrentUser(mockUser);
      });

      let createdMessage: any;
      act(() => {
        createdMessage = result.current.createPendingMessage('192.168.1.102', 'Test message');
      });

      expect(createdMessage).toBeDefined();
      expect(createdMessage.content).toBe('Test message');
      expect(createdMessage.senderIP).toBe(mockUser.ip);
      expect(createdMessage.receiverIP).toBe('192.168.1.102');
      expect(createdMessage.status).toBe('pending');
      expect(createdMessage.direction).toBe('sent');
      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0]).toEqual(createdMessage);
    });

    it('should mark message as sent', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.addMessage(mockMessage);
      });

      expect(result.current.state.messages[0].status).toBe('pending');

      act(() => {
        result.current.markMessageAsSent(mockMessage.id);
      });

      expect(result.current.state.messages[0].status).toBe('sent');
    });

    it('should mark message as failed', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.addMessage(mockMessage);
      });

      expect(result.current.state.messages[0].status).toBe('pending');

      act(() => {
        result.current.markMessageAsFailed(mockMessage.id);
      });

      expect(result.current.state.messages[0].status).toBe('failed');
    });

    it('should update connection with reconnect attempt', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.connectionStatus.reconnectAttempts).toBe(0);
      expect(result.current.state.connectionStatus.status).toBe('disconnected');

      act(() => {
        result.current.updateConnectionWithReconnectAttempt();
      });

      expect(result.current.state.connectionStatus.status).toBe('connecting');
      expect(result.current.state.connectionStatus.reconnectAttempts).toBe(1);

      // Call again to increment
      act(() => {
        result.current.updateConnectionWithReconnectAttempt();
      });

      expect(result.current.state.connectionStatus.reconnectAttempts).toBe(2);
    });

    it('should reset reconnect attempts', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      // First increment attempts
      act(() => {
        result.current.updateConnectionWithReconnectAttempt();
        result.current.updateConnectionWithReconnectAttempt();
      });

      expect(result.current.state.connectionStatus.reconnectAttempts).toBe(2);

      // Reset attempts
      act(() => {
        result.current.resetReconnectAttempts();
      });

      expect(result.current.state.connectionStatus.reconnectAttempts).toBe(0);
    });

    it('should check if user is online', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      const user1 = mockUser;
      const user2 = { ...mockUser, id: 'user-2', ip: '192.168.1.102', socketId: 'socket-2' };

      // Add one user
      act(() => {
        result.current.addOnlineUser(user1);
      });

      expect(result.current.isUserOnline(user1.ip)).toBe(true);
      expect(result.current.isUserOnline(user2.ip)).toBe(false);
      expect(result.current.isUserOnline('192.168.1.999')).toBe(false);
    });

    it('should get conversation with specific user', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      const currentUserIP = '192.168.1.101';
      const targetUserIP = '192.168.1.102';
      const otherUserIP = '192.168.1.103';

      // Set current user
      act(() => {
        result.current.setCurrentUser({ ...mockUser, ip: currentUserIP });
      });

      // Add messages
      const message1 = { ...mockMessage, id: 'msg1', senderIP: currentUserIP, receiverIP: targetUserIP, timestamp: 1000 };
      const message2 = { ...mockMessage, id: 'msg2', senderIP: targetUserIP, receiverIP: currentUserIP, timestamp: 2000 };
      const message3 = { ...mockMessage, id: 'msg3', senderIP: currentUserIP, receiverIP: otherUserIP, timestamp: 3000 };
      const message4 = { ...mockMessage, id: 'msg4', senderIP: targetUserIP, receiverIP: currentUserIP, timestamp: 4000 };

      act(() => {
        result.current.addMessage(message1);
        result.current.addMessage(message2);
        result.current.addMessage(message3);
        result.current.addMessage(message4);
      });

      const conversation = result.current.getConversationWith(targetUserIP);

      expect(conversation).toHaveLength(3);
      expect(conversation[0]).toEqual(message1);
      expect(conversation[1]).toEqual(message2);
      expect(conversation[2]).toEqual(message4);
      // Should be sorted by timestamp
      expect(conversation[0].timestamp).toBeLessThan(conversation[1].timestamp);
      expect(conversation[1].timestamp).toBeLessThan(conversation[2].timestamp);
    });

    it('should get pending messages', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      const pendingMessage1 = { ...mockMessage, id: 'pending1', status: 'pending' as const };
      const sentMessage = { ...mockMessage, id: 'sent1', status: 'sent' as const };
      const failedMessage = { ...mockMessage, id: 'failed1', status: 'failed' as const };
      const pendingMessage2 = { ...mockMessage, id: 'pending2', status: 'pending' as const };

      act(() => {
        result.current.addMessage(pendingMessage1);
        result.current.addMessage(sentMessage);
        result.current.addMessage(failedMessage);
        result.current.addMessage(pendingMessage2);
      });

      const pendingMessages = result.current.getPendingMessages();

      expect(pendingMessages).toHaveLength(2);
      expect(pendingMessages[0]).toEqual(pendingMessage1);
      expect(pendingMessages[1]).toEqual(pendingMessage2);
    });

    it('should handle empty conversation when no current user', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: TestWrapper,
      });

      // Don't set current user
      const conversation = result.current.getConversationWith('192.168.1.102');

      expect(conversation).toHaveLength(0);
    });
  });
});