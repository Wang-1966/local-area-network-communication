import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Message, User, ConnectionStatus } from '../types';

/**
 * Generate a UUID v4 compatible ID
 * Fallback for environments where crypto.randomUUID is not available
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Application state interface
 */
export interface AppState {
  currentUser: User | null;
  messages: Message[];
  onlineUsers: User[];
  connectionStatus: ConnectionStatus;
}

/**
 * Action types for state management
 */
export type AppAction =
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: { messageId: string; status: Message['status'] } }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_ONLINE_USERS'; payload: User[] }
  | { type: 'ADD_ONLINE_USER'; payload: User }
  | { type: 'REMOVE_ONLINE_USER'; payload: string } // userIP
  | { type: 'UPDATE_CONNECTION_STATUS'; payload: Partial<ConnectionStatus> }
  | { type: 'INCREMENT_RECONNECT_ATTEMPTS' }
  | { type: 'RESET_RECONNECT_ATTEMPTS' }
  | { type: 'RESET_STATE' };

/**
 * Initial application state
 */
const initialState: AppState = {
  currentUser: null,
  messages: [],
  onlineUsers: [],
  connectionStatus: {
    status: 'disconnected',
    reconnectAttempts: 0,
  },
};

/**
 * State reducer function
 */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
      };

    case 'UPDATE_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: {
          ...state.connectionStatus,
          ...action.payload,
        },
      };

    case 'INCREMENT_RECONNECT_ATTEMPTS':
      return {
        ...state,
        connectionStatus: {
          ...state.connectionStatus,
          reconnectAttempts: (state.connectionStatus.reconnectAttempts || 0) + 1,
        },
      };

    case 'RESET_RECONNECT_ATTEMPTS':
      return {
        ...state,
        connectionStatus: {
          ...state.connectionStatus,
          reconnectAttempts: 0,
        },
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'UPDATE_MESSAGE_STATUS':
      console.log('UPDATE_MESSAGE_STATUS reducer called');
      console.log('Looking for message ID:', action.payload.messageId);
      console.log('Current messages IDs:', state.messages.map(m => m.id));
      console.log('New status:', action.payload.status);
      
      const foundMessage = state.messages.find(m => m.id === action.payload.messageId);
      console.log('Found message:', foundMessage ? 'YES' : 'NO');
      
      const updatedMessages = state.messages.map(message => {
        if (message.id === action.payload.messageId) {
          console.log('Updating message:', message.id, 'from', message.status, 'to', action.payload.status);
          return { ...message, status: action.payload.status };
        }
        return message;
      });
      
      console.log('Updated messages statuses:', updatedMessages.map(m => ({ id: m.id, status: m.status })));
      
      return {
        ...state,
        messages: updatedMessages,
      };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
      };

    case 'SET_ONLINE_USERS':
      return {
        ...state,
        onlineUsers: action.payload,
      };

    case 'ADD_ONLINE_USER':
      // Avoid duplicates - check if user and user.ip exist
      if (state.onlineUsers.some(user => user && user.ip === action.payload?.ip)) {
        return state;
      }
      // Only add if payload is valid
      if (!action.payload || !action.payload.ip) {
        return state;
      }
      return {
        ...state,
        onlineUsers: [...state.onlineUsers, action.payload],
      };

    case 'REMOVE_ONLINE_USER':
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(user => user && user.ip !== action.payload),
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

/**
 * Context interface
 */
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience methods
  setCurrentUser: (user: User | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: Message['status']) => void;
  setMessages: (messages: Message[]) => void;
  setOnlineUsers: (users: User[]) => void;
  addOnlineUser: (user: User) => void;
  removeOnlineUser: (userIP: string) => void;
  resetState: () => void;
  
  // Enhanced state update methods
  createPendingMessage: (targetIP: string, content: string) => Message;
  markMessageAsSent: (messageId: string) => void;
  markMessageAsFailed: (messageId: string) => void;
  updateConnectionWithReconnectAttempt: () => void;
  resetReconnectAttempts: () => void;
  isUserOnline: (userIP: string) => boolean;
  getConversationWith: (userIP: string) => Message[];
  getPendingMessages: () => Message[];
}

