import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageInput } from './MessageInput';
import { User } from '../types';

// Mock users for testing
const mockUsers: User[] = [
  {
    id: 'user1',
    ip: '192.168.1.10',
    socketId: 'socket1',
    connectedAt: Date.now() - 60000,
    lastActivity: Date.now(),
    isOnline: true,
  },
  {
    id: 'user2',
    ip: '192.168.1.11',
    socketId: 'socket2',
    connectedAt: Date.now() - 120000,
    lastActivity: Date.now(),
    isOnline: true,
  },
  {
    id: 'user3',
    ip: '10.0.0.5',
    socketId: 'socket3',
    connectedAt: Date.now() - 30000,
    lastActivity: Date.now(),
    isOnline: true,
  },
];

describe('MessageInput', () => {
  const mockOnSendMessage = vi.fn();
  
  const defaultProps = {
    onSendMessage: mockOnSendMessage,
    onlineUsers: mockUsers,
    isConnected: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all input fields and send button', () => {
      render(<MessageInput {...defaultProps} />);
      
      expect(screen.getByLabelText(/目标用户 IP 地址/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/消息内容/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /发送消息/i })).toBeInTheDocument();
    });

    it('should show character count', () => {
      render(<MessageInput {...defaultProps} />);
      
      expect(screen.getByText('0/1000')).toBeInTheDocument();
    });

    it('should show keyboard shortcuts help', () => {
      render(<MessageInput {...defaultProps} />);
      
      expect(screen.getByText(/按 Enter 发送消息，Shift\+Enter 换行/i)).toBeInTheDocument();
    });
  });

  describe('IP Address Input', () => {
    it('should accept valid IP addresses', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      await user.type(ipInput, '192.168.1.100');
      
      expect(ipInput).toHaveValue('192.168.1.100');
      expect(screen.queryByText(/请输入有效的IP地址格式/i)).not.toBeInTheDocument();
    });

    it('should show error for invalid IP addresses', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      await user.type(ipInput, '999.999.999.999');
      
      expect(screen.getByText(/请输入有效的IP地址格式/i)).toBeInTheDocument();
    });

    it('should show error for malformed IP addresses', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      await user.type(ipInput, 'not-an-ip');
      
      expect(screen.getByText(/请输入有效的IP地址格式/i)).toBeInTheDocument();
    });

    it('should auto-fill from selectedUserIP prop', () => {
      render(<MessageInput {...defaultProps} selectedUserIP="192.168.1.50" />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      expect(ipInput).toHaveValue('192.168.1.50');
    });

    it('should update when selectedUserIP prop changes', () => {
      const { rerender } = render(<MessageInput {...defaultProps} selectedUserIP="192.168.1.50" />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      expect(ipInput).toHaveValue('192.168.1.50');
      
      rerender(<MessageInput {...defaultProps} selectedUserIP="192.168.1.60" />);
      expect(ipInput).toHaveValue('192.168.1.60');
    });
  });

  describe('Auto-fill Suggestions', () => {
    it('should show suggestions when typing in IP input', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      await user.type(ipInput, '192.168');
      
      // Should show matching users
      expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.11')).toBeInTheDocument();
      expect(screen.queryByText('10.0.0.5')).not.toBeInTheDocument();
    });

    it('should filter suggestions based on input', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      await user.type(ipInput, '10.0');
      
      expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
      expect(screen.queryByText('192.168.1.10')).not.toBeInTheDocument();
    });

    it('should select suggestion when clicked', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      await user.type(ipInput, '192.168');
      
      const suggestion = screen.getByText('192.168.1.10');
      await user.click(suggestion);
      
      expect(ipInput).toHaveValue('192.168.1.10');
    });
  });

  describe('Message Content Input', () => {
    it('should accept message content', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const messageInput = screen.getByLabelText(/消息内容/i);
      await user.type(messageInput, 'Hello, world!');
      
      expect(messageInput).toHaveValue('Hello, world!');
      expect(screen.getByText('13/1000')).toBeInTheDocument();
    });

    it('should show error when message exceeds 1000 characters', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const messageInput = screen.getByLabelText(/消息内容/i);
      const longMessage = 'a'.repeat(1001);
      await user.type(messageInput, longMessage);
      
      expect(screen.getByText(/消息长度不能超过 1000 个字符/i)).toBeInTheDocument();
      expect(screen.getByText('1001/1000')).toBeInTheDocument();
    });

    it('should show error for empty message with whitespace', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const messageInput = screen.getByLabelText(/消息内容/i);
      await user.type(messageInput, '   ');
      
      expect(screen.getByText(/消息内容不能为空/i)).toBeInTheDocument();
    });

    it('should handle Enter key to send message', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      const messageInput = screen.getByLabelText(/消息内容/i);
      
      await user.type(ipInput, '192.168.1.100');
      await user.type(messageInput, 'Test message');
      await user.keyboard('{Enter}');
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('192.168.1.100', 'Test message');
    });

    it('should handle Shift+Enter for new line', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const messageInput = screen.getByLabelText(/消息内容/i);
      await user.type(messageInput, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(messageInput, 'Line 2');
      
      expect(messageInput).toHaveValue('Line 1\nLine 2');
    });
  });

  describe('Send Button', () => {
    it('should be disabled when form is invalid', () => {
      render(<MessageInput {...defaultProps} />);
      
      const sendButton = screen.getByRole('button', { name: /发送消息/i });
      expect(sendButton).toBeDisabled();
    });

    it('should be enabled when form is valid', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      const messageInput = screen.getByLabelText(/消息内容/i);
      
      await user.type(ipInput, '192.168.1.100');
      await user.type(messageInput, 'Valid message');
      
      const sendButton = screen.getByRole('button', { name: /发送消息/i });
      expect(sendButton).toBeEnabled();
    });

    it('should be disabled when not connected', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} isConnected={false} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      const messageInput = screen.getByLabelText(/消息内容/i);
      
      await user.type(ipInput, '192.168.1.100');
      await user.type(messageInput, 'Valid message');
      
      const sendButton = screen.getByRole('button', { name: /发送消息/i });
      expect(sendButton).toBeDisabled();
    });

    it('should call onSendMessage when clicked', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      const messageInput = screen.getByLabelText(/消息内容/i);
      const sendButton = screen.getByRole('button', { name: /发送消息/i });
      
      await user.type(ipInput, '192.168.1.100');
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('192.168.1.100', 'Test message');
    });

    it('should clear message content after successful send', async () => {
      const user = userEvent.setup();
      mockOnSendMessage.mockResolvedValue(undefined);
      
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      const messageInput = screen.getByLabelText(/消息内容/i);
      const sendButton = screen.getByRole('button', { name: /发送消息/i });
      
      await user.type(ipInput, '192.168.1.100');
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(messageInput).toHaveValue('');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state when isLoading prop is true', () => {
      render(<MessageInput {...defaultProps} isLoading={true} />);
      
      // Check for loading indicator in header
      const loadingElements = screen.getAllByText(/发送中.../i);
      expect(loadingElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /发送中.../i })).toBeDisabled();
    });

    it('should disable inputs when loading', () => {
      render(<MessageInput {...defaultProps} isLoading={true} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      const messageInput = screen.getByLabelText(/消息内容/i);
      
      expect(ipInput).toBeDisabled();
      expect(messageInput).toBeDisabled();
    });

    it('should show loading state during send operation', async () => {
      const user = userEvent.setup();
      let resolvePromise: () => void;
      const sendPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnSendMessage.mockReturnValue(sendPromise);
      
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      const messageInput = screen.getByLabelText(/消息内容/i);
      const sendButton = screen.getByRole('button', { name: /发送消息/i });
      
      await user.type(ipInput, '192.168.1.100');
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);
      
      // Check for loading indicator
      const loadingElements = screen.getAllByText(/发送中.../i);
      expect(loadingElements.length).toBeGreaterThan(0);
      
      resolvePromise!();
      await waitFor(() => {
        const remainingLoadingElements = screen.queryAllByText(/发送中.../i);
        expect(remainingLoadingElements.length).toBe(0);
      });
    });
  });

  describe('Connection Status', () => {
    it('should show warning when not connected', () => {
      render(<MessageInput {...defaultProps} isConnected={false} />);
      
      expect(screen.getByText(/网络连接已断开，无法发送消息/i)).toBeInTheDocument();
    });

    it('should not show warning when connected', () => {
      render(<MessageInput {...defaultProps} isConnected={true} />);
      
      expect(screen.queryByText(/网络连接已断开，无法发送消息/i)).not.toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('should validate IP format correctly', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      
      // Valid IPs
      await user.clear(ipInput);
      await user.type(ipInput, '0.0.0.0');
      expect(screen.queryByText(/请输入有效的IP地址格式/i)).not.toBeInTheDocument();
      
      await user.clear(ipInput);
      await user.type(ipInput, '255.255.255.255');
      expect(screen.queryByText(/请输入有效的IP地址格式/i)).not.toBeInTheDocument();
      
      // Invalid IPs
      await user.clear(ipInput);
      await user.type(ipInput, '256.1.1.1');
      expect(screen.getByText(/请输入有效的IP地址格式/i)).toBeInTheDocument();
      
      await user.clear(ipInput);
      await user.type(ipInput, '192.168.1');
      expect(screen.getByText(/请输入有效的IP地址格式/i)).toBeInTheDocument();
    });

    it('should validate message length correctly', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const messageInput = screen.getByLabelText(/消息内容/i);
      
      // Valid length
      await user.type(messageInput, 'a'.repeat(1000));
      expect(screen.queryByText(/消息长度不能超过/i)).not.toBeInTheDocument();
      
      // Invalid length
      await user.type(messageInput, 'a');
      expect(screen.getByText(/消息长度不能超过 1000 个字符/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form elements', () => {
      render(<MessageInput {...defaultProps} />);
      
      expect(screen.getByLabelText(/目标用户 IP 地址/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/消息内容/i)).toBeInTheDocument();
    });

    it('should associate error messages with inputs', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      await user.type(ipInput, 'invalid-ip');
      
      const errorMessage = screen.getByText(/请输入有效的IP地址格式/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('Multimedia Message Support', () => {
    const mockOnSendMultimediaMessage = vi.fn();
    const multimediaProps = {
      ...defaultProps,
      onSendMultimediaMessage: mockOnSendMultimediaMessage,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render FileSelector when onSendMultimediaMessage is provided', () => {
      render(<MessageInput {...multimediaProps} />);
      
      expect(screen.getByText(/或发送多媒体文件/i)).toBeInTheDocument();
      expect(screen.getByText(/选择文件/i)).toBeInTheDocument();
    });

    it('should not render FileSelector when onSendMultimediaMessage is not provided', () => {
      render(<MessageInput {...defaultProps} />);
      
      expect(screen.queryByText(/或发送多媒体文件/i)).not.toBeInTheDocument();
    });

    it('should show file upload error message', async () => {
      const user = userEvent.setup();
      mockOnSendMultimediaMessage.mockRejectedValue(new Error('Upload failed'));
      
      render(<MessageInput {...multimediaProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      await user.type(ipInput, '192.168.1.100');
      
      // Verify FileSelector is rendered
      expect(screen.getByText(/选择文件/i)).toBeInTheDocument();
    });

    it('should pass isFileUploading state to FileSelector', () => {
      render(<MessageInput {...multimediaProps} isFileUploading={true} />);
      
      // FileSelector should be rendered with uploading state
      expect(screen.getByText(/上传中.../i)).toBeInTheDocument();
    });

    it('should render FileSelector with proper disabled state when not connected', () => {
      render(<MessageInput {...multimediaProps} isConnected={false} />);
      
      // FileSelector should be rendered
      expect(screen.getByText(/选择文件/i)).toBeInTheDocument();
      // Connection warning should be shown
      expect(screen.getByText(/网络连接已断开，无法发送消息/i)).toBeInTheDocument();
    });

    it('should render FileSelector with proper disabled state when sending message', async () => {
      const user = userEvent.setup();
      let resolvePromise: () => void;
      const sendPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnSendMessage.mockReturnValue(sendPromise);
      
      render(<MessageInput {...multimediaProps} />);
      
      const ipInput = screen.getByLabelText(/目标用户 IP 地址/i);
      const messageInput = screen.getByLabelText(/消息内容/i);
      const sendButton = screen.getByRole('button', { name: /发送消息/i });
      
      await user.type(ipInput, '192.168.1.100');
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);
      
      // FileSelector should still be rendered
      expect(screen.getByText(/选择文件/i)).toBeInTheDocument();
      
      resolvePromise!();
    });
  });
});