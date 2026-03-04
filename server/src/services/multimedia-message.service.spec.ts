import { Test, TestingModule } from '@nestjs/testing';
import { MultimediaMessageService } from './multimedia-message.service';
import { MessageRepository } from '../repositories/message.repository';
import { FileStorageService } from './file-storage.service';
import {
  MessageType,
  StoredFileInfo,
  SendMultimediaMessageDto,
} from '../types/multimedia.interface';

describe('MultimediaMessageService', () => {
  let service: MultimediaMessageService;
  let messageRepository: MessageRepository;
  let fileStorageService: FileStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultimediaMessageService,
        MessageRepository,
        FileStorageService,
      ],
    }).compile();

    service = module.get<MultimediaMessageService>(MultimediaMessageService);
    messageRepository = module.get<MessageRepository>(MessageRepository);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
  });

  afterEach(() => {
    messageRepository.clear();
  });

  describe('createMultimediaMessage', () => {
    it('should create an image message with correct properties', () => {
      const senderIP = '192.168.1.1';
      const receiverIP = '192.168.1.2';
      const fileInfo: StoredFileInfo = {
        fileId: 'test-file-id',
        originalName: 'test.jpg',
        fileName: 'test-file-id.jpg',
        filePath: '/uploads/test-file-id.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const message = service.createMultimediaMessage(
        senderIP,
        receiverIP,
        fileInfo,
      );

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.senderIP).toBe(senderIP);
      expect(message.receiverIP).toBe(receiverIP);
      expect(message.type).toBe(MessageType.IMAGE);
      expect(message.fileId).toBe(fileInfo.fileId);
      expect(message.fileName).toBe(fileInfo.originalName);
      expect(message.fileSize).toBe(fileInfo.fileSize);
      expect(message.status).toBe('sent');
      expect(message.timestamp).toBeDefined();
    });

    it('should create a video message with correct properties', () => {
      const senderIP = '192.168.1.1';
      const receiverIP = '192.168.1.2';
      const fileInfo: StoredFileInfo = {
        fileId: 'test-video-id',
        originalName: 'test.mp4',
        fileName: 'test-video-id.mp4',
        filePath: '/uploads/test-video-id.mp4',
        fileSize: 5242880,
        mimeType: 'video/mp4',
        uploadedAt: Date.now(),
      };

      const message = service.createMultimediaMessage(
        senderIP,
        receiverIP,
        fileInfo,
      );

      expect(message.type).toBe(MessageType.VIDEO);
      expect(message.fileSize).toBe(5242880);
    });

    it('should save message to repository', () => {
      const senderIP = '192.168.1.1';
      const receiverIP = '192.168.1.2';
      const fileInfo: StoredFileInfo = {
        fileId: 'test-file-id',
        originalName: 'test.jpg',
        fileName: 'test-file-id.jpg',
        filePath: '/uploads/test-file-id.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const message = service.createMultimediaMessage(
        senderIP,
        receiverIP,
        fileInfo,
      );

      const allMessages = messageRepository.findAll();
      expect(allMessages.length).toBeGreaterThan(0);
      expect(allMessages.some((msg) => msg.id === message.id)).toBe(true);
    });

    it('should generate correct download URL', () => {
      const senderIP = '192.168.1.1';
      const receiverIP = '192.168.1.2';
      const fileInfo: StoredFileInfo = {
        fileId: 'test-file-id',
        originalName: 'test.jpg',
        fileName: 'test-file-id.jpg',
        filePath: '/uploads/test-file-id.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const message = service.createMultimediaMessage(
        senderIP,
        receiverIP,
        fileInfo,
      );

      expect(message.downloadUrl).toBe('/files/test-file-id');
    });
  });

  describe('getMultimediaMessage', () => {
    it('should retrieve a multimedia message by ID', () => {
      const senderIP = '192.168.1.1';
      const receiverIP = '192.168.1.2';
      const fileInfo: StoredFileInfo = {
        fileId: 'test-file-id',
        originalName: 'test.jpg',
        fileName: 'test-file-id.jpg',
        filePath: '/uploads/test-file-id.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const createdMessage = service.createMultimediaMessage(
        senderIP,
        receiverIP,
        fileInfo,
      );

      const retrievedMessage = service.getMultimediaMessage(createdMessage.id);

      expect(retrievedMessage).toEqual(createdMessage);
    });

    it('should return null for non-existent message ID', () => {
      const message = service.getMultimediaMessage('non-existent-id');
      expect(message).toBeNull();
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate correct download URL format', () => {
      const fileId = 'test-file-id-123';
      const url = service.generateDownloadUrl(fileId);
      expect(url).toBe('/files/test-file-id-123');
    });

    it('should handle various file IDs', () => {
      const fileIds = [
        'simple-id',
        'id-with-dashes',
        'id_with_underscores',
        '12345',
      ];

      fileIds.forEach((fileId) => {
        const url = service.generateDownloadUrl(fileId);
        expect(url).toBe(`/files/${fileId}`);
      });
    });
  });

  describe('validateMultimediaMessageRequest', () => {
    it('should validate correct request', () => {
      const dto: SendMultimediaMessageDto = {
        targetIP: '192.168.1.2',
        fileId: 'test-file-id',
      };

      const result = service.validateMultimediaMessageRequest(dto);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject request with missing target IP', () => {
      const dto: SendMultimediaMessageDto = {
        targetIP: '',
        fileId: 'test-file-id',
      };

      const result = service.validateMultimediaMessageRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject request with missing file ID', () => {
      const dto: SendMultimediaMessageDto = {
        targetIP: '192.168.1.2',
        fileId: '',
      };

      const result = service.validateMultimediaMessageRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject request with invalid target IP type', () => {
      const dto = {
        targetIP: null,
        fileId: 'test-file-id',
      } as any;

      const result = service.validateMultimediaMessageRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject request with invalid file ID type', () => {
      const dto = {
        targetIP: '192.168.1.2',
        fileId: 123,
      } as any;

      const result = service.validateMultimediaMessageRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getRecentMultimediaMessages', () => {
    it('should retrieve recent multimedia messages for a user', () => {
      const userIP = '192.168.1.1';
      const otherIP = '192.168.1.2';

      // Create multiple messages
      const fileInfo1: StoredFileInfo = {
        fileId: 'file-1',
        originalName: 'test1.jpg',
        fileName: 'file-1.jpg',
        filePath: '/uploads/file-1.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const fileInfo2: StoredFileInfo = {
        fileId: 'file-2',
        originalName: 'test2.mp4',
        fileName: 'file-2.mp4',
        filePath: '/uploads/file-2.mp4',
        fileSize: 5242880,
        mimeType: 'video/mp4',
        uploadedAt: Date.now(),
      };

      service.createMultimediaMessage(userIP, otherIP, fileInfo1);
      service.createMultimediaMessage(userIP, otherIP, fileInfo2);

      const messages = service.getRecentMultimediaMessages(userIP, 10);

      expect(messages.length).toBe(2);
      expect(messages[0].fileId).toBe('file-1');
      expect(messages[1].fileId).toBe('file-2');
    });

    it('should respect limit parameter', () => {
      const userIP = '192.168.1.1';
      const otherIP = '192.168.1.2';

      // Create multiple messages
      for (let i = 0; i < 5; i++) {
        const fileInfo: StoredFileInfo = {
          fileId: `file-${i}`,
          originalName: `test${i}.jpg`,
          fileName: `file-${i}.jpg`,
          filePath: `/uploads/file-${i}.jpg`,
          fileSize: 1024,
          mimeType: 'image/jpeg',
          uploadedAt: Date.now(),
        };
        service.createMultimediaMessage(userIP, otherIP, fileInfo);
      }

      const messages = service.getRecentMultimediaMessages(userIP, 3);

      expect(messages.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getConversationMultimediaMessages', () => {
    it('should retrieve multimedia messages in a conversation', () => {
      const userIP1 = '192.168.1.1';
      const userIP2 = '192.168.1.2';

      const fileInfo1: StoredFileInfo = {
        fileId: 'file-1',
        originalName: 'test1.jpg',
        fileName: 'file-1.jpg',
        filePath: '/uploads/file-1.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const fileInfo2: StoredFileInfo = {
        fileId: 'file-2',
        originalName: 'test2.jpg',
        fileName: 'file-2.jpg',
        filePath: '/uploads/file-2.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      service.createMultimediaMessage(userIP1, userIP2, fileInfo1);
      service.createMultimediaMessage(userIP2, userIP1, fileInfo2);

      const messages = service.getConversationMultimediaMessages(
        userIP1,
        userIP2,
        10,
      );

      expect(messages.length).toBe(2);
    });

    it('should not include messages from other conversations', () => {
      const userIP1 = '192.168.1.1';
      const userIP2 = '192.168.1.2';
      const userIP3 = '192.168.1.3';

      const fileInfo1: StoredFileInfo = {
        fileId: 'file-1',
        originalName: 'test1.jpg',
        fileName: 'file-1.jpg',
        filePath: '/uploads/file-1.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      const fileInfo2: StoredFileInfo = {
        fileId: 'file-2',
        originalName: 'test2.jpg',
        fileName: 'file-2.jpg',
        filePath: '/uploads/file-2.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      service.createMultimediaMessage(userIP1, userIP2, fileInfo1);
      service.createMultimediaMessage(userIP1, userIP3, fileInfo2);

      const messages = service.getConversationMultimediaMessages(
        userIP1,
        userIP2,
        10,
      );

      expect(messages.length).toBe(1);
      expect(messages[0].fileId).toBe('file-1');
    });
  });
});
