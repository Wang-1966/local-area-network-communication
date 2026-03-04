import { useEffect, useState } from 'react';
import { AppContextProvider, useAppContext } from './context/AppContext';
import { websocketService } from './services/websocket.service';
import { ConnectionStatus } from './components/ConnectionStatus';
import { OnlineUserList } from './components/OnlineUserList';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorToast } from './components/ErrorToast';
import { User } from './types';

/**
 * Main App component content (wrapped by AppContextProvider)
 */
function AppContent() {
  const {
    state,
    setCurrentUser,
    setConnectionStatus,
    addMessage,
    setMessages,
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    markMessageAsSent,
    markMessageAsFailed,
    createPendingMessage,
    resetReconnectAttempts,
    updateConnectionWithReconnectAttempt,
  } = useAppContext();

  const [selectedUserIP, setSelectedUserIP] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);

  /**
   * Initialize WebSocket connection and event listeners
   */
  useEffect(() => {
    console.log('App useEffect: Initializing WebSocket connection');
    
    // Set status to connecting immediately
    setConnectionStatus({
      status: 'connecting',
      connectedAt: undefined,
    });
    
    // Connect to WebSocket server
    websocketService.connect();

    // Register event listeners
    websocketService.on('connected', handleConnected);
    websocketService.on('newMessage', handleNewMessage);
    websocketService.on('newMultimediaMessage', handleNewMessage); // 多媒体消息也用同样的处理
    websocketService.on('messageSent', handleMessageSent);
    websocketService.on('multimediaMessageSent', handleMessageSent); // 多媒体消息发送确认
    websocketService.on('messageError', handleMessageError);
    websocketService.on('multimediaMessageError', handleMessageError); // 多媒体消息错误
    websocketService.on('onlineUsersUpdate', handleOnlineUsersUpdate);
    websocketService.on('userJoined', handleUserJoined);
    websocketService.on('userLeft', handleUserLeft);
    websocketService.on('messageHistory', handleMessageHistory);
    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('error', handleError);

    console.log('App useEffect: Event listeners registered');

    // Cleanup on unmount
    return () => {
      console.log('App useEffect cleanup: Removing event listeners and disconnecting');
      websocketService.off('connected', handleConnected);
      websocketService.off('newMessage', handleNewMessage);
      websocketService.off('newMultimediaMessage', handleNewMessage);
      websocketService.off('messageSent', handleMessageSent);
      websocketService.off('multimediaMessageSent', handleMessageSent);
      websocketService.off('messageError', handleMessageError);
      websocketService.off('multimediaMessageError', handleMessageError);
      websocketService.off('onlineUsersUpdate', handleOnlineUsersUpdate);
      websocketService.off('userJoined', handleUserJoined);
      websocketService.off('userLeft', handleUserLeft);
      websocketService.off('messageHistory', handleMessageHistory);
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('error', handleError);
      websocketService.disconnect();
    };
  }, []);

  /**
   * Handle successful connection
   */
  const handleConnected = (data: any) => {
    console.log('=== handleConnected called ===');
    console.log('Connected to server:', data);
    setCurrentUser(data.user);
    setOnlineUsers(data.onlineUsers || []);
    setConnectionStatus({
      status: 'connected',
      connectedAt: Date.now(),
    });
    resetReconnectAttempts();
    setErrorMessage('');
    
    // 连接成功后，加载消息历史
    loadMessageHistory();
  };

  /**
   * Load message history from server
   */
  const loadMessageHistory = () => {
    try {
      console.log('Loading message history...');
      websocketService.getMessageHistory({ limit: 100 });
    } catch (error) {
      console.error('Error loading message history:', error);
    }
  };

  /**
   * Handle message history response
   */
  const handleMessageHistory = (data: any) => {
    console.log('Message history received:', data);
    if (data && data.messages && Array.isArray(data.messages)) {
      // 为每条消息设置正确的direction
      const messagesWithDirection = data.messages.map((msg: any) => ({
        ...msg,
        direction: msg.senderIP === state.currentUser?.ip ? 'sent' : 'received',
      }));
      setMessages(messagesWithDirection);
    }
  };

  /**
   * Handle new message received
   */
  const handleNewMessage = (message: any) => {
    console.log('New message received:', message);
    // Backend sends the message object directly
    if (message && message.id) {
      const receivedMessage = {
        ...message,
        direction: 'received' as const,
      };
      addMessage(receivedMessage);
    } else {
      console.warn('Invalid new message data:', message);
    }
  };

  /**
   * Handle message sent confirmation
   */
  const handleMessageSent = (message: any) => {
    console.log('=== Message sent event received ===');
    console.log('Message data:', message);
    console.log('Message ID:', message?.id);
    
    // Backend sends the message object directly
    if (message && message.id) {
      console.log('Marking message as sent:', message.id);
      markMessageAsSent(message.id);
    } else {
      console.warn('Invalid message sent data:', message);
    }
  };

  /**
   * Handle message send error
   */
  const handleMessageError = (data: any) => {
    console.log('Message error:', data);
    const errorCode = data.code || 'UNKNOWN';
    
    // Find and mark the pending message as failed
    const pendingMessages = state.messages.filter(m => m.status === 'pending');
    if (pendingMessages.length > 0) {
      const lastPendingMessage = pendingMessages[pendingMessages.length - 1];
      markMessageAsFailed(lastPendingMessage.id);
    }

    // Show error message
    let errorMsg = data.error || '消息发送失败';
    if (errorCode === 'USER_OFFLINE') {
      errorMsg = '目标用户不在线';
    } else if (errorCode === 'INVALID_INPUT') {
      errorMsg = '输入验证失败';
    } else if (errorCode === 'SEND_FAILED') {
      errorMsg = '消息发送失败，请重试';
    }
    
    setErrorMessage(errorMsg);
  };

  /**
   * Handle online users list update
   */
  const handleOnlineUsersUpdate = (data: any) => {
    console.log('Online users updated:', data);
    setOnlineUsers(data.users || []);
  };

  /**
   * Handle user joined
   */
  const handleUserJoined = (data: any) => {
    console.log('User joined:', data);
    addOnlineUser(data.user);
  };

  /**
   * Handle user left
   */
  const handleUserLeft = (data: any) => {
    console.log('User left:', data);
    removeOnlineUser(data.userIP);
  };

  /**
   * Handle WebSocket connect
   */
  const handleConnect = () => {
    console.log('=== handleConnect called (Socket.io connect event) ===');
    console.log('WebSocket connected');
    setConnectionStatus({
      status: 'connected',
      connectedAt: Date.now(),
    });
    resetReconnectAttempts();
  };

  /**
   * Handle WebSocket disconnect
   */
  const handleDisconnect = (reason: string) => {
    console.log('=== handleDisconnect called ===');
    console.log('WebSocket disconnected:', reason);
    setConnectionStatus({
      status: 'disconnected',
    });
  };

  /**
   * Handle WebSocket error
   */
  const handleError = (error: any) => {
    console.error('WebSocket error:', error);
    setErrorMessage('网络连接错误，请检查您的网络连接');
  };

  /**
   * Handle send message
   */
  const handleSendMessage = async (targetUserIP: string, content: string) => {
    try {
      console.log('[App] handleSendMessage: Setting isLoading to true');
      setIsLoading(true);
      setErrorMessage('');

      // Create pending message and get its ID
      const pendingMessage = createPendingMessage(targetUserIP, content);

      // Send message via WebSocket with the message ID
      websocketService.sendMessage(targetUserIP, content, pendingMessage.id);
      
      // Reset loading state after a short delay to prevent stuck state
      setTimeout(() => {
        console.log('[App] handleSendMessage: Setting isLoading to false after timeout');
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('发送消息失败，请检查网络连接');
      console.log('[App] handleSendMessage: Setting isLoading to false after error');
      setIsLoading(false);
    }
  };

  /**
   * Handle send multimedia message (file upload)
   */
  const handleSendMultimediaMessage = async (targetUserIP: string, file: File) => {
    try {
      setIsFileUploading(true);
      setErrorMessage('');

      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const uploadResult = await response.json();
      const fileId = uploadResult.fileId;

      if (!fileId) {
        throw new Error('No file ID returned from server');
      }

      // Send multimedia message via WebSocket
      // Note: We don't create a pending message here because the server will create the full message
      websocketService.sendMultimediaMessage(targetUserIP, fileId);
    } catch (error) {
      console.error('Error sending multimedia message:', error);
      const errorMsg = error instanceof Error ? error.message : '文件上传失败';
      setErrorMessage(errorMsg);
      throw error;
    } finally {
      setIsFileUploading(false);
    }
  };

  /**
   * Handle user selection from online list
   */
  const handleSelectUser = (user: User) => {
    setSelectedUserIP(user.ip);
  };

  /**
   * Handle reconnect button click
   */
  const handleReconnect = () => {
    updateConnectionWithReconnectAttempt();
    websocketService.reconnect();
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Error Toast */}
      {errorMessage && (
        <ErrorToast message={errorMessage} onClose={clearError} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 md:gap-4 p-2 md:p-4 max-w-7xl mx-auto w-full">
        {/* Left Sidebar - Connection Status and Online Users (Mobile: top, Desktop: left) */}
        <div className="w-full lg:w-72 flex flex-col gap-3 md:gap-4">
          {/* Connection Status */}
          <div className="flex-shrink-0">
            <ConnectionStatus onReconnect={handleReconnect} />
          </div>

          {/* Online Users List - Hidden on mobile, visible on tablet and desktop */}
          <div className="hidden md:flex flex-col flex-1 min-h-64 lg:min-h-96">
            <OnlineUserList
              users={state.onlineUsers}
              currentUserIP={state.currentUser?.ip || ''}
              onSelectUser={handleSelectUser}
            />
          </div>
        </div>

        {/* Right Content - Messages and Input (Mobile: bottom, Desktop: right) */}
        <div className="flex-1 flex flex-col gap-3 md:gap-4">
          {/* Message List */}
          <div className="flex-1 min-h-48 md:min-h-64 lg:min-h-96">
            <MessageList
              messages={state.messages}
              currentUserIP={state.currentUser?.ip || ''}
            />
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0">
            <MessageInput
              onSendMessage={handleSendMessage}
              onSendMultimediaMessage={handleSendMultimediaMessage}
              onlineUsers={state.onlineUsers}
              isConnected={state.connectionStatus.status === 'connected'}
              selectedUserIP={selectedUserIP}
              isLoading={isLoading}
              isFileUploading={isFileUploading}
            />
          </div>
        </div>

        {/* Mobile Online Users List - Visible only on mobile */}
        <div className="md:hidden w-full">
          <OnlineUserList
            users={state.onlineUsers}
            currentUserIP={state.currentUser?.ip || ''}
            onSelectUser={handleSelectUser}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Main App component with error boundary and context provider
 */
function App() {
  return (
    <ErrorBoundary>
      <AppContextProvider>
        <AppContent />
      </AppContextProvider>
    </ErrorBoundary>
  );
}

export default App;
