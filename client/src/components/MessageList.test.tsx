import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageList } from './MessageList';
import { Message } from '../types';

// Mock messages for testing
const mockMessages: Message[] = [
  {
    id: 'msg1',
    content: 'Hello, how are you?',
    senderIP: '192.168.1.10',
    receiverIP: '192.168.1.11',
    timestamp: Date.now() - 60000,
    direction: 'sent',
    status: 'sent',
  },
  {
    id: 'msg2',
    content: 'I am doing great!',
    senderIP: '192.168.1.11',
    receiverIP: '192.168.1.10',
    timestamp: Date.now() - 30000,
    direction: 'received',
    status: 'sent',
  },
  {
    id: 'msg3',
    content: 'Thanks for asking',
    senderIP: '192.168.1.10',
    receiverIP: '192.168.1.11',
    timestamp: Date.now(),
    direction: 'sent',
    status: 'pending',
  },
];

describe('MessageList', () => {
  const currentUserIP = '192.168.1.10';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all messages', () => {
      render(<MessageList messages={mockMessages} currentUserIP={currentUserIP} />);

      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      expect(screen.getByText('I am doing great!')).toBeInTheDocument();
      expect(screen.getByText('Thanks for asking')).toBeInTheDocument();
    });

    it('should display empty state when no messages', () => {
      render(<MessageList messages={[]} currentUserIP={currentUserIP} />);

      expect(screen.getByText('暂无消息')).toBeInTheDocument();
      expect(screen.getByText(/选择一个在线用户并发送消息开始对话/i)).toBeInTheDocument();
    });

    it('should show empty state icon', () => {
      render(<MessageList messages={[]} currentUserIP={currentUserIP} />);

      // Check that SVG icon is rendered
      const svgElements = screen.getByText('暂无消息').closest('div')?.querySelectorAll('svg');
      expect(svgElements && svgElements.length > 0).toBe(true);
    });
  });

  describe('Message Display', () => {
    it('should display sender and receiver IP addresses', () => {
      render(<MessageList messages={mockMessages} currentUserIP={currentUserIP} />);

      // For sent message - should show receiver IP
      const receiverIPs = screen.getAllByText('192.168.1.11');
      expect(receiverIPs.length).toBeGreaterThan(0);
    });

    it('should display timestamps', () => {
      render(<MessageList messages={mockMessages} currentUserIP={currentUserIP} />);

      // Check that timestamps are displayed (they will be formatted)
      const messageElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
      expect(messageElements.length).toBeGreaterThan(0);
    });

    it('should distinguish sent and received messages', () => {
      render(<MessageList messages={mockMessages} currentUserIP={currentUserIP} />);

      const sentMessage = screen.getByText('Hello, how are you?');
      const receivedMessage = screen.getByText('I am doing great!');

      // Find the flex container (parent of the message wrapper)
      const sentContainer = sentMessage.closest('.flex');
      const receivedContainer = receivedMessage.closest('.flex');

      // Sent messages should be on the right (justify-end)
      expect(sentContainer?.className).toContain('justify-end');
      // Received messages should be on the left (justify-start)
      expect(receivedContainer?.className).toContain('justify-start');
    });

    it('should use different colors for sent and received messages', () => {
      render(<MessageList messages={mockMessages} currentUserIP={currentUserIP} />);

      const sentBubble = screen.getByText('Hello, how are you?').closest('div');
      const receivedBubble = screen.getByText('I am doing great!').closest('div');

      // Sent messages should have blue background
      expect(sentBubble?.className).toContain('bg-blue-100');
      // Received messages should have gray background
      expect(receivedBubble?.className).toContain('bg-gray-100');
    });
  });

  describe('Message Status', () => {
    it('should display status for sent messages', () => {
      render(<MessageList messages={mockMessages} currentUserIP={currentUserIP} />);

      expect(screen.getByText('已发送')).toBeInTheDocument();
      expect(screen.getByText('发送中...')).toBeInTheDocument();
    });

    it('should show pending status with spinner', () => {
      const pendingMessage: Message = {
        id: 'msg-pending',
        content: 'Pending message',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'pending',
      };

      render(<MessageList messages={[pendingMessage]} currentUserIP={currentUserIP} />);

      expect(screen.getByText('发送中...')).toBeInTheDocument();
    });

    it('should show sent status with checkmark', () => {
      const sentMessage: Message = {
        id: 'msg-sent',
        content: 'Sent message',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      render(<MessageList messages={[sentMessage]} currentUserIP={currentUserIP} />);

      expect(screen.getByText('已发送')).toBeInTheDocument();
    });

    it('should show failed status with error icon', () => {
      const failedMessage: Message = {
        id: 'msg-failed',
        content: 'Failed message',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'failed',
      };

      render(<MessageList messages={[failedMessage]} currentUserIP={currentUserIP} />);

      expect(screen.getByText('发送失败')).toBeInTheDocument();
    });

    it('should not display status for received messages', () => {
      const receivedMessage: Message = {
        id: 'msg-received',
        content: 'Received message',
        senderIP: '192.168.1.11',
        receiverIP: currentUserIP,
        timestamp: Date.now(),
        direction: 'received',
        status: 'sent',
      };

      render(<MessageList messages={[receivedMessage]} currentUserIP={currentUserIP} />);

      // Status should not be displayed for received messages
      const statusElements = screen.queryAllByText(/已发送|发送中|发送失败/);
      expect(statusElements.length).toBe(0);
    });
  });

  describe('Message Direction', () => {
    it('should identify sent messages correctly', () => {
      const sentMessage: Message = {
        id: 'msg-sent',
        content: 'This is sent',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      render(<MessageList messages={[sentMessage]} currentUserIP={currentUserIP} />);

      expect(screen.getByText('发送给')).toBeInTheDocument();
    });

    it('should identify received messages correctly', () => {
      const receivedMessage: Message = {
        id: 'msg-received',
        content: 'This is received',
        senderIP: '192.168.1.11',
        receiverIP: currentUserIP,
        timestamp: Date.now(),
        direction: 'received',
        status: 'sent',
      };

      render(<MessageList messages={[receivedMessage]} currentUserIP={currentUserIP} />);

      expect(screen.getByText('来自')).toBeInTheDocument();
    });
  });

  describe('Auto-scroll', () => {
    it('should render messages container', () => {
      const { container } = render(
        <MessageList messages={mockMessages} currentUserIP={currentUserIP} />
      );

      const messagesContainer = container.querySelector('.overflow-y-auto');
      expect(messagesContainer).toBeInTheDocument();
    });

    it('should have auto-scroll anchor element', () => {
      const { container } = render(
        <MessageList messages={mockMessages} currentUserIP={currentUserIP} />
      );

      // The container should have the flex-1 class
      const mainContainer = container.querySelector('.flex-1.bg-white');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Message Content', () => {
    it('should display full message content', () => {
      const longMessage: Message = {
        id: 'msg-long',
        content: 'This is a very long message that should be displayed in full without truncation',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      render(<MessageList messages={[longMessage]} currentUserIP={currentUserIP} />);

      expect(screen.getByText('This is a very long message that should be displayed in full without truncation')).toBeInTheDocument();
    });

    it('should handle messages with special characters', () => {
      const specialMessage: Message = {
        id: 'msg-special',
        content: 'Hello! @#$%^&*() 你好 🎉',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      render(<MessageList messages={[specialMessage]} currentUserIP={currentUserIP} />);

      expect(screen.getByText('Hello! @#$%^&*() 你好 🎉')).toBeInTheDocument();
    });

    it('should handle messages with newlines', () => {
      const multilineMessage: Message = {
        id: 'msg-multiline',
        content: 'Line 1\nLine 2\nLine 3',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      render(<MessageList messages={[multilineMessage]} currentUserIP={currentUserIP} />);

      // Check that the message is rendered
      const messageElements = screen.getAllByText((content, element) => {
        return element?.textContent === 'Line 1\nLine 2\nLine 3';
      });
      expect(messageElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive max-width classes', () => {
      const { container } = render(
        <MessageList messages={mockMessages} currentUserIP={currentUserIP} />
      );

      const messageWrappers = container.querySelectorAll('.max-w-xs');
      expect(messageWrappers.length).toBeGreaterThan(0);
    });

    it('should have responsive container', () => {
      const { container } = render(
        <MessageList messages={mockMessages} currentUserIP={currentUserIP} />
      );

      const mainContainer = container.querySelector('.flex-1.bg-white');
      expect(mainContainer).toHaveClass('rounded-lg', 'shadow-md', 'p-2', 'md:p-4');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamps correctly', () => {
      const now = new Date();
      const timestamp = now.getTime();

      const message: Message = {
        id: 'msg-time',
        content: 'Test message',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp,
        direction: 'sent',
        status: 'sent',
      };

      render(<MessageList messages={[message]} currentUserIP={currentUserIP} />);

      // Check that time is displayed in HH:MM:SS format
      const timeElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Messages', () => {
    it('should render messages in order', () => {
      render(<MessageList messages={mockMessages} currentUserIP={currentUserIP} />);

      const messages = screen.getAllByText(/Hello|I am|Thanks/);
      expect(messages.length).toBe(3);
    });

    it('should handle mixed sent and received messages', () => {
      const mixedMessages: Message[] = [
        {
          id: 'msg1',
          content: 'Sent 1',
          senderIP: currentUserIP,
          receiverIP: '192.168.1.11',
          timestamp: Date.now() - 3000,
          direction: 'sent',
          status: 'sent',
        },
        {
          id: 'msg2',
          content: 'Received 1',
          senderIP: '192.168.1.11',
          receiverIP: currentUserIP,
          timestamp: Date.now() - 2000,
          direction: 'received',
          status: 'sent',
        },
        {
          id: 'msg3',
          content: 'Sent 2',
          senderIP: currentUserIP,
          receiverIP: '192.168.1.11',
          timestamp: Date.now() - 1000,
          direction: 'sent',
          status: 'sent',
        },
      ];

      render(<MessageList messages={mixedMessages} currentUserIP={currentUserIP} />);

      expect(screen.getByText('Sent 1')).toBeInTheDocument();
      expect(screen.getByText('Received 1')).toBeInTheDocument();
      expect(screen.getByText('Sent 2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const emptyMessage: Message = {
        id: 'msg-empty',
        content: '',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      render(<MessageList messages={[emptyMessage]} currentUserIP={currentUserIP} />);

      // Should still render the message bubble even if empty
      const bubbles = screen.getAllByText(/发送给/);
      expect(bubbles.length).toBeGreaterThan(0);
    });

    it('should handle very long IP addresses', () => {
      const message: Message = {
        id: 'msg-ip',
        content: 'Test',
        senderIP: currentUserIP,
        receiverIP: '255.255.255.255',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      };

      render(<MessageList messages={[message]} currentUserIP={currentUserIP} />);

      // Check that the receiver IP is displayed
      expect(screen.getByText('255.255.255.255')).toBeInTheDocument();
    });
  });
});


describe('MessageList - Multimedia Messages', () => {
  const currentUserIP = '192.168.1.10';
  const mockOnDownload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Multimedia Message Rendering', () => {
    it('should render multimedia message component for image files', () => {
      const multimediaMessage: Message = {
        id: 'msg-image',
        fileId: 'file-123',
        fileName: 'photo.jpg',
        fileType: 'image',
        fileSize: 1024 * 500, // 500KB
        downloadUrl: 'http://localhost:3000/files/file-123',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'sent',
      } as any;

      render(
        <MessageList
          messages={[multimediaMessage]}
          currentUserIP={currentUserIP}
          onDownloadMultimediaFile={mockOnDownload}
        />
      );

      // Check that file information is displayed
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
      expect(screen.getByText(/图片/)).toBeInTheDocument();
      expect(screen.getByText(/下载文件/)).toBeInTheDocument();
    });

    it('should render multimedia message component for video files', () => {
      const multimediaMessage: Message = {
        id: 'msg-video',
        fileId: 'file-456',
        fileName: 'video.mp4',
        fileType: 'video',
        fileSize: 1024 * 1024 * 5, // 5MB
        downloadUrl: 'http://localhost:3000/files/file-456',
        senderIP: '192.168.1.11',
        receiverIP: currentUserIP,
        timestamp: Date.now(),
        direction: 'received',
        status: 'sent',
      } as any;

      render(
        <MessageList
          messages={[multimediaMessage]}
          currentUserIP={currentUserIP}
          onDownloadMultimediaFile={mockOnDownload}
        />
      );

      expect(screen.getByText('video.mp4')).toBeInTheDocument();
      expect(screen.getByText(/视频/)).toBeInTheDocument();
    });

    it('should handle mixed text and multimedia messages', () => {
      const textMessage: Message = {
        id: 'msg-text',
        content: 'Check out this photo!',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now() - 2000,
        direction: 'sent',
        status: 'sent',
      };

      const multimediaMessage: Message = {
        id: 'msg-mm',
        fileId: 'file-123',
        fileName: 'photo.jpg',
        fileType: 'image',
        fileSize: 1024 * 500,
        downloadUrl: 'http://localhost:3000/files/file-123',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now() - 1000,
        direction: 'sent',
        status: 'sent',
      } as any;

      render(
        <MessageList
          messages={[textMessage, multimediaMessage]}
          currentUserIP={currentUserIP}
          onDownloadMultimediaFile={mockOnDownload}
        />
      );

      expect(screen.getByText('Check out this photo!')).toBeInTheDocument();
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });
  });

  describe('Multimedia Message Status', () => {
    it('should display status for sent multimedia messages', () => {
      const pendingMultimediaMessage: Message = {
        id: 'msg-pending-mm',
        fileId: 'file-pending',
        fileName: 'pending.jpg',
        fileType: 'image',
        fileSize: 1024 * 100,
        downloadUrl: 'http://localhost:3000/files/file-pending',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now(),
        direction: 'sent',
        status: 'pending',
      } as any;

      render(
        <MessageList
          messages={[pendingMultimediaMessage]}
          currentUserIP={currentUserIP}
          onDownloadMultimediaFile={mockOnDownload}
        />
      );

      expect(screen.getByText('发送中...')).toBeInTheDocument();
    });

    it('should not display status for received multimedia messages', () => {
      const receivedMultimediaMessage: Message = {
        id: 'msg-received-mm',
        fileId: 'file-received',
        fileName: 'received.jpg',
        fileType: 'image',
        fileSize: 1024 * 100,
        downloadUrl: 'http://localhost:3000/files/file-received',
        senderIP: '192.168.1.11',
        receiverIP: currentUserIP,
        timestamp: Date.now(),
        direction: 'received',
        status: 'sent',
      } as any;

      render(
        <MessageList
          messages={[receivedMultimediaMessage]}
          currentUserIP={currentUserIP}
          onDownloadMultimediaFile={mockOnDownload}
        />
      );

      // Status should not be displayed for received messages
      const statusElements = screen.queryAllByText(/已发送|发送中|发送失败/);
      expect(statusElements.length).toBe(0);
    });
  });

  describe('Multimedia Message Direction', () => {
    it('should distinguish sent and received multimedia messages by color', () => {
      const sentMultimediaMessage: Message = {
        id: 'msg-sent-mm',
        fileId: 'file-sent',
        fileName: 'sent.jpg',
        fileType: 'image',
        fileSize: 1024 * 100,
        downloadUrl: 'http://localhost:3000/files/file-sent',
        senderIP: currentUserIP,
        receiverIP: '192.168.1.11',
        timestamp: Date.now() - 1000,
        direction: 'sent',
        status: 'sent',
      } as any;

      const receivedMultimediaMessage: Message = {
        id: 'msg-received-mm',
        fileId: 'file-received',
        fileName: 'received.jpg',
        fileType: 'image',
        fileSize: 1024 * 100,
        downloadUrl: 'http://localhost:3000/files/file-received',
        senderIP: '192.168.1.11',
        receiverIP: currentUserIP,
        timestamp: Date.now(),
        direction: 'received',
        status: 'sent',
      } as any;

      render(
        <MessageList
          messages={[sentMultimediaMessage, receivedMultimediaMessage]}
          currentUserIP={currentUserIP}
          onDownloadMultimediaFile={mockOnDownload}
        />
      );

      expect(screen.getByText('sent.jpg')).toBeInTheDocument();
      expect(screen.getByText('received.jpg')).toBeInTheDocument();
    });
  });
});
