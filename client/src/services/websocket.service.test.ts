import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import * as fc from 'fast-check';
import { WebSocketService } from './websocket.service';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const createMockSocket = () => ({
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  });
  
  let mockSocket = createMockSocket();
  
  return {
    io: vi.fn(() => {
      mockSocket = createMockSocket();
      return mockSocket;
    }),
  };
});

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockSocket: any;
  let mockIo: MockedFunction<any>;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Get the mocked io function
    const { io } = await import('socket.io-client');
    mockIo = io as MockedFunction<any>;
    
    // Create a new service instance
    service = new WebSocketService();
    
    // Connect to initialize the socket
    service.connect('http://localhost:3000');
    
    // Get the mock socket that was created
    mockSocket = mockIo.mock.results[mockIo.mock.results.length - 1].value;
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to the server', () => {
      expect(mockIo).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          reconnection: false,
        })
      );
    });

    it('should use window.location.origin when no URL provided', () => {
      vi.clearAllMocks();
      
      const newService = new WebSocketService();
      newService.connect();
      
      expect(mockIo).toHaveBeenCalledWith(
        window.location.origin,
        expect.any(Object)
      );
    });

    it('should disconnect from the server', () => {
      service.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should return connection status', () => {
      mockSocket.connected = false;
      expect(service.isConnected()).toBe(false);
      
      mockSocket.connected = true;
      expect(service.isConnected()).toBe(true);
    });

    it('should return the socket instance', () => {
      const socket = service.getSocket();
      expect(socket).toBe(mockSocket);
    });

    it('should setup event handlers on connect', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });
  });

  describe('Message Operations', () => {
    beforeEach(() => {
      mockSocket.connected = true;
    });

    it('should send a message', () => {
      const targetIP = '192.168.1.100';
      const content = 'Hello, World!';
      
      service.sendMessage(targetIP, content);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('sendMessage', {
        targetIP,
        content,
      });
    });

    it('should throw error when sending message while disconnected', () => {
      mockSocket.connected = false;
      
      expect(() => {
        service.sendMessage('192.168.1.100', 'Hello');
      }).toThrow('Socket not connected');
    });

    it('should request online users', () => {
      service.getOnlineUsers();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('getOnlineUsers');
    });

    it('should throw error when requesting online users while disconnected', () => {
      mockSocket.connected = false;
      
      expect(() => {
        service.getOnlineUsers();
      }).toThrow('Socket not connected');
    });

    it('should request message history without options', () => {
      service.getMessageHistory();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('getMessageHistory', {});
    });

    it('should request message history with options', () => {
      const options = { targetIP: '192.168.1.100', limit: 50 };
      
      service.getMessageHistory(options);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('getMessageHistory', options);
    });

    it('should throw error when requesting message history while disconnected', () => {
      mockSocket.connected = false;
      
      expect(() => {
        service.getMessageHistory();
      }).toThrow('Socket not connected');
    });
  });

  describe('Event Listeners', () => {
    it('should register event listeners', () => {
      const handler = vi.fn();
      
      service.on('connected', handler);
      
      expect(mockSocket.on).toHaveBeenCalledWith('connected', handler);
    });

    it('should register multiple event types', () => {
      const connectedHandler = vi.fn();
      const messageHandler = vi.fn();
      const errorHandler = vi.fn();
      
      service.on('connected', connectedHandler);
      service.on('newMessage', messageHandler);
      service.on('error', errorHandler);
      
      expect(mockSocket.on).toHaveBeenCalledWith('connected', connectedHandler);
      expect(mockSocket.on).toHaveBeenCalledWith('newMessage', messageHandler);
      expect(mockSocket.on).toHaveBeenCalledWith('error', errorHandler);
    });

    it('should remove event listener with handler', () => {
      const handler = vi.fn();
      
      service.off('connected', handler);
      
      expect(mockSocket.off).toHaveBeenCalledWith('connected', handler);
    });

    it('should remove all listeners for an event', () => {
      service.off('connected');
      
      expect(mockSocket.off).toHaveBeenCalledWith('connected');
    });

    it('should throw error when registering listener without socket', () => {
      service.disconnect();
      const handler = vi.fn();
      
      expect(() => {
        service.on('connected', handler);
      }).toThrow('Socket not initialized');
    });

    it('should not throw when removing listener without socket', () => {
      service.disconnect();
      
      expect(() => {
        service.off('connected');
      }).not.toThrow();
    });
  });

  describe('Reconnection Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should attempt reconnection on disconnect', () => {
      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];
      
      expect(disconnectHandler).toBeDefined();
      
      // Simulate disconnect
      mockSocket.connected = false;
      disconnectHandler('transport close');
      
      // Fast-forward time
      vi.advanceTimersByTime(3000);
      
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should not reconnect on manual disconnect', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];
      
      mockSocket.connected = false;
      disconnectHandler('io client disconnect');
      
      vi.advanceTimersByTime(3000);
      
      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('should attempt reconnection on connection error', () => {
      const errorHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect_error'
      )?.[1];
      
      expect(errorHandler).toBeDefined();
      
      mockSocket.connected = false;
      errorHandler(new Error('Connection failed'));
      
      vi.advanceTimersByTime(3000);
      
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should stop reconnecting after max attempts', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];
      
      mockSocket.connected = false;
      
      // Attempt reconnection 5 times
      for (let i = 0; i < 5; i++) {
        disconnectHandler('transport close');
        vi.advanceTimersByTime(3000);
      }
      
      // Clear previous calls
      mockSocket.connect.mockClear();
      
      // Try one more time
      disconnectHandler('transport close');
      vi.advanceTimersByTime(3000);
      
      // Should not attempt to reconnect
      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('should reset reconnect attempts on successful connection', () => {
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];
      
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];
      
      // Disconnect and reconnect a few times
      mockSocket.connected = false;
      disconnectHandler('transport close');
      vi.advanceTimersByTime(3000);
      
      mockSocket.connected = false;
      disconnectHandler('transport close');
      vi.advanceTimersByTime(3000);
      
      // Successful connection
      mockSocket.connected = true;
      connectHandler();
      
      // Clear previous calls
      mockSocket.connect.mockClear();
      
      // Now we should be able to reconnect 5 more times
      mockSocket.connected = false;
      for (let i = 0; i < 5; i++) {
        disconnectHandler('transport close');
        vi.advanceTimersByTime(3000);
      }
      
      expect(mockSocket.connect).toHaveBeenCalledTimes(5);
    });

    it('should manually reconnect', () => {
      mockSocket.connected = true;
      
      service.reconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should reset reconnect attempts on manual reconnect', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];
      
      // Attempt reconnection a few times
      mockSocket.connected = false;
      disconnectHandler('transport close');
      vi.advanceTimersByTime(3000);
      
      disconnectHandler('transport close');
      vi.advanceTimersByTime(3000);
      
      // Manual reconnect
      service.reconnect();
      
      // Clear previous calls
      mockSocket.connect.mockClear();
      
      // Should be able to reconnect 5 more times
      mockSocket.connected = false;
      for (let i = 0; i < 5; i++) {
        disconnectHandler('transport close');
        vi.advanceTimersByTime(3000);
      }
      
      expect(mockSocket.connect).toHaveBeenCalledTimes(5);
    });
  });

  describe('Property 10: Connection Status Consistency', () => {
    /**
     * Feature: lan-messaging-app, Property 10: 连接状态一致性
     * 
     * 对于任意时刻，前端显示的连接状态应该准确反映WebSocket的实际连接状态
     * （connecting、connected或disconnected）。
     * 
     * **Validates: Requirements 7.1, 7.4**
     */
    it('should accurately reflect connection status', () => {
      // Initially disconnected
      mockSocket.connected = false;
      expect(service.isConnected()).toBe(false);
      
      // After connection
      mockSocket.connected = true;
      expect(service.isConnected()).toBe(true);
      
      // After disconnection
      mockSocket.connected = false;
      expect(service.isConnected()).toBe(false);
    });

    it('should return false when socket is null', () => {
      service.disconnect();
      expect(service.isConnected()).toBe(false);
    });

    it('should return null socket when disconnected', () => {
      service.disconnect();
      expect(service.getSocket()).toBeNull();
    });

    it('property: connection status should always match socket.connected state', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (connected) => {
            // Set the mock socket's connected state
            mockSocket.connected = connected;
            
            // The service should report the same connection status
            expect(service.isConnected()).toBe(connected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: isConnected should return false when socket is null regardless of previous state', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (initialConnectedState) => {
            // Set initial state
            mockSocket.connected = initialConnectedState;
            
            // Disconnect (sets socket to null)
            service.disconnect();
            
            // Should always return false when socket is null
            expect(service.isConnected()).toBe(false);
            
            // Reconnect for next iteration
            service.connect('http://localhost:3000');
            // Update mockSocket reference after reconnect
            mockSocket = mockIo.mock.results[mockIo.mock.results.length - 1].value;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('property: getSocket should return null when disconnected, non-null when connected', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (shouldBeConnected) => {
            if (shouldBeConnected) {
              // Ensure we have a socket
              if (!service.getSocket()) {
                service.connect('http://localhost:3000');
                mockSocket = mockIo.mock.results[mockIo.mock.results.length - 1].value;
              }
              mockSocket.connected = true;
              
              expect(service.getSocket()).not.toBeNull();
              expect(service.isConnected()).toBe(true);
            } else {
              service.disconnect();
              
              expect(service.getSocket()).toBeNull();
              expect(service.isConnected()).toBe(false);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});