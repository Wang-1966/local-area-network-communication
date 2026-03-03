import { useState } from 'react';
import { useConnectionStatus, useCurrentUser } from '../context/AppContext';

/**
 * Props for ConnectionStatus component
 */
interface ConnectionStatusProps {
  onReconnect: () => void;
}

/**
 * ConnectionStatus component displays the current connection status,
 * user's IP address, and provides copy-to-clipboard and reconnect functionality
 */
export function ConnectionStatus({ onReconnect }: ConnectionStatusProps) {
  const connectionStatus = useConnectionStatus();
  const currentUser = useCurrentUser();
  const [copySuccess, setCopySuccess] = useState(false);

  /**
   * Copy IP address to clipboard
   */
  const handleCopyIP = async () => {
    if (!currentUser?.ip) return;

    try {
      await navigator.clipboard.writeText(currentUser.ip);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy IP address:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentUser.ip;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  /**
   * Get status indicator color and text
   */
  const getStatusInfo = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: '已连接',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: '连接中...',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          text: '已断开',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      default:
        return {
          color: 'bg-gray-500',
          text: '未知',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const showReconnectButton = connectionStatus.status === 'disconnected';
  const reconnectAttempts = connectionStatus.reconnectAttempts || 0;

  return (
    <div className={`p-3 md:p-4 rounded-lg border-2 ${statusInfo.bgColor} ${statusInfo.borderColor} transition-colors duration-200`}>
      {/* Connection Status Header */}
      <div className="flex items-center justify-between mb-2 md:mb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${statusInfo.color} ${connectionStatus.status === 'connecting' ? 'animate-pulse' : ''}`}></div>
          <span className={`font-medium text-sm md:text-base ${statusInfo.textColor}`}>
            {statusInfo.text}
          </span>
          {reconnectAttempts > 0 && (
            <span className="text-xs md:text-sm text-gray-500">
              (尝试 {reconnectAttempts}/5)
            </span>
          )}
        </div>
        
        {/* Reconnect Button */}
        {showReconnectButton && (
          <button
            onClick={onReconnect}
            className="px-2.5 md:px-3 py-1.5 md:py-1 text-xs md:text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={connectionStatus.status === 'connecting'}
          >
            重新连接
          </button>
        )}
      </div>

      {/* IP Address Section */}
      {currentUser?.ip && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm font-medium text-gray-700">本机 IP 地址:</span>
          </div>
          
          <div className="flex items-center space-x-2 p-2 bg-white rounded border">
            <code className="flex-1 text-base md:text-lg font-mono text-gray-800 select-all truncate">
              {currentUser.ip}
            </code>
            
            <button
              onClick={handleCopyIP}
              className={`px-2.5 md:px-3 py-1.5 md:py-1 text-xs md:text-sm rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 flex-shrink-0 ${
                copySuccess
                  ? 'bg-green-500 text-white focus:ring-green-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'
              }`}
              title="复制 IP 地址"
            >
              {copySuccess ? '已复制!' : '复制'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500">
            将此 IP 地址分享给同事，他们可以向您发送消息
          </p>
        </div>
      )}

      {/* Connection Info */}
      {connectionStatus.connectedAt && connectionStatus.status === 'connected' && (
        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            连接时间: {new Date(connectionStatus.connectedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}