import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

/**
 * Props for MessageInput component
 */
interface MessageInputProps {
  onSendMessage: (targetUserIP: string, content: string) => Promise<void>;
  onlineUsers: User[];
  isConnected: boolean;
  selectedUserIP?: string;
  isLoading?: boolean;
}

/**
 * MessageInput component provides input fields for target IP and message content
 * 
 * Features:
 * - Target IP input with manual input and auto-fill support
 * - Message content textarea with character count
 * - Real-time input validation (IP format, message length)
 * - Send button with conditional enable/disable
 * - Enter key to send (Shift+Enter for new line)
 * - Loading state display
 * - Responsive design with Tailwind CSS
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.5, 2.6, 2.7, 6.1, 6.2, 6.3, 6.4, 6.5, 8.3, 8.4
 */
export function MessageInput({ 
  onSendMessage, 
  onlineUsers, 
  isConnected, 
  selectedUserIP = '',
  isLoading = false 
}: MessageInputProps) {
  const [targetIP, setTargetIP] = useState(selectedUserIP);
  const [messageContent, setMessageContent] = useState('');
  const [ipError, setIpError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ipInputRef = useRef<HTMLInputElement>(null);
  
  const MAX_MESSAGE_LENGTH = 1000;

  // Update targetIP when selectedUserIP prop changes
  useEffect(() => {
    if (selectedUserIP && selectedUserIP !== targetIP) {
      setTargetIP(selectedUserIP);
      setIpError('');
    }
  }, [selectedUserIP, targetIP]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageContent]);

  /**
   * Validate IP address format (IPv4)
   */
  const validateIPAddress = (ip: string): boolean => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip.trim());
  };

  /**
   * Handle target IP input change
   */
  const handleTargetIPChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTargetIP(value);
    
    // Clear previous error
    setIpError('');
    
    // Validate IP format if not empty
    if (value.trim() && !validateIPAddress(value)) {
      setIpError('请输入有效的IP地址格式 (例如: 192.168.1.1)');
    }
    
    // Show suggestions if typing
    setShowSuggestions(value.length > 0);
  };

  /**
   * Handle message content change
   */
  const handleMessageContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setMessageContent(value);
    
    // Clear previous error
    setMessageError('');
    
    // Validate message length
    if (value.length > MAX_MESSAGE_LENGTH) {
      setMessageError(`消息长度不能超过 ${MAX_MESSAGE_LENGTH} 个字符`);
    } else if (value.trim().length === 0 && value.length > 0) {
      setMessageError('消息内容不能为空');
    }
  };

  /**
   * Handle key press in textarea
   */
  const handleTextareaKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (userIP: string) => {
    setTargetIP(userIP);
    setIpError('');
    setShowSuggestions(false);
    // Focus on message input after selecting user
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  /**
   * Get filtered suggestions based on input
   */
  const getFilteredSuggestions = (): User[] => {
    if (!targetIP.trim()) return onlineUsers;
    
    return onlineUsers.filter(user => 
      user.ip.toLowerCase().includes(targetIP.toLowerCase().trim())
    );
  };

  /**
   * Check if form is valid for submission
   */
  const isFormValid = (): boolean => {
    const trimmedIP = targetIP.trim();
    const trimmedContent = messageContent.trim();
    
    return (
      isConnected &&
      !isSending &&
      !isLoading &&
      trimmedIP.length > 0 &&
      validateIPAddress(trimmedIP) &&
      trimmedContent.length > 0 &&
      trimmedContent.length <= MAX_MESSAGE_LENGTH &&
      !ipError &&
      !messageError
    );
  };

  /**
   * Handle send message
   */
  const handleSendMessage = async () => {
    if (!isFormValid()) return;
    
    const trimmedIP = targetIP.trim();
    const trimmedContent = messageContent.trim();
    
    setIsSending(true);
    
    try {
      await onSendMessage(trimmedIP, trimmedContent);
      // Clear message content after successful send
      setMessageContent('');
      setMessageError('');
    } catch (error) {
      // Error handling is done by parent component
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Handle input blur to hide suggestions
   */
  const handleIPInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 150);
  };

  /**
   * Handle input focus to show suggestions
   */
  const handleIPInputFocus = () => {
    if (targetIP.length > 0) {
      setShowSuggestions(true);
    }
  };

  const filteredSuggestions = getFilteredSuggestions();
  const characterCount = messageContent.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;

  return (
    <div className="bg-white rounded-lg shadow-md p-3 md:p-4 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold text-gray-800">发送消息</h3>
        {(isSending || isLoading) && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-xs md:text-sm">发送中...</span>
          </div>
        )}
      </div>

      {/* Target IP Input */}
      <div className="relative">
        <label htmlFor="targetIP" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
          目标用户 IP 地址
        </label>
        <div className="relative">
          <input
            ref={ipInputRef}
            id="targetIP"
            type="text"
            placeholder="输入 IP 地址或从在线用户中选择"
            value={targetIP}
            onChange={handleTargetIPChange}
            onFocus={handleIPInputFocus}
            onBlur={handleIPInputBlur}
            className={`w-full px-3 py-2.5 md:py-2 text-base md:text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              ipError ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSending || isLoading}
          />
          
          {/* Auto-fill icon */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </div>
        
        {/* IP Error */}
        {ipError && (
          <p className="mt-1 text-xs md:text-sm text-red-600">{ipError}</p>
        )}
        
        {/* Auto-fill Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.slice(0, 5).map((user) => (
              <button
                key={user.id}
                onClick={() => handleSuggestionClick(user.ip)}
                className="w-full px-3 py-2.5 md:py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none flex items-center space-x-2 text-base md:text-sm"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-900">{user.ip}</span>
                <span className="text-xs text-gray-500 ml-auto">在线</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Content Input */}
      <div>
        <label htmlFor="messageContent" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
          消息内容
        </label>
        <textarea
          ref={textareaRef}
          id="messageContent"
          placeholder="输入您的消息内容... (按 Enter 发送，Shift+Enter 换行)"
          value={messageContent}
          onChange={handleMessageContentChange}
          onKeyPress={handleTextareaKeyPress}
          className={`w-full px-3 py-2.5 md:py-2 text-base md:text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[100px] md:min-h-[80px] max-h-[200px] ${
            messageError ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSending || isLoading}
          rows={3}
        />
        
        {/* Character Count */}
        <div className="flex justify-between items-center mt-2">
          <div>
            {messageError && (
              <p className="text-xs md:text-sm text-red-600">{messageError}</p>
            )}
          </div>
          <div className={`text-xs md:text-sm ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
            {characterCount}/{MAX_MESSAGE_LENGTH}
          </div>
        </div>
      </div>

      {/* Send Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSendMessage}
          disabled={!isFormValid()}
          className={`px-4 md:px-6 py-2.5 md:py-2 rounded-md font-medium transition-colors duration-150 text-base md:text-sm ${
            isFormValid()
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSending || isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>发送中...</span>
            </div>
          ) : (
            '发送消息'
          )}
        </button>
      </div>

      {/* Connection Status Warning */}
      {!isConnected && (
        <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <svg
            className="h-5 w-5 text-yellow-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-xs md:text-sm text-yellow-800">
            网络连接已断开，无法发送消息
          </span>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="text-xs text-gray-500 text-center">
        提示：按 Enter 发送消息，Shift+Enter 换行
      </div>
    </div>
  );
}

export default MessageInput;