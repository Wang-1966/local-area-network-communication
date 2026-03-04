import { Message } from '../types';

/**
 * Props for MultimediaMessage component
 */
interface MultimediaMessageProps {
  message: Message & {
    fileId: string;
    fileName: string;
    fileType: 'image' | 'video';
    fileSize: number;
    downloadUrl: string;
  };
  isOwnMessage: boolean;
  onDownload?: (fileId: string, fileName: string) => void;
}

/**
 * MultimediaMessage component displays multimedia messages in the chat interface
 * 
 * Features:
 * - Display multimedia messages with file information
 * - Show file name, type, and size
 * - Provide download link for the file
 * - Support both image and video file types
 * - Display sender information
 * - Responsive design with Tailwind CSS
 * - Handle different message directions (sent/received)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function MultimediaMessage({
  message,
  isOwnMessage,
  onDownload,
}: MultimediaMessageProps) {
  /**
   * Format file size to human-readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Get file type icon
   */
  const getFileTypeIcon = (): string => {
    if (message.fileType === 'image') {
      return '🖼️';
    } else if (message.fileType === 'video') {
      return '🎬';
    }
    return '📎';
  };

  /**
   * Get file type label
   */
  const getFileTypeLabel = (): string => {
    if (message.fileType === 'image') {
      return '图片';
    } else if (message.fileType === 'video') {
      return '视频';
    }
    return '文件';
  };

  /**
   * Handle download click
   */
  const handleDownload = () => {
    if (onDownload) {
      onDownload(message.fileId, message.fileName);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = message.downloadUrl;
      link.download = message.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  /**
   * Get message bubble styling based on direction
   */
  const getMessageBubbleClass = (): string => {
    return isOwnMessage
      ? 'bg-blue-100 border-blue-300'
      : 'bg-gray-100 border-gray-300';
  };

  /**
   * Get text color based on direction
   */
  const getTextColorClass = (): string => {
    return isOwnMessage ? 'text-blue-900' : 'text-gray-900';
  };

  return (
    <div className={`rounded-lg border-2 px-3 py-2 ${getMessageBubbleClass()}`}>
      {/* File Type and Name */}
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-lg">{getFileTypeIcon()}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${getTextColorClass()} truncate`}>
            {message.fileName}
          </p>
          <p className={`text-xs ${isOwnMessage ? 'text-blue-700' : 'text-gray-600'}`}>
            {getFileTypeLabel()} • {formatFileSize(message.fileSize)}
          </p>
        </div>
      </div>

      {/* Download Link */}
      <button
        onClick={handleDownload}
        className={`w-full px-3 py-1 rounded text-sm font-medium transition-colors ${
          isOwnMessage
            ? 'bg-blue-200 hover:bg-blue-300 text-blue-900'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
        }`}
      >
        ⬇️ 下载文件
      </button>
    </div>
  );
}

export default MultimediaMessage;
