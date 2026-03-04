import { useEffect, useRef } from 'react';
import { Message } from '../types';
import { MultimediaMessage } from './MultimediaMessage';

/**
 * Props for MessageList component
 */
interface MessageListProps {
  messages: Message[];
  currentUserIP: string;
  onDownloadMultimediaFile?: (fileId: string, fileName: string) => void;
}

/**
 * MessageList component displays message history
 * 
 * Features:
 * - Display sent and received messages with different colors
 * - Show sender IP, receiver IP and timestamp
 * - Display message status (pending/sent/failed)
 * - Auto-scroll to bottom when receiving new messages
 * - Display empty state hint
 * - Support for multimedia messages (images and videos)
 * - Download links for multimedia files
 * - Responsive design with Tailwind CSS
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5, 8.2, 8.5
 */
export function MessageList({ messages, currentUserIP, onDownloadMultimediaFile }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Scroll to bottom of message list
   */
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        // Fallback for testing environments where scrollIntoView might not be available
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }
    }
  };

  /**
   * Format timestamp to readable format
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  /**
   * Get status display text
   */
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return '发送中...';
      case 'sent':
        return '已发送';
      case 'failed':
        return '发送失败';
      default:
        return '';
    }
  };

  /**
   * Get status display color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'sent':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  /**
   * Check if message is sent by current user
   */
  const isSentByCurrentUser = (message: Message): boolean => {
    return message.senderIP === currentUserIP;
  };

  /**
   * Check if message is a multimedia message
   */
  const isMultimediaMessage = (message: Message): boolean => {
    return (
      'fileId' in message &&
      'fileName' in message &&
      'fileType' in message &&
      'fileSize' in message &&
      'downloadUrl' in message
    );
  };

  /**
   * Get message bubble styling based on direction
   */
  const getMessageBubbleClass = (message: Message): string => {
    const isSent = isSentByCurrentUser(message);
    return isSent
      ? 'bg-blue-100 border-blue-300 text-blue-900'
      : 'bg-gray-100 border-gray-300 text-gray-900';
  };

  /**
   * Get message container alignment
   */
  const getMessageContainerClass = (message: Message): string => {
    const isSent = isSentByCurrentUser(message);
    return isSent ? 'justify-end' : 'justify-start';
  };

  /**
   * Render empty state
   */
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg shadow-md p-4">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无消息</h3>
          <p className="mt-1 text-sm text-gray-500">
            选择一个在线用户并发送消息开始对话
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 bg-white rounded-lg shadow-md p-2 md:p-4 overflow-y-auto space-y-2 md:space-y-3"
    >
      {/* Messages */}
      {messages.map((message) => {
        const isSent = isSentByCurrentUser(message);
        const isMultimedia = isMultimediaMessage(message);

        return (
          <div
            key={message.id}
            className={`flex ${getMessageContainerClass(message)}`}
          >
            <div className="max-w-xs md:max-w-sm lg:max-w-md">
              {/* Message Header (IP addresses and timestamp) */}
              <div className="flex items-center space-x-1 md:space-x-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold text-gray-600">
                  {isSent ? '发送给' : '来自'}
                </span>
                <span className="text-xs text-gray-700 font-mono">
                  {isSent ? message.receiverIP : message.senderIP}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>

              {/* Message Bubble - Multimedia or Text */}
              {isMultimedia ? (
                <MultimediaMessage
                  message={message as any}
                  isOwnMessage={isSent}
                  onDownload={onDownloadMultimediaFile}
                />
              ) : (
                <div
                  className={`rounded-lg border-2 px-3 py-2 ${getMessageBubbleClass(
                    message
                  )}`}
                >
                  <p className="text-sm md:text-base break-words">{message.content}</p>
                </div>
              )}

              {/* Message Status (only for sent messages) */}
              {isSent && (
                <div className={`flex items-center space-x-1 mt-1 text-xs ${getStatusColor(message.status)}`}>
                  {message.status === 'pending' && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                  )}
                  {message.status === 'sent' && (
                    <svg
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {message.status === 'failed' && (
                    <svg
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span>{getStatusText(message.status)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
