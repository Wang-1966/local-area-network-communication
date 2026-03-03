# AppContext Usage Guide

The AppContext provides centralized state management for the LAN messaging application using React Context API and useReducer.

## Features

- **Current User Management**: Track the currently connected user
- **Message Management**: Store and update message history with status tracking
- **Online Users Management**: Maintain list of currently online users
- **Connection Status**: Track WebSocket connection state and reconnection attempts
- **Type Safety**: Full TypeScript support with proper type definitions

## Basic Usage

### 1. Wrap your app with the provider

```tsx
import { AppContextProvider } from './context/AppContext';
import App from './App';

function Root() {
  return (
    <AppContextProvider>
      <App />
    </AppContextProvider>
  );
}
```

### 2. Use the context in components

```tsx
import { useAppContext, useAppState } from './context/AppContext';

function MyComponent() {
  // Full context access (state + actions)
  const { state, setCurrentUser, addMessage, setConnectionStatus } = useAppContext();
  
  // Read-only state access
  const appState = useAppState();
  
  // Specific state slices (performance optimized)
  const currentUser = useCurrentUser();
  const messages = useMessages();
  const onlineUsers = useOnlineUsers();
  const connectionStatus = useConnectionStatus();
  
  return (
    <div>
      <p>Connection: {connectionStatus.status}</p>
      <p>Messages: {messages.length}</p>
      <p>Online Users: {onlineUsers.length}</p>
    </div>
  );
}
```

## State Structure

```typescript
interface AppState {
  currentUser: User | null;           // Currently connected user
  messages: Message[];                // All messages (sent/received)
  onlineUsers: User[];               // List of online users
  connectionStatus: ConnectionStatus; // WebSocket connection state
}
```

## Available Actions

### User Management
- `setCurrentUser(user: User | null)` - Set the current user
- `setOnlineUsers(users: User[])` - Replace entire online users list
- `addOnlineUser(user: User)` - Add a single online user (prevents duplicates)
- `removeOnlineUser(userIP: string)` - Remove user by IP address

### Message Management
- `addMessage(message: Message)` - Add a new message
- `updateMessageStatus(messageId: string, status: 'pending' | 'sent' | 'failed')` - Update message status
- `setMessages(messages: Message[])` - Replace entire message history

### Connection Management
- `setConnectionStatus(status: ConnectionStatus)` - Update connection status

### Utility
- `resetState()` - Reset all state to initial values

## Message Status Flow

Messages follow this status lifecycle:
1. **pending** - Message is being sent
2. **sent** - Message successfully delivered
3. **failed** - Message failed to send

```tsx
// Example: Sending a message
const { addMessage, updateMessageStatus } = useAppContext();

const sendMessage = async (content: string, targetIP: string) => {
  const message: Message = {
    id: generateId(),
    content,
    senderIP: currentUser.ip,
    receiverIP: targetIP,
    timestamp: Date.now(),
    direction: 'sent',
    status: 'pending'
  };
  
  // Add message with pending status
  addMessage(message);
  
  try {
    await websocketService.sendMessage(targetIP, content);
    // Update to sent on success
    updateMessageStatus(message.id, 'sent');
  } catch (error) {
    // Update to failed on error
    updateMessageStatus(message.id, 'failed');
  }
};
```

## Connection Status Management

```tsx
const { setConnectionStatus } = useAppContext();

// Update connection status based on WebSocket events
websocket.on('connect', () => {
  setConnectionStatus({
    status: 'connected',
    connectedAt: Date.now(),
    reconnectAttempts: 0
  });
});

websocket.on('disconnect', () => {
  setConnectionStatus({
    status: 'disconnected',
    reconnectAttempts: 0
  });
});
```

## Performance Considerations

- Use specific hooks (`useCurrentUser`, `useMessages`, etc.) when you only need specific state slices
- The context uses `useReducer` for efficient state updates
- Actions are memoized to prevent unnecessary re-renders
- Duplicate user prevention is built-in for online users management

## Error Handling

The context includes proper error boundaries:

```tsx
// The hook will throw if used outside provider
try {
  const context = useAppContext();
} catch (error) {
  // Handle error: component not wrapped in provider
}
```

## Testing

The context is fully tested with comprehensive test coverage:
- State management actions
- Error conditions
- Performance optimizations
- Type safety

See `AppContext.test.tsx` for complete test examples.