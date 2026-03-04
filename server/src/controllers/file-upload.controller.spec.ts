import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { FileUploadController } from './file-upload.controller';
import { FileValidationService } from '../services/file-validation.service';
import { FileStorageService } from '../services/file-storage.service';
import { StoredFileInfo } from '../types/multimedia.interface';
import { Readable } from 'stream';

// Helper to create mock multer file
function createMockFile(overrides?: Partial<Express.Multer.File>): Express.Multer.File {
  const mockStream = new Readable();
  return {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    destination: './uploads',
    filename: 'test.jpg',
    path: './uploads/test.jpg',
    buffer: Buffer.from('test'),
    stream: mockStream,
    ...overrides,
  };
}

describe('FileUploadController', () => {
  let controller: FileUploadController;
  let fileValidationService: FileValidationService;
  let fileStorageService: FileStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileUploadController],
      providers: [
        {
          provide: FileValidationService,
          useValue: {
            validateFile: jest.fn(),
            getFileType: jest.fn(),
          },
        },
        {
          provide: FileStorageService,
          useValue: {
            storeFile: jest.fn(),
            storeFileFromPath: jest.fn(),
            getFile: jest.fn(),
            getFileStream: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FileUploadController>(FileUploadController);
    fileValidationService = module.get<FileValidationService>(FileValidationService);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
  });

  describe('uploadFile', () => {
    it('should successfully upload a valid image file', async () => {
      const mockFile = createMockFile({
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      });

      const mockStoredFileInfo: StoredFileInfo = {
        fileId: 'test-id-123',
        originalName: 'test.jpg',
        fileName: 'test-id-123.jpg',
        filePath: './uploads/test-id-123.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest.spyOn(fileValidationService, 'validateFile').mockReturnValue({
        isValid: true,
      });
      jest.spyOn(fileStorageService, 'storeFileFromPath').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileValidationService, 'getFileType').mockReturnValue('image');

      const result = await controller.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe('test-id-123');
      expect(result.fileName).toBe('test.jpg');
      expect(result.fileSize).toBe(1024);
      expect(result.fileType).toBe('image');
    });

    it('should successfully upload a valid video file', async () => {
      const mockFile = createMockFile({
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
        size: 5242880,
      });

      const mockStoredFileInfo: StoredFileInfo = {
        fileId: 'test-id-456',
        originalName: 'test.mp4',
        fileName: 'test-id-456.mp4',
        filePath: './uploads/test-id-456.mp4',
        fileSize: 5242880,
        mimeType: 'video/mp4',
        uploadedAt: Date.now(),
      };

      jest.spyOn(fileValidationService, 'validateFile').mockReturnValue({
        isValid: true,
      });
      jest.spyOn(fileStorageService, 'storeFileFromPath').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileValidationService, 'getFileType').mockReturnValue('video');

      const result = await controller.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe('test-id-456');
      expect(result.fileType).toBe('video');
    });

    it('should reject upload when no file is provided', async () => {
      await expect(controller.uploadFile(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject upload with unsupported file format', async () => {
      const mockFile = createMockFile({
        originalname: 'test.txt',
        mimetype: 'text/plain',
      });

      jest.spyOn(fileValidationService, 'validateFile').mockReturnValue({
        isValid: false,
        error: 'Unsupported file format: txt',
        details: {
          fileName: 'test.txt',
          supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
        },
      });

      await expect(controller.uploadFile(mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should reject upload when file exceeds size limit', async () => {
      const mockFile = createMockFile({
        originalname: 'large.mp4',
        mimetype: 'video/mp4',
        size: 11 * 1024 * 1024, // 11MB, exceeds 10MB limit
      });

      jest.spyOn(fileValidationService, 'validateFile').mockReturnValue({
        isValid: false,
        error: 'File size (10.49MB) exceeds maximum allowed size (10MB)',
        details: {
          fileSize: 11 * 1024 * 1024,
          maxSize: 10 * 1024 * 1024,
        },
      });

      await expect(controller.uploadFile(mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should handle storage errors gracefully', async () => {
      const mockFile = createMockFile();

      jest.spyOn(fileValidationService, 'validateFile').mockReturnValue({
        isValid: true,
      });
      jest.spyOn(fileStorageService, 'storeFile').mockRejectedValue(
        new Error('Storage error'),
      );

      await expect(controller.uploadFile(mockFile)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('downloadFile', () => {
    it('should successfully download an existing file', async () => {
      const fileId = 'test-id-123';
      const mockStoredFileInfo: StoredFileInfo = {
        fileId,
        originalName: 'test.jpg',
        fileName: 'test-id-123.jpg',
        filePath: './uploads/test-id-123.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const mockStream = {
        pipe: jest.fn().mockReturnValue({}),
      } as any;

      jest.spyOn(fileStorageService, 'getFile').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileStorageService, 'getFileStream').mockResolvedValue(mockStream);

      const mockResponse = {
        setHeader: jest.fn(),
      } as any;

      await controller.downloadFile(fileId, mockResponse);

      expect(fileStorageService.getFile).toHaveBeenCalledWith(fileId);
      expect(fileStorageService.getFileStream).toHaveBeenCalledWith(fileId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="test.jpg"',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', 1024);
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('should return 404 when file does not exist', async () => {
      const fileId = 'non-existent-id';

      jest.spyOn(fileStorageService, 'getFile').mockResolvedValue(null);

      const mockResponse = {
        setHeader: jest.fn(),
        pipe: jest.fn(),
      } as any;

      await expect(controller.downloadFile(fileId, mockResponse)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle stream errors gracefully', async () => {
      const fileId = 'test-id-123';
      const mockStoredFileInfo: StoredFileInfo = {
        fileId,
        originalName: 'test.jpg',
        fileName: 'test-id-123.jpg',
        filePath: './uploads/test-id-123.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest.spyOn(fileStorageService, 'getFile').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileStorageService, 'getFileStream').mockResolvedValue(null);

      const mockResponse = {
        setHeader: jest.fn(),
        pipe: jest.fn(),
      } as any;

      await expect(controller.downloadFile(fileId, mockResponse)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle concurrent downloads', async () => {
      const fileId1 = 'test-id-1';
      const fileId2 = 'test-id-2';

      const mockStoredFileInfo1: StoredFileInfo = {
        fileId: fileId1,
        originalName: 'test1.jpg',
        fileName: 'test-id-1.jpg',
        filePath: './uploads/test-id-1.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const mockStoredFileInfo2: StoredFileInfo = {
        fileId: fileId2,
        originalName: 'test2.jpg',
        fileName: 'test-id-2.jpg',
        filePath: './uploads/test-id-2.jpg',
        fileSize: 2048,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const mockStream1 = { pipe: jest.fn() } as any;
      const mockStream2 = { pipe: jest.fn() } as any;

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValueOnce(mockStoredFileInfo1)
        .mockResolvedValueOnce(mockStoredFileInfo2);

      jest
        .spyOn(fileStorageService, 'getFileStream')
        .mockResolvedValueOnce(mockStream1)
        .mockResolvedValueOnce(mockStream2);

      const mockResponse1 = {
        setHeader: jest.fn(),
        pipe: jest.fn(),
      } as any;

      const mockResponse2 = {
        setHeader: jest.fn(),
        pipe: jest.fn(),
      } as any;

      await controller.downloadFile(fileId1, mockResponse1);
      await controller.downloadFile(fileId2, mockResponse2);

      expect(fileStorageService.getFile).toHaveBeenCalledTimes(2);
      expect(fileStorageService.getFileStream).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFileInfo', () => {
    it('should return file information for existing file', async () => {
      const fileId = 'test-id-123';
      const mockStoredFileInfo: StoredFileInfo = {
        fileId,
        originalName: 'test.jpg',
        fileName: 'test-id-123.jpg',
        filePath: './uploads/test-id-123.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest.spyOn(fileStorageService, 'getFile').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileValidationService, 'getFileType').mockReturnValue('image');

      const result = await controller.getFileInfo(fileId);

      expect(result.fileId).toBe(fileId);
      expect(result.fileName).toBe('test.jpg');
      expect(result.fileType).toBe('image');
      expect(result.fileSize).toBe(1024);
      expect(result.uploadedAt).toBe(mockStoredFileInfo.uploadedAt);
    });

    it('should return video file information', async () => {
      const fileId = 'test-id-456';
      const mockStoredFileInfo: StoredFileInfo = {
        fileId,
        originalName: 'test.mp4',
        fileName: 'test-id-456.mp4',
        filePath: './uploads/test-id-456.mp4',
        fileSize: 5242880,
        mimeType: 'video/mp4',
        uploadedAt: Date.now(),
      };

      jest.spyOn(fileStorageService, 'getFile').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileValidationService, 'getFileType').mockReturnValue('video');

      const result = await controller.getFileInfo(fileId);

      expect(result.fileType).toBe('video');
      expect(result.fileSize).toBe(5242880);
    });

    it('should return 404 when file does not exist', async () => {
      const fileId = 'non-existent-id';

      jest.spyOn(fileStorageService, 'getFile').mockResolvedValue(null);

      await expect(controller.getFileInfo(fileId)).rejects.toThrow(NotFoundException);
    });

    it('should handle retrieval errors gracefully', async () => {
      const fileId = 'test-id-123';

      jest.spyOn(fileStorageService, 'getFile').mockRejectedValue(
        new Error('Retrieval error'),
      );

      await expect(controller.getFileInfo(fileId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle files with special characters in filename', async () => {
      const mockFile = createMockFile({
        originalname: 'test-file (1).jpg',
      });

      const mockStoredFileInfo: StoredFileInfo = {
        fileId: 'test-id-789',
        originalName: 'test-file (1).jpg',
        fileName: 'test-id-789.jpg',
        filePath: './uploads/test-id-789.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest.spyOn(fileValidationService, 'validateFile').mockReturnValue({
        isValid: true,
      });
      jest.spyOn(fileStorageService, 'storeFileFromPath').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileValidationService, 'getFileType').mockReturnValue('image');

      const result = await controller.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test-file (1).jpg');
    });

    it('should handle files at exactly 10MB limit', async () => {
      const mockFile = createMockFile({
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
        size: 10 * 1024 * 1024, // Exactly 10MB
      });

      const mockStoredFileInfo: StoredFileInfo = {
        fileId: 'test-id-limit',
        originalName: 'test.mp4',
        fileName: 'test-id-limit.mp4',
        filePath: './uploads/test-id-limit.mp4',
        fileSize: 10 * 1024 * 1024,
        mimeType: 'video/mp4',
        uploadedAt: Date.now(),
      };

      jest.spyOn(fileValidationService, 'validateFile').mockReturnValue({
        isValid: true,
      });
      jest.spyOn(fileStorageService, 'storeFileFromPath').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileValidationService, 'getFileType').mockReturnValue('video');

      const result = await controller.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.fileSize).toBe(10 * 1024 * 1024);
    });

    it('should handle very small files', async () => {
      const mockFile = createMockFile({
        originalname: 'tiny.jpg',
        size: 1, // 1 byte
      });

      const mockStoredFileInfo: StoredFileInfo = {
        fileId: 'test-id-tiny',
        originalName: 'tiny.jpg',
        fileName: 'test-id-tiny.jpg',
        filePath: './uploads/test-id-tiny.jpg',
        fileSize: 1,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest.spyOn(fileValidationService, 'validateFile').mockReturnValue({
        isValid: true,
      });
      jest.spyOn(fileStorageService, 'storeFileFromPath').mockResolvedValue(mockStoredFileInfo);
      jest.spyOn(fileValidationService, 'getFileType').mockReturnValue('image');

      const result = await controller.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.fileSize).toBe(1);
    });
  });
});
