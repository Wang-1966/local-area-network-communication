import { Message as BaseMessage } from './message.interface';

/**
 * Multimedia message types and interfaces
 */

/**
 * Message type enumeration
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
}

/**
 * Multimedia message interface extending the base Message interface
 */
export interface MultimediaMessage extends BaseMessage {
  type?: MessageType.IMAGE | MessageType.VIDEO;
  fileType: 'image' | 'video';
  fileId: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
}

/**
 * File upload DTO
 */
export interface FileUploadDto {
  targetUserIP: string;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  success: boolean;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: 'image' | 'video';
  error?: string;
}

/**
 * Send multimedia message DTO
 */
export interface SendMultimediaMessageDto {
  targetIP: string;
  fileId: string;
}

/**
 * Multimedia message response
 */
export interface MultimediaMessageResponse {
  success: boolean;
  message?: MultimediaMessage;
  error?: string;
}

/**
 * File info response
 */
export interface FileInfoResponse {
  fileId: string;
  fileName: string;
  fileType: 'image' | 'video';
  fileSize: number;
  uploadedAt: number;
}

/**
 * Stored file information
 */
export interface StoredFileInfo {
  fileId: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: number;
}

/**
 * File validation configuration
 */
export interface FileValidationConfig {
  maxFileSize: number;
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
  allowedMimeTypes: string[];
}

/**
 * Default file validation configuration
 */
export const DEFAULT_FILE_CONFIG: FileValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif'],
  supportedVideoFormats: ['mp4', 'mov'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime',
  ],
};

/**
 * File validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    fileName?: string;
    fileSize?: number;
    maxSize?: number;
    supportedFormats?: string[];
  };
}

/**
 * File upload state
 */
export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
  uploadedFile?: {
    fileId: string;
    fileName: string;
    fileSize: number;
  };
}

/**
 * Multimedia error codes
 */
export enum MultimediaErrorCode {
  // File validation errors
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  FILE_READ_ERROR = 'FILE_READ_ERROR',

  // Upload errors
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  UPLOAD_TIMEOUT = 'UPLOAD_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Storage errors
  STORAGE_FULL = 'STORAGE_FULL',
  STORAGE_ERROR = 'STORAGE_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Transmission errors
  SEND_FAILED = 'SEND_FAILED',
  USER_OFFLINE = 'USER_OFFLINE',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Multimedia error response
 */
export interface MultimediaErrorResponse {
  success: false;
  error: {
    code: MultimediaErrorCode;
    message: string;
    details?: {
      fileName?: string;
      fileSize?: number;
      maxSize?: number;
      supportedFormats?: string[];
    };
    timestamp: number;
  };
}
