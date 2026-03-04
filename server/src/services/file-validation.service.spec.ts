import { Test, TestingModule } from '@nestjs/testing';
import { FileValidationService } from './file-validation.service';
import { DEFAULT_FILE_CONFIG } from '../types/multimedia.interface';
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

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileValidationService],
    }).compile();

    service = module.get<FileValidationService>(FileValidationService);
  });

  describe('validateFile', () => {
    it('should validate a valid image file', () => {
      const file = createMockFile({
        originalname: 'test.jpg',
        size: 1024 * 1024, // 1MB
      });

      const result = service.validateFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a valid video file', () => {
      const file = createMockFile({
        originalname: 'video.mp4',
        size: 5 * 1024 * 1024, // 5MB
      });

      const result = service.validateFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject unsupported file format', () => {
      const file = createMockFile({
        originalname: 'document.pdf',
        size: 1024 * 1024,
      });

      const result = service.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('should reject file exceeding size limit', () => {
      const file = createMockFile({
        originalname: 'large.mp4',
        size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
      });

      const result = service.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject file with no extension', () => {
      const file = createMockFile({
        originalname: 'noextension',
        size: 1024 * 1024,
      });

      const result = service.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });
  });

  describe('validateFileExtension', () => {
    describe('supported image formats', () => {
      it('should accept JPG files', () => {
        const result = service.validateFileExtension('photo.jpg');
        expect(result.isValid).toBe(true);
      });

      it('should accept JPEG files', () => {
        const result = service.validateFileExtension('photo.jpeg');
        expect(result.isValid).toBe(true);
      });

      it('should accept PNG files', () => {
        const result = service.validateFileExtension('image.png');
        expect(result.isValid).toBe(true);
      });

      it('should accept GIF files', () => {
        const result = service.validateFileExtension('animation.gif');
        expect(result.isValid).toBe(true);
      });

      it('should accept uppercase extensions', () => {
        const result = service.validateFileExtension('photo.JPG');
        expect(result.isValid).toBe(true);
      });

      it('should accept mixed case extensions', () => {
        const result = service.validateFileExtension('photo.JpG');
        expect(result.isValid).toBe(true);
      });
    });

    describe('supported video formats', () => {
      it('should accept MP4 files', () => {
        const result = service.validateFileExtension('video.mp4');
        expect(result.isValid).toBe(true);
      });

      it('should accept MOV files', () => {
        const result = service.validateFileExtension('video.mov');
        expect(result.isValid).toBe(true);
      });
    });

    describe('unsupported formats', () => {
      it('should reject TXT files', () => {
        const result = service.validateFileExtension('document.txt');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Unsupported file format');
      });

      it('should reject PDF files', () => {
        const result = service.validateFileExtension('document.pdf');
        expect(result.isValid).toBe(false);
      });

      it('should reject EXE files', () => {
        const result = service.validateFileExtension('program.exe');
        expect(result.isValid).toBe(false);
      });

      it('should reject files with no extension', () => {
        const result = service.validateFileExtension('noextension');
        expect(result.isValid).toBe(false);
      });

      it('should include supported formats in error details', () => {
        const result = service.validateFileExtension('file.xyz');
        expect(result.details?.supportedFormats).toContain('jpg');
        expect(result.details?.supportedFormats).toContain('png');
        expect(result.details?.supportedFormats).toContain('mp4');
      });
    });
  });

  describe('validateFileSize', () => {
    it('should accept file at 1MB', () => {
      const result = service.validateFileSize(1 * 1024 * 1024);
      expect(result.isValid).toBe(true);
    });

    it('should accept file at 5MB', () => {
      const result = service.validateFileSize(5 * 1024 * 1024);
      expect(result.isValid).toBe(true);
    });

    it('should accept file at exactly 10MB limit', () => {
      const result = service.validateFileSize(10 * 1024 * 1024);
      expect(result.isValid).toBe(true);
    });

    it('should reject file at 10.1MB', () => {
      const result = service.validateFileSize(10.1 * 1024 * 1024);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject file at 11MB', () => {
      const result = service.validateFileSize(11 * 1024 * 1024);
      expect(result.isValid).toBe(false);
    });

    it('should reject file at 100MB', () => {
      const result = service.validateFileSize(100 * 1024 * 1024);
      expect(result.isValid).toBe(false);
    });

    it('should accept very small file (1 byte)', () => {
      const result = service.validateFileSize(1);
      expect(result.isValid).toBe(true);
    });

    it('should include max size in error details', () => {
      const result = service.validateFileSize(11 * 1024 * 1024);
      expect(result.details?.maxSize).toBe(10 * 1024 * 1024);
    });

    it('should include actual file size in error details', () => {
      const fileSize = 11 * 1024 * 1024;
      const result = service.validateFileSize(fileSize);
      expect(result.details?.fileSize).toBe(fileSize);
    });
  });

  describe('getFileType', () => {
    it('should identify JPG as image', () => {
      expect(service.getFileType('photo.jpg')).toBe('image');
    });

    it('should identify PNG as image', () => {
      expect(service.getFileType('image.png')).toBe('image');
    });

    it('should identify GIF as image', () => {
      expect(service.getFileType('animation.gif')).toBe('image');
    });

    it('should identify MP4 as video', () => {
      expect(service.getFileType('video.mp4')).toBe('video');
    });

    it('should identify MOV as video', () => {
      expect(service.getFileType('video.mov')).toBe('video');
    });

    it('should return unknown for unsupported format', () => {
      expect(service.getFileType('document.pdf')).toBe('unknown');
    });

    it('should be case-insensitive', () => {
      expect(service.getFileType('photo.JPG')).toBe('image');
      expect(service.getFileType('video.MP4')).toBe('video');
    });
  });

  describe('isImageFile', () => {
    it('should return true for image files', () => {
      expect(service.isImageFile('photo.jpg')).toBe(true);
      expect(service.isImageFile('image.png')).toBe(true);
      expect(service.isImageFile('animation.gif')).toBe(true);
    });

    it('should return false for video files', () => {
      expect(service.isImageFile('video.mp4')).toBe(false);
      expect(service.isImageFile('video.mov')).toBe(false);
    });

    it('should return false for unsupported files', () => {
      expect(service.isImageFile('document.pdf')).toBe(false);
    });
  });

  describe('isVideoFile', () => {
    it('should return true for video files', () => {
      expect(service.isVideoFile('video.mp4')).toBe(true);
      expect(service.isVideoFile('video.mov')).toBe(true);
    });

    it('should return false for image files', () => {
      expect(service.isVideoFile('photo.jpg')).toBe(false);
      expect(service.isVideoFile('image.png')).toBe(false);
    });

    it('should return false for unsupported files', () => {
      expect(service.isVideoFile('document.pdf')).toBe(false);
    });
  });

  describe('error message generation', () => {
    it('should generate clear error message for unsupported format', () => {
      const result = service.validateFileExtension('file.xyz');
      expect(result.error).toContain('Unsupported file format');
      expect(result.error).toContain('xyz');
      expect(result.error).toContain('Supported formats');
    });

    it('should generate clear error message for file too large', () => {
      const result = service.validateFileSize(15 * 1024 * 1024);
      expect(result.error).toContain('exceeds maximum allowed size');
      expect(result.error).toContain('10MB');
    });

    it('should include file size in MB in error message', () => {
      const result = service.validateFileSize(11 * 1024 * 1024);
      expect(result.error).toMatch(/\d+\.\d+MB/);
    });
  });

  describe('edge cases', () => {
    it('should handle filename with multiple dots', () => {
      const result = service.validateFileExtension('my.photo.backup.jpg');
      expect(result.isValid).toBe(true);
    });

    it('should handle filename with spaces', () => {
      const result = service.validateFileExtension('my photo.jpg');
      expect(result.isValid).toBe(true);
    });

    it('should handle filename with special characters', () => {
      const result = service.validateFileExtension('photo-2024_01.jpg');
      expect(result.isValid).toBe(true);
    });

    it('should handle zero byte file', () => {
      const result = service.validateFileSize(0);
      expect(result.isValid).toBe(true);
    });

    it('should handle exactly 10MB file', () => {
      const result = service.validateFileSize(10 * 1024 * 1024);
      expect(result.isValid).toBe(true);
    });
  });
});
