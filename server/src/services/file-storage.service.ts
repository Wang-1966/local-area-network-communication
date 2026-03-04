import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StoredFileInfo } from '../types/multimedia.interface';

/**
 * Service for managing file storage operations
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDirectory();
  }

  /**
   * Ensure the upload directory exists with proper permissions
   */
  ensureUploadDirectory(): void {
    try {
      if (!fs.existsSync(this.UPLOAD_DIR)) {
        fs.mkdirSync(this.UPLOAD_DIR, { recursive: true, mode: 0o755 });
        this.logger.log(`Created uploads directory at ${this.UPLOAD_DIR}`);
      } else {
        this.logger.log(`Uploads directory already exists at ${this.UPLOAD_DIR}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create uploads directory: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate a unique file ID
   */
  generateFileId(): string {
    return randomUUID();
  }

  /**
   * Get the full file path for a given file ID
   */
  getFilePath(fileId: string, extension: string): string {
    return path.join(this.UPLOAD_DIR, `${fileId}${extension}`);
  }

  /**
   * Store a file and return file information
   */
  async storeFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<StoredFileInfo> {
    try {
      const fileId = this.generateFileId();
      const extension = path.extname(originalName);
      const filePath = this.getFilePath(fileId, extension);

      // Write file to disk
      await fs.promises.writeFile(filePath, fileBuffer);

      const storedFileInfo: StoredFileInfo = {
        fileId,
        originalName,
        fileName: `${fileId}${extension}`,
        filePath,
        fileSize: fileBuffer.length,
        mimeType,
        uploadedAt: Date.now(),
      };

      // Save metadata
      const metadataPath = path.join(this.UPLOAD_DIR, `${fileId}.meta.json`);
      await fs.promises.writeFile(
        metadataPath,
        JSON.stringify(storedFileInfo, null, 2),
      );

      this.logger.log(
        `File stored successfully: ${fileId} (${originalName})`,
      );
      return storedFileInfo;
    } catch (error) {
      this.logger.error(`Failed to store file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Store a file from an existing path (used with multer diskStorage)
   */
  async storeFileFromPath(
    sourcePath: string,
    originalName: string,
    mimeType: string,
  ): Promise<StoredFileInfo> {
    try {
      const fileId = this.generateFileId();
      const extension = path.extname(originalName);
      const filePath = this.getFilePath(fileId, extension);

      // Copy file from source to destination
      await fs.promises.copyFile(sourcePath, filePath);

      // Get file size
      const stats = await fs.promises.stat(filePath);

      const storedFileInfo: StoredFileInfo = {
        fileId,
        originalName,
        fileName: `${fileId}${extension}`,
        filePath,
        fileSize: stats.size,
        mimeType,
        uploadedAt: Date.now(),
      };

      // Save metadata
      const metadataPath = path.join(this.UPLOAD_DIR, `${fileId}.meta.json`);
      await fs.promises.writeFile(
        metadataPath,
        JSON.stringify(storedFileInfo, null, 2),
      );

      // Delete the temporary file from multer
      await fs.promises.unlink(sourcePath);

      this.logger.log(
        `File stored successfully: ${fileId} (${originalName})`,
      );
      return storedFileInfo;
    } catch (error) {
      this.logger.error(`Failed to store file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get file information by file ID
   */
  async getFile(fileId: string): Promise<StoredFileInfo | null> {
    try {
      // Try to read metadata file first
      const metadataPath = path.join(this.UPLOAD_DIR, `${fileId}.meta.json`);
      if (fs.existsSync(metadataPath)) {
        const metadataContent = await fs.promises.readFile(
          metadataPath,
          'utf-8',
        );
        const metadata = JSON.parse(metadataContent);
        return metadata;
      }

      // Fallback: Search for file with any extension
      const files = await fs.promises.readdir(this.UPLOAD_DIR);
      const matchingFile = files.find(
        (file) =>
          file.startsWith(fileId + '.') && !file.endsWith('.meta.json'),
      );

      if (!matchingFile) {
        return null;
      }

      const filePath = path.join(this.UPLOAD_DIR, matchingFile);
      const stats = await fs.promises.stat(filePath);

      return {
        fileId,
        originalName: matchingFile,
        fileName: matchingFile,
        filePath,
        fileSize: stats.size,
        mimeType: 'application/octet-stream',
        uploadedAt: stats.mtimeMs,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get file info: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get file stream for download
   */
  async getFileStream(fileId: string): Promise<fs.ReadStream | null> {
    try {
      const fileInfo = await this.getFile(fileId);
      if (!fileInfo) {
        return null;
      }

      return fs.createReadStream(fileInfo.filePath);
    } catch (error) {
      this.logger.error(
        `Failed to get file stream: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Delete a file by file ID
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const fileInfo = await this.getFile(fileId);
      if (!fileInfo) {
        return false;
      }

      await fs.promises.unlink(fileInfo.filePath);

      // Delete metadata file if it exists
      const metadataPath = path.join(this.UPLOAD_DIR, `${fileId}.meta.json`);
      if (fs.existsSync(metadataPath)) {
        await fs.promises.unlink(metadataPath);
      }

      this.logger.log(`File deleted successfully: ${fileId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Clean up old files based on age
   */
  async cleanupOldFiles(maxAgeMs: number): Promise<number> {
    try {
      const files = await fs.promises.readdir(this.UPLOAD_DIR);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.UPLOAD_DIR, file);
        const stats = await fs.promises.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAgeMs) {
          await fs.promises.unlink(filePath);
          deletedCount++;
          this.logger.log(`Cleaned up old file: ${file}`);
        }
      }

      this.logger.log(`Cleanup completed: ${deletedCount} files deleted`);
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old files: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get upload directory path
   */
  getUploadDir(): string {
    return this.UPLOAD_DIR;
  }
}
