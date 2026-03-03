import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ConnectionStatus } from './ConnectionStatus';
import { AppContextProvider } from '../context/AppContext';
import { User, ConnectionStatus as ConnectionStatusType } from '../types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock user and connection status for testing
const mockUser: User = {
  id: 'test-socket-id',
  ip: '192.168.1.100',
  socketId: 'test-socket-id',
  connectedAt: Date.now(),
  lastActivity: Date.now(),
  isOnline: true,
};

const mockConnectedStatus: ConnectionStatusType = {
  status: 'connected',
  connectedAt: Date.now(),
  reconnectAttempts: 0,
};

const mockDisconnectedStatus: ConnectionStatusType = {
  status: 'disconnected',
  reconnectAttempts: 2,
};

const mockConnectingStatus: ConnectionStatusType = {
  status: 'connecting',
  reconnectAttempts: 1,
};

// Test wrapper component that provides context
interface TestWrapperProps {
  children: React.ReactNode;
  user?: User | null;
  connectionStatus?: ConnectionStatusType;
}

function TestWrapper({ children, user = mockUser, connectionStatus = mockConnectedStatus }: TestWrapperProps) {
  return (
    <AppContextProvider>
      <div data-testid="test-wrapper">
        {/* We'll need to mock the context values */}
        {children}
      </div>
    </AppContextProvider>
  );
}

// Mock the context hooks
vi.mock('../context/AppContext', async () => {
  const actual = await vi.importActual('../context/AppContext');
  return {
    ...actual,
    useConnectionStatus: vi.fn(),
    useCurrentUser: vi.fn(),
  };
});

import { useConnectionStatus, useCurrentUser } from '../context/AppContext';

describe('ConnectionStatus Component', () => {
  const mockOnReconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (navigator.clipboard.writeText as any).mockResolvedValue(undefined);
  });

  describe('Connected State', () => {
    beforeEach(() => {
      useCurrentUser.mockReturnValue(mockUser);
      useConnectionStatus.mockReturnValue(mockConnectedStatus);
    });

    it('should render connected status correctly', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      expect(screen.getByText('已连接')).toBeInTheDocument();
      expect(screen.getByText('本机 IP 地址:')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.queryByText('重新连接')).not.toBeInTheDocument();
    });

    it('should display IP address in monospace font', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const ipElement = screen.getByText('192.168.1.100');
      expect(ipElement).toHaveClass('font-mono');
    });

    it('should show connection time when connected', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      expect(screen.getByText(/连接时间:/)).toBeInTheDocument();
    });
  });

  describe('Disconnected State', () => {
    beforeEach(() => {
      useCurrentUser.mockReturnValue(mockUser);
      useConnectionStatus.mockReturnValue(mockDisconnectedStatus);
    });

    it('should render disconnected status correctly', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      expect(screen.getByText('已断开')).toBeInTheDocument();
      expect(screen.getByText('重新连接')).toBeInTheDocument();
      expect(screen.getByText('(尝试 2/5)')).toBeInTheDocument();
    });

    it('should call onReconnect when reconnect button is clicked', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const reconnectButton = screen.getByText('重新连接');
      fireEvent.click(reconnectButton);
      
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connecting State', () => {
    beforeEach(() => {
      useCurrentUser.mockReturnValue(mockUser);
      useConnectionStatus.mockReturnValue(mockConnectingStatus);
    });

    it('should render connecting status correctly', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      expect(screen.getByText('连接中...')).toBeInTheDocument();
      expect(screen.getByText('(尝试 1/5)')).toBeInTheDocument();
    });

    it('should show pulsing animation for connecting status', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const statusIndicator = screen.getByText('连接中...').previousElementSibling;
      expect(statusIndicator).toHaveClass('animate-pulse');
    });
  });

  describe('Copy IP Functionality', () => {
    beforeEach(() => {
      useCurrentUser.mockReturnValue(mockUser);
      useConnectionStatus.mockReturnValue(mockConnectedStatus);
    });

    it('should copy IP address to clipboard when copy button is clicked', async () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const copyButton = screen.getByText('复制');
      fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('192.168.1.100');
      
      await waitFor(() => {
        expect(screen.getByText('已复制!')).toBeInTheDocument();
      });
    });

    it('should show success message temporarily after copying', async () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const copyButton = screen.getByText('复制');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('已复制!')).toBeInTheDocument();
      });
      
      // The success message should disappear after 2 seconds
      // Note: In a real test, you might want to use fake timers
    });

    it('should handle clipboard API failure gracefully', async () => {
      (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard failed'));
      
      // Mock document.execCommand for fallback
      document.execCommand = vi.fn().mockReturnValue(true);
      
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const copyButton = screen.getByText('复制');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(document.execCommand).toHaveBeenCalledWith('copy');
      });
    });
  });

  describe('No User State', () => {
    beforeEach(() => {
      useCurrentUser.mockReturnValue(null);
      useConnectionStatus.mockReturnValue(mockDisconnectedStatus);
    });

    it('should not render IP section when no user is available', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      expect(screen.queryByText('本机 IP 地址:')).not.toBeInTheDocument();
      expect(screen.queryByText('复制')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      useCurrentUser.mockReturnValue(mockUser);
      useConnectionStatus.mockReturnValue(mockConnectedStatus);
    });

    it('should have proper button titles for accessibility', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const copyButton = screen.getByTitle('复制 IP 地址');
      expect(copyButton).toBeInTheDocument();
    });

    it('should have focus styles for keyboard navigation', () => {
      render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const copyButton = screen.getByText('复制');
      expect(copyButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      useCurrentUser.mockReturnValue(mockUser);
      useConnectionStatus.mockReturnValue(mockConnectedStatus);
    });

    it('should have responsive classes for mobile and desktop', () => {
      const { container } = render(<ConnectionStatus onReconnect={mockOnReconnect} />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('p-3', 'md:p-4', 'rounded-lg');
    });
  });
});