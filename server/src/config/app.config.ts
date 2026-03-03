import { AppConfig } from '../types/config.interface';
import { join } from 'path';

/**
 * Default application configuration
 * 
 * These values can be overridden by environment variables
 */
export const defaultConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  messageTimeout: parseInt(process.env.MESSAGE_TIMEOUT || '5000', 10),
  maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '1000', 10),
  maxMessagesInMemory: parseInt(process.env.MAX_MESSAGES_IN_MEMORY || '1000', 10),
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10),
  reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '3000', 10),
  maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  staticAssetsPath: process.env.STATIC_ASSETS_PATH || join(__dirname, '..', '..', '..', 'client', 'dist'),
};

/**
 * Get application configuration
 * 
 * @returns AppConfig object with current configuration values
 */
export function getAppConfig(): AppConfig {
  return { ...defaultConfig };
}

/**
 * Validate configuration values
 * 
 * @param config - Configuration object to validate
 * @returns true if valid, throws error if invalid
 */
export function validateConfig(config: AppConfig): boolean {
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port number: ${config.port}. Must be between 1 and 65535.`);
  }

  if (config.messageTimeout < 1000) {
    throw new Error(`Invalid message timeout: ${config.messageTimeout}. Must be at least 1000ms.`);
  }

  if (config.maxMessageLength < 1) {
    throw new Error(`Invalid max message length: ${config.maxMessageLength}. Must be at least 1.`);
  }

  if (config.maxMessagesInMemory < 1) {
    throw new Error(`Invalid max messages in memory: ${config.maxMessagesInMemory}. Must be at least 1.`);
  }

  if (config.heartbeatInterval < 1000) {
    throw new Error(`Invalid heartbeat interval: ${config.heartbeatInterval}. Must be at least 1000ms.`);
  }

  if (config.reconnectDelay < 0) {
    throw new Error(`Invalid reconnect delay: ${config.reconnectDelay}. Must be non-negative.`);
  }

  if (config.maxReconnectAttempts < 0) {
    throw new Error(`Invalid max reconnect attempts: ${config.maxReconnectAttempts}. Must be non-negative.`);
  }

  return true;
}
