import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { multerConfig } from '../config/multer.config';
import { FileValidationService } from '../services/file-validation.service';
import { FileStorageService } from '../services/file-storage.service';
import {
  FileUploadResponse,
  FileInfoResponse,
  MultimediaErrorCode,
} from '../types/multimedia.interface';

/**
 * Controller for handling file upload and download operations
 */
@Controller('files')
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(
    private readonly fileValidationService: FileValidationService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Upload a file
   * POST /files/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileUploadResponse> {
    try {
      // Check if file was provided
      if (!file) {
        this.logger.warn('File upload attempted without file');
        throw new BadRequestException({
          success: false,
          error: {
            code: MultimediaErrorCode.FILE_READ_ERROR,
            message: 'No file provided',
            timestamp: Date.now(),
          },
        });
      }

      // Validate file
      const validationResult = this.fileValidationService.validateFile(file);
      if (!validationResult.isValid) {
        this.logger.warn(
          `File validation failed: ${validationResult.error}`,
        );
        throw new BadRequestException({
          success: false,
          error: {
            code:
              validationResult.error?.includes('format') ||
              validationResult.error?.includes('Unsupported')
                ? MultimediaErrorCode.UNSUPPORTED_FORMAT
                : MultimediaErrorCode.FILE_TOO_LARGE,
            message: validationResult.error,
            details: validationResult.details,
            timestamp: Date.now(),
          },
        });
      }

      // Store file from multer's temporary path
      const storedFileInfo = await this.fileStorageService.storeFileFromPath(
        file.path,
        file.originalname,
        file.mimetype,
      );

      // Get file type
      const fileType = this.fileValidationService.getFileType(
        file.originalname,
      );

      this.logger.log(
        `File uploaded successfully: ${storedFileInfo.fileId} (${file.originalname})`,
      );

      return {
        success: true,
        fileId: storedFileInfo.fileId,
        fileName: storedFileInfo.originalName,
        fileSize: storedFileInfo.fileSize,
        fileType: fileType as 'image' | 'video',
      };
    } catch (error) {
      if (error.response) {
        throw error;
      }

      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: MultimediaErrorCode.UPLOAD_FAILED,
          message: 'File upload failed',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * Download a file
   * GET /files/:fileId
   */
  @Get(':fileId')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res() response: Response,
  ): Promise<void> {
    try {
      // Get file information
      const fileInfo = await this.fileStorageService.getFile(fileId);
      if (!fileInfo) {
        this.logger.warn(`File not found: ${fileId}`);
        throw new NotFoundException({
          success: false,
          error: {
            code: MultimediaErrorCode.FILE_NOT_FOUND,
            message: `File not found: ${fileId}`,
            timestamp: Date.now(),
          },
        });
      }

      // Get file stream
      const fileStream = await this.fileStorageService.getFileStream(fileId);
      if (!fileStream) {
        this.logger.warn(`Failed to get file stream: ${fileId}`);
        throw new InternalServerErrorException({
          success: false,
          error: {
            code: MultimediaErrorCode.STORAGE_ERROR,
            message: 'Failed to retrieve file',
            timestamp: Date.now(),
          },
        });
      }

      // Set response headers
      response.setHeader('Content-Type', fileInfo.mimeType);
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileInfo.originalName}"`,
      );
      response.setHeader('Content-Length', fileInfo.fileSize);

      // Stream file to response
      fileStream.pipe(response);

      this.logger.log(`File downloaded: ${fileId} (${fileInfo.originalName})`);
    } catch (error) {
      if (error.response) {
        throw error;
      }

      this.logger.error(`File download failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: MultimediaErrorCode.STORAGE_ERROR,
          message: 'File download failed',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * Get file information
   * GET /files/:fileId/info
   */
  @Get(':fileId/info')
  async getFileInfo(@Param('fileId') fileId: string): Promise<FileInfoResponse> {
    try {
      // Get file information
      const fileInfo = await this.fileStorageService.getFile(fileId);
      if (!fileInfo) {
        this.logger.warn(`File info not found: ${fileId}`);
        throw new NotFoundException({
          success: false,
          error: {
            code: MultimediaErrorCode.FILE_NOT_FOUND,
            message: `File not found: ${fileId}`,
            timestamp: Date.now(),
          },
        });
      }

      // Get file type
      const fileType = this.fileValidationService.getFileType(
        fileInfo.originalName,
      );

      this.logger.log(`File info retrieved: ${fileId}`);

      return {
        fileId: fileInfo.fileId,
        fileName: fileInfo.originalName,
        fileType: fileType as 'image' | 'video',
        fileSize: fileInfo.fileSize,
        uploadedAt: fileInfo.uploadedAt,
      };
    } catch (error) {
      if (error.response) {
        throw error;
      }

      this.logger.error(
        `Failed to get file info: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: MultimediaErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve file information',
          timestamp: Date.now(),
        },
      });
    }
  }
}
