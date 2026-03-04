import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultimediaMessage } from './MultimediaMessage';

describe('MultimediaMessage Component', () => {
  const mockMessage = {
    id: 'msg-1',
    fileId: 'file-123',
    fileName: 'test-image.jpg',
    fileType: 'image' as const,
    fileSize: 1024 * 500, // 500 KB
    downloadUrl: '/files/file-123',
    content: '',
    senderIP: '192.168.1.1',
    receiverIP: '192.168.1.2',
    timestamp: Date.now(),
    direction: 'received' as const,
    status: 'sent' as const,
  };

  describe('Message Rendering', () => {
    it('should render multimedia message with different file types', () => {
      const { rerender } = render(
        <MultimediaMessage message={mockMessage} isOwnMessage={false} />
      );

      // Check image file type
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.getByText(/图片/)).toBeInTheDocument();

      // Test with video file type
      const videoMessage = {
        ...mockMessage,
        fileName: 'test-video.mp4',
        fileType: 'video' as const,
      };

      rerender(
        <MultimediaMessage message={videoMessage} isOwnMessage={false} />
      );

      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      expect(screen.getByText(/视频/)).toBeInTheDocument();
    });

    it('should display file size in human-readable format', () => {
      render(
        <MultimediaMessage message={mockMessage} isOwnMessage={false} />
      );

      // 500 KB should be displayed
      expect(screen.getByText(/500 KB/)).toBeInTheDocument();
    });

    it('should display file information correctly', () => {
      render(
        <MultimediaMessage message={mockMessage} isOwnMessage={false} />
      );

      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.getByText(/图片/)).toBeInTheDocument();
      expect(screen.getByText(/500 KB/)).toBeInTheDocument();
    });

    it('should apply correct styling for sent messages', () => {
      const { container } = render(
        <MultimediaMessage message={mockMessage} isOwnMessage={true} />
      );

      const messageBubble = container.querySelector('.bg-blue-100');
      expect(messageBubble).toBeInTheDocument();
    });

    it('should apply correct styling for received messages', () => {
      const { container } = render(
        <MultimediaMessage message={mockMessage} isOwnMessage={false} />
      );

      const messageBubble = container.querySelector('.bg-gray-100');
      expect(messageBubble).toBeInTheDocument();
    });
  });

  describe('Download Link Functionality', () => {
    it('should call onDownload callback when download button is clicked', () => {
      const mockOnDownload = vi.fn();

      render(
        <MultimediaMessage
          message={mockMessage}
          isOwnMessage={false}
          onDownload={mockOnDownload}
        />
      );

      const downloadButton = screen.getByText('⬇️ 下载文件');
      fireEvent.click(downloadButton);

      expect(mockOnDownload).toHaveBeenCalledWith('file-123', 'test-image.jpg');
    });

    it('should have download button visible and clickable', () => {
      render(
        <MultimediaMessage message={mockMessage} isOwnMessage={false} />
      );

      const downloadButton = screen.getByText('⬇️ 下载文件');
      expect(downloadButton).toBeInTheDocument();
      expect(downloadButton).toBeEnabled();
    });
  });

  describe('File Information Display', () => {
    it('should display correct file size for different sizes', () => {
      const testCases = [
        { size: 512, expected: '512 B' },
        { size: 1024, expected: '1 KB' },
        { size: 1024 * 1024, expected: '1 MB' },
        { size: 1024 * 1024 * 5, expected: '5 MB' },
      ];

      testCases.forEach(({ size, expected }) => {
        const { unmount } = render(
          <MultimediaMessage
            message={{ ...mockMessage, fileSize: size }}
            isOwnMessage={false}
          />
        );

        expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
        unmount();
      });
    });

    it('should display file type indicator for images', () => {
      render(
        <MultimediaMessage message={mockMessage} isOwnMessage={false} />
      );

      expect(screen.getByText('🖼️')).toBeInTheDocument();
      expect(screen.getByText(/图片/)).toBeInTheDocument();
    });

    it('should display file type indicator for videos', () => {
      const videoMessage = {
        ...mockMessage,
        fileType: 'video' as const,
      };

      render(
        <MultimediaMessage message={videoMessage} isOwnMessage={false} />
      );

      expect(screen.getByText('🎬')).toBeInTheDocument();
      expect(screen.getByText(/视频/)).toBeInTheDocument();
    });

    it('should truncate long file names', () => {
      const longFileName =
        'this-is-a-very-long-file-name-that-should-be-truncated-to-avoid-breaking-the-layout.jpg';
      const messageWithLongName = {
        ...mockMessage,
        fileName: longFileName,
      };

      const { container } = render(
        <MultimediaMessage
          message={messageWithLongName}
          isOwnMessage={false}
        />
      );

      const fileNameElement = screen.getByText(longFileName);
      expect(fileNameElement).toHaveClass('truncate');
    });
  });

  describe('Message Direction Styling', () => {
    it('should apply blue styling for own messages', () => {
      const { container } = render(
        <MultimediaMessage message={mockMessage} isOwnMessage={true} />
      );

      const messageBubble = container.querySelector('.bg-blue-100');
      expect(messageBubble).toBeInTheDocument();
      expect(messageBubble).toHaveClass('border-blue-300');
    });

    it('should apply gray styling for received messages', () => {
      const { container } = render(
        <MultimediaMessage message={mockMessage} isOwnMessage={false} />
      );

      const messageBubble = container.querySelector('.bg-gray-100');
      expect(messageBubble).toBeInTheDocument();
      expect(messageBubble).toHaveClass('border-gray-300');
    });

    it('should apply correct download button styling for own messages', () => {
      render(
        <MultimediaMessage message={mockMessage} isOwnMessage={true} />
      );

      const downloadButton = screen.getByText('⬇️ 下载文件');
      expect(downloadButton).toHaveClass('bg-blue-200');
      expect(downloadButton).toHaveClass('text-blue-900');
    });

    it('should apply correct download button styling for received messages', () => {
      render(
        <MultimediaMessage message={mockMessage} isOwnMessage={false} />
      );

      const downloadButton = screen.getByText('⬇️ 下载文件');
      expect(downloadButton).toHaveClass('bg-gray-200');
      expect(downloadButton).toHaveClass('text-gray-900');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small file sizes', () => {
      const smallFileMessage = {
        ...mockMessage,
        fileSize: 1,
      };

      render(
        <MultimediaMessage message={smallFileMessage} isOwnMessage={false} />
      );

      expect(screen.getByText(/1 B/)).toBeInTheDocument();
    });

    it('should handle zero file size', () => {
      const zeroFileMessage = {
        ...mockMessage,
        fileSize: 0,
      };

      render(
        <MultimediaMessage message={zeroFileMessage} isOwnMessage={false} />
      );

      expect(screen.getByText(/0 B/)).toBeInTheDocument();
    });

    it('should handle very large file sizes', () => {
      const largeFileMessage = {
        ...mockMessage,
        fileSize: 1024 * 1024 * 1024 * 2, // 2 GB
      };

      render(
        <MultimediaMessage message={largeFileMessage} isOwnMessage={false} />
      );

      expect(screen.getByText(/2 GB/)).toBeInTheDocument();
    });

    it('should handle special characters in file names', () => {
      const specialCharMessage = {
        ...mockMessage,
        fileName: 'test-file_2024-01-15 (1).jpg',
      };

      render(
        <MultimediaMessage message={specialCharMessage} isOwnMessage={false} />
      );

      expect(screen.getByText('test-file_2024-01-15 (1).jpg')).toBeInTheDocument();
    });
  });
});
