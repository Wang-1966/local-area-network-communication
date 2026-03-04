import { Injectable, Logger } from '@nestjs/common';
import {
  ValidationResult,
  DEFAULT_FILE_CONFIG,
  MultimediaErrorCode,
} from '../types/multimedia.interface';

/**
 * Service for validating multimedia files
 */
@Injectable()
export class FileValidationService {
  private readonly logger = new Logger(FileValidationService.name);
  private readonly SUPPORTED_IMAGE_FORMATS =
    DEFAULT_FILE_CONFIG.supportedImageFormats;
  private readonly SUPPORTED_VIDEO_FORMATS =
    DEFAULT_FILE_CONFIG.supportedVideoFormats;
  private readonly MAX_FILE_SIZE = DEFAULT_FILE_CONFIG.maxFileSize;
  private readonly ALLOWED_MIME_TYPES = DEFAULT_FILE_CONFIG.allowedMimeTypes;

  /**
   * Validate a file (extension and size)
   */
  validateFile(file: Express.Multer.File): ValidationResult {
    // Validate file extension
    const extensionResult = this.validateFileExtension(file.originalname);
    if (!extensionResult.isValid) {
      return extensionResult;
    }

    // Validate file size
    const sizeResult = this.validateFileSize(file.size);
    if (!sizeResult.isValid) {
      return sizeResult;
    }

    return { isValid: true };
  }

  /**
   * Validate file extension
   */
  validateFileExtension(fileName: string): ValidationResult {
    const extension = this.getFileExtension(fileName).toLowerCase();

    const isSupported =
      this.SUPPORTED_IMAGE_FORMATS.includes(extension) ||
      this.SUPPORTED_VIDEO_FORMATS.includes(extension);

    if (!isSupported) {
      const supportedFormats = [
        ...this.SUPPORTED_IMAGE_FORMATS,
        ...this.SUPPORTED_VIDEO_FORMATS,
      ];
      return {
        isValid: false,
        error: `Unsupported file format: ${extension}. Supported formats: ${supportedFormats.join(', ')}`,
        details: {
          fileName,
          supportedFormats,
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSize: number): ValidationResult {
    if (fileSize > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / (1024 * 1024);
      const fileSizeMB = fileSize / (1024 * 1024);
      return {
        isValid: false,
        error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
        details: {
          fileSize,
          maxSize: this.MAX_FILE_SIZE,
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Get file type (image or video)
   */
  getFileType(fileName: string): 'image' | 'video' | 'unknown' {
    const extension = this.getFileExtension(fileName).toLowerCase();

    if (this.SUPPORTED_IMAGE_FORMATS.includes(extension)) {
      return 'image';
    }

    if (this.SUPPORTED_VIDEO_FORMATS.includes(extension)) {
      return 'video';
    }

    return 'unknown';
  }

  /**
   * Check if file is an image
   */
  isImageFile(fileName: string): boolean {
    return this.getFileType(fileName) === 'image';
  }

  /**
   * Check if file is a video
   */
  isVideoFile(fileName: string): boolean {
    return this.getFileType(fileName) === 'video';
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return fileName.substring(lastDotIndex + 1);
  }
}
