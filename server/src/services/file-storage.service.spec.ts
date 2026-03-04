import { Test, TestingModule } from '@nestjs/testing';
import { FileStorageService } from './file-storage.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let testUploadDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testUploadDir = path.join(os.tmpdir(), `test-uploads-${Date.now()}`);

    // Mock the UPLOAD_DIR by creating a test service instance
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileStorageService],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);

    // Override the UPLOAD_DIR for testing
    (service as any).UPLOAD_DIR = testUploadDir;
    service.ensureUploadDirectory();
  });

  afterEach(async () => {
    // Add delay to ensure all async operations complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Clean up test directory
    if (fs.existsSync(testUploadDir)) {
      const files = fs.readdirSync(testUploadDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(testUploadDir, file));
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
      try {
        fs.rmdirSync(testUploadDir);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('ensureUploadDirectory', () => {
    it('should create upload directory if it does not exist', () => {
      const newDir = path.join(os.tmpdir(), `test-new-dir-${Date.now()}`);
      (service as any).UPLOAD_DIR = newDir;

      service.ensureUploadDirectory();

      expect(fs.existsSync(newDir)).toBe(true);

      // Cleanup
      fs.rmdirSync(newDir);
    });

    it('should not throw error if directory already exists', () => {
      expect(() => {
        service.ensureUploadDirectory();
      }).not.toThrow();
    });
  });

  describe('generateFileId', () => {
    it('should generate a unique file ID', () => {
      const fileId1 = service.generateFileId();
      const fileId2 = service.generateFileId();

      expect(fileId1).toBeDefined();
      expect(fileId2).toBeDefined();
      expect(fileId1).not.toEqual(fileId2);
    });

    it('should generate a valid UUID format', () => {
      const fileId = service.generateFileId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(fileId).toMatch(uuidRegex);
    });
  });

  describe('getFilePath', () => {
    it('should return correct file path with extension', () => {
      const fileId = 'test-file-id';
      const extension = '.jpg';

      const filePath = service.getFilePath(fileId, extension);

      expect(filePath).toContain(fileId);
      expect(filePath).toContain(extension);
      expect(filePath).toContain(testUploadDir);
    });

    it('should handle different extensions', () => {
      const fileId = 'test-id';
      const extensions = ['.jpg', '.png', '.mp4', '.mov'];

      extensions.forEach((ext) => {
        const filePath = service.getFilePath(fileId, ext);
        expect(filePath).toMatch(new RegExp(`${ext}$`));
      });
    });
  });

  describe('storeFile', () => {
    it('should store a file and return file info', async () => {
      const fileBuffer = Buffer.from('test file content');
      const originalName = 'test.jpg';
      const mimeType = 'image/jpeg';

      const result = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );

      expect(result).toBeDefined();
      expect(result.fileId).toBeDefined();
      expect(result.originalName).toBe(originalName);
      expect(result.fileSize).toBe(fileBuffer.length);
      expect(result.mimeType).toBe(mimeType);
      expect(result.uploadedAt).toBeDefined();
      expect(fs.existsSync(result.filePath)).toBe(true);
    });

    it('should preserve file extension', async () => {
      const fileBuffer = Buffer.from('test content');
      const originalName = 'document.pdf';
      const mimeType = 'application/pdf';

      const result = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );

      expect(result.fileName).toContain('.pdf');
    });

    it('should store file with correct content', async () => {
      const fileContent = 'test file content for verification';
      const fileBuffer = Buffer.from(fileContent);
      const originalName = 'test.txt';
      const mimeType = 'text/plain';

      const result = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );

      const storedContent = fs.readFileSync(result.filePath, 'utf-8');
      expect(storedContent).toBe(fileContent);
    });

    it('should handle large files', async () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      largeBuffer.fill('x');
      const originalName = 'large-file.bin';
      const mimeType = 'application/octet-stream';

      const result = await service.storeFile(
        largeBuffer,
        originalName,
        mimeType,
      );

      expect(result.fileSize).toBe(5 * 1024 * 1024);
      expect(fs.existsSync(result.filePath)).toBe(true);
    });

    it('should generate unique file IDs for different files', async () => {
      const buffer1 = Buffer.from('content1');
      const buffer2 = Buffer.from('content2');

      const result1 = await service.storeFile(buffer1, 'file1.txt', 'text/plain');
      const result2 = await service.storeFile(buffer2, 'file2.txt', 'text/plain');

      expect(result1.fileId).not.toEqual(result2.fileId);
    });
  });

  describe('getFile', () => {
    it('should retrieve stored file information', async () => {
      const fileBuffer = Buffer.from('test content');
      const originalName = 'test.jpg';
      const mimeType = 'image/jpeg';

      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );
      const retrieved = await service.getFile(stored.fileId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.fileId).toBe(stored.fileId);
      expect(retrieved?.fileSize).toBe(fileBuffer.length);
    });

    it('should return null for non-existent file', async () => {
      const result = await service.getFile('non-existent-file-id');

      expect(result).toBeNull();
    });

    it('should preserve original file name in retrieval', async () => {
      const fileBuffer = Buffer.from('test');
      const originalName = 'my-document.pdf';
      const mimeType = 'application/pdf';

      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );
      const retrieved = await service.getFile(stored.fileId);

      expect(retrieved?.originalName).toBe(stored.originalName);
    });
  });

  describe('getFileStream', () => {
    it('should return readable stream for stored file', async () => {
      const fileBuffer = Buffer.from('test stream content');
      const originalName = 'test.txt';
      const mimeType = 'text/plain';

      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );
      const stream = await service.getFileStream(stored.fileId);

      expect(stream).toBeDefined();
      expect(stream?.readable).toBe(true);
    });

    it('should return null for non-existent file', async () => {
      const stream = await service.getFileStream('non-existent-id');

      expect(stream).toBeNull();
    });

    it('should stream correct file content', async () => {
      const fileContent = 'test stream content for verification';
      const fileBuffer = Buffer.from(fileContent);
      const originalName = 'test.txt';
      const mimeType = 'text/plain';

      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );

      // Small delay to ensure file is written
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stream = await service.getFileStream(stored.fileId);

      expect(stream).toBeDefined();

      // Read stream content
      let streamedContent = '';
      await new Promise<void>((resolve, reject) => {
        if (!stream) {
          reject(new Error('Stream is null'));
          return;
        }

        stream.on('data', (chunk) => {
          streamedContent += chunk.toString();
        });
        stream.on('end', () => {
          resolve();
        });
        stream.on('error', reject);
      });

      expect(streamedContent).toBe(fileContent);
    });
  });

  describe('deleteFile', () => {
    it('should delete stored file', async () => {
      const fileBuffer = Buffer.from('test content');
      const originalName = 'test.jpg';
      const mimeType = 'image/jpeg';

      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );
      const filePath = stored.filePath;

      expect(fs.existsSync(filePath)).toBe(true);

      const result = await service.deleteFile(stored.fileId);

      expect(result).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const result = await service.deleteFile('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle multiple file deletions', async () => {
      const buffer1 = Buffer.from('content1');
      const buffer2 = Buffer.from('content2');

      const stored1 = await service.storeFile(buffer1, 'file1.txt', 'text/plain');
      const stored2 = await service.storeFile(buffer2, 'file2.txt', 'text/plain');

      const result1 = await service.deleteFile(stored1.fileId);
      const result2 = await service.deleteFile(stored2.fileId);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(fs.existsSync(stored1.filePath)).toBe(false);
      expect(fs.existsSync(stored2.filePath)).toBe(false);
    });
  });

  describe('cleanupOldFiles', () => {
    it('should delete files older than specified age', async () => {
      const fileBuffer = Buffer.from('old file');
      const originalName = 'old.txt';
      const mimeType = 'text/plain';

      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );

      // Modify file modification time to be old
      const oldTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      fs.utimesSync(stored.filePath, oldTime / 1000, oldTime / 1000);

      const deletedCount = await service.cleanupOldFiles(60 * 60 * 1000); // 1 hour

      expect(deletedCount).toBeGreaterThan(0);
      expect(fs.existsSync(stored.filePath)).toBe(false);
    });

    it('should not delete recent files', async () => {
      const fileBuffer = Buffer.from('recent file');
      const originalName = 'recent.txt';
      const mimeType = 'text/plain';

      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );

      const deletedCount = await service.cleanupOldFiles(60 * 60 * 1000); // 1 hour

      expect(fs.existsSync(stored.filePath)).toBe(true);
    });

    it('should return count of deleted files', async () => {
      const buffer1 = Buffer.from('old1');
      const buffer2 = Buffer.from('old2');

      const stored1 = await service.storeFile(buffer1, 'old1.txt', 'text/plain');
      const stored2 = await service.storeFile(buffer2, 'old2.txt', 'text/plain');

      // Make both files old
      const oldTime = Date.now() - 2 * 60 * 60 * 1000;
      fs.utimesSync(stored1.filePath, oldTime / 1000, oldTime / 1000);
      fs.utimesSync(stored2.filePath, oldTime / 1000, oldTime / 1000);

      const deletedCount = await service.cleanupOldFiles(60 * 60 * 1000);

      expect(deletedCount).toBe(2);
    });
  });

  describe('getUploadDir', () => {
    it('should return the upload directory path', () => {
      const uploadDir = service.getUploadDir();

      expect(uploadDir).toBe(testUploadDir);
    });
  });

  describe('File storage round-trip consistency', () => {
    it('should preserve file content through store and retrieve cycle', async () => {
      const originalContent = 'This is test content for round-trip verification';
      const fileBuffer = Buffer.from(originalContent);
      const originalName = 'roundtrip.txt';
      const mimeType = 'text/plain';

      // Store file
      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );

      // Retrieve file
      const retrieved = await service.getFile(stored.fileId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.fileSize).toBe(fileBuffer.length);

      // Verify content
      const retrievedContent = fs.readFileSync(retrieved!.filePath, 'utf-8');
      expect(retrievedContent).toBe(originalContent);
    });

    it('should maintain metadata consistency', async () => {
      const fileBuffer = Buffer.from('metadata test');
      const originalName = 'metadata-test.jpg';
      const mimeType = 'image/jpeg';

      const stored = await service.storeFile(
        fileBuffer,
        originalName,
        mimeType,
      );
      const retrieved = await service.getFile(stored.fileId);

      expect(retrieved?.fileId).toBe(stored.fileId);
      expect(retrieved?.fileSize).toBe(stored.fileSize);
      expect(retrieved?.originalName).toBe(stored.originalName);
    });
  });
});