/**
 * Create the context
 */
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Context provider props
 */
interface AppContextProviderProps {
  children: ReactNode;
}

/**
 * Context provider component
 */
export function AppContextProvider({ children }: AppContextProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience methods
  const setCurrentUser = (user: User | null) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  };

  const setConnectionStatus = (status: ConnectionStatus) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  };

  const addMessage = (message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  };

  const updateMessageStatus = (messageId: string, status: Message['status']) => {
    dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { messageId, status } });
  };

  const setMessages = (messages: Message[]) => {
    dispatch({ type: 'SET_MESSAGES', payload: messages });
  };

  const setOnlineUsers = (users: User[]) => {
    dispatch({ type: 'SET_ONLINE_USERS', payload: users });
  };

  const addOnlineUser = (user: User) => {
    dispatch({ type: 'ADD_ONLINE_USER', payload: user });
  };

  const removeOnlineUser = (userIP: string) => {
    dispatch({ type: 'REMOVE_ONLINE_USER', payload: userIP });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  // Enhanced state update methods
  const createPendingMessage = (targetIP: string, content: string): Message => {
    const message: Message = {
      id: generateUUID(),
      content,
      senderIP: state.currentUser?.ip || 'unknown',
      receiverIP: targetIP,
      timestamp: Date.now(),
      direction: 'sent',
      status: 'pending',
    };
    
    addMessage(message);
    return message;
  };

  const markMessageAsSent = (messageId: string) => {
    console.log('markMessageAsSent called with ID:', messageId);
    updateMessageStatus(messageId, 'sent');
  };

  const markMessageAsFailed = (messageId: string) => {
    updateMessageStatus(messageId, 'failed');
  };

  const updateConnectionWithReconnectAttempt = () => {
    dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: { status: 'connecting' } });
    dispatch({ type: 'INCREMENT_RECONNECT_ATTEMPTS' });
  };

  const resetReconnectAttempts = () => {
    dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' });
  };

  const isUserOnline = (userIP: string): boolean => {
    return state.onlineUsers.some(user => user && user.ip === userIP);
  };

  const getConversationWith = (userIP: string): Message[] => {
    const currentUserIP = state.currentUser?.ip;
    if (!currentUserIP) return [];
    
    return state.messages.filter(message => 
      (message.senderIP === currentUserIP && message.receiverIP === userIP) ||
      (message.senderIP === userIP && message.receiverIP === currentUserIP)
    ).sort((a, b) => a.timestamp - b.timestamp);
  };

  const getPendingMessages = (): Message[] => {
    return state.messages.filter(message => message.status === 'pending');
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    setCurrentUser,
    setConnectionStatus,
    addMessage,
    updateMessageStatus,
    setMessages,
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    resetState,
    createPendingMessage,
    markMessageAsSent,
    markMessageAsFailed,
    updateConnectionWithReconnectAttempt,
    resetReconnectAttempts,
    isUserOnline,
    getConversationWith,
    getPendingMessages,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Custom hook to use the app context
 */
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}

/**
 * Hook to get only the state (for read-only access)
 */
export function useAppState(): AppState {
  const { state } = useAppContext();
  return state;
}

/**
 * Hook to get specific state slices for performance optimization
 */
export function useCurrentUser(): User | null {
  const { state } = useAppContext();
  return state.currentUser;
}

export function useMessages(): Message[] {
  const { state } = useAppContext();
  return state.messages;
}

export function useOnlineUsers(): User[] {
  const { state } = useAppContext();
  return state.onlineUsers;
}

export function useConnectionStatus(): ConnectionStatus {
  const { state } = useAppContext();
  return state.connectionStatus;
}