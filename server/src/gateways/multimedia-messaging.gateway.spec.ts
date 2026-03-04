import { Test, TestingModule } from '@nestjs/testing';
import { MessagingGateway } from './messaging.gateway';
import { MessageService } from '../services/message.service';
import { UserService } from '../services/user.service';
import { ValidationService } from '../services/validation.service';
import { MultimediaMessageService } from '../services/multimedia-message.service';
import { FileStorageService } from '../services/file-storage.service';
import { MessageRepository } from '../repositories/message.repository';
import { UserRepository } from '../repositories/user.repository';
import { Socket } from 'socket.io';
import { Server } from 'socket.io';
import { MessageType } from '../types/multimedia.interface';

describe('MessagingGateway - Multimedia Messages', () => {
  let gateway: MessagingGateway;
  let messageService: MessageService;
  let userService: UserService;
  let multimediaMessageService: MultimediaMessageService;
  let fileStorageService: FileStorageService;
  let mockServer: Partial<Server>;

  const createMockSocket = (socketId: string, address: string) => ({
    id: socketId,
    emit: jest.fn(),
    handshake: {
      headers: {},
      address,
    } as any,
  } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        MessageService,
        UserService,
        ValidationService,
        MultimediaMessageService,
        FileStorageService,
        MessageRepository,
        UserRepository,
      ],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);
    messageService = module.get<MessageService>(MessageService);
    userService = module.get<UserService>(UserService);
    multimediaMessageService = module.get<MultimediaMessageService>(
      MultimediaMessageService,
    );
    fileStorageService = module.get<FileStorageService>(FileStorageService);

    // Setup mock server
    mockServer = {
      emit: jest.fn(),
      sockets: {
        sockets: new Map(),
      } as any,
    } as any;

    gateway['server'] = mockServer as Server;
  });

  describe('sendMultimediaMessage handler', () => {
    it('should successfully send a multimedia message', async () => {
      // Register users
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      // Mock file storage
      const mockFileInfo = {
        fileId: 'file-123',
        originalName: 'test-image.jpg',
        fileName: 'test-image.jpg',
        filePath: '/uploads/file-123.jpg',
        fileSize: 102400,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '192.168.1.2',
          fileId: 'file-123',
        },
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message?.fileId).toBe('file-123');
      expect(result.message?.fileName).toBe('test-image.jpg');
      expect(testSocket.emit).toHaveBeenCalledWith(
        'multimediaMessageSent',
        expect.any(Object),
      );
    });

    it('should return error when target user is offline', async () => {
      // Register only sender
      userService.registerUser('socket-1', '192.168.1.1');

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '192.168.1.2',
          fileId: 'file-123',
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('目标用户不在线');
      expect(testSocket.emit).toHaveBeenCalledWith(
        'multimediaMessageError',
        expect.objectContaining({
          code: 'USER_OFFLINE',
        }),
      );
    });

    it('should return error when file ID is invalid', async () => {
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '192.168.1.2',
          fileId: '', // Invalid file ID
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file ID');
      expect(testSocket.emit).toHaveBeenCalledWith(
        'multimediaMessageError',
        expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      );
    });

    it('should return error when target IP is invalid', async () => {
      userService.registerUser('socket-1', '192.168.1.1');

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '', // Invalid target IP
          fileId: 'file-123',
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid target IP');
      expect(testSocket.emit).toHaveBeenCalledWith(
        'multimediaMessageError',
        expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      );
    });

    it('should broadcast multimedia message to all connected users', async () => {
      // Register users
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      // Mock file storage
      const mockFileInfo = {
        fileId: 'file-123',
        originalName: 'test-video.mp4',
        fileName: 'test-video.mp4',
        filePath: '/uploads/file-123.mp4',
        fileSize: 5242880,
        mimeType: 'video/mp4',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      await gateway.handleSendMultimediaMessage(testSocket as Socket, {
        targetIP: '192.168.1.2',
        fileId: 'file-123',
      });

      // Verify broadcast was called
      expect(mockServer.emit).toHaveBeenCalledWith(
        'newMultimediaMessage',
        expect.objectContaining({
          fileId: 'file-123',
          fileName: 'test-video.mp4',
          type: MessageType.VIDEO,
        }),
      );
    });

    it('should include multimedia messages in message history', async () => {
      // Register users
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      // Mock file storage
      const mockFileInfo = {
        fileId: 'file-123',
        originalName: 'test-image.jpg',
        fileName: 'test-image.jpg',
        filePath: '/uploads/file-123.jpg',
        fileSize: 102400,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      // Send multimedia message
      await gateway.handleSendMultimediaMessage(testSocket as Socket, {
        targetIP: '192.168.1.2',
        fileId: 'file-123',
      });

      // Get message history
      const history = messageService.getConversation(
        '192.168.1.1',
        '192.168.1.2',
      );

      expect(history.length).toBeGreaterThan(0);
      const multimediaMsg = history.find((msg: any) => msg.fileId === 'file-123');
      expect(multimediaMsg).toBeDefined();
      if (multimediaMsg) {
        expect((multimediaMsg as any).fileName).toBe('test-image.jpg');
        expect((multimediaMsg as any).downloadUrl).toBe('/files/file-123');
      }
    });

    it('should handle multimedia message with image file type', async () => {
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      const mockFileInfo = {
        fileId: 'file-img',
        originalName: 'photo.png',
        fileName: 'photo.png',
        filePath: '/uploads/file-img.png',
        fileSize: 204800,
        mimeType: 'image/png',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '192.168.1.2',
          fileId: 'file-img',
        },
      );

      expect(result.success).toBe(true);
      expect(result.message?.type).toBe(MessageType.IMAGE);
      expect(result.message?.fileName).toBe('photo.png');
    });

    it('should handle multimedia message with video file type', async () => {
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      const mockFileInfo = {
        fileId: 'file-vid',
        originalName: 'movie.mov',
        fileName: 'movie.mov',
        filePath: '/uploads/file-vid.mov',
        fileSize: 10485760,
        mimeType: 'video/quicktime',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '192.168.1.2',
          fileId: 'file-vid',
        },
      );

      expect(result.success).toBe(true);
      expect(result.message?.type).toBe(MessageType.VIDEO);
      expect(result.message?.fileName).toBe('movie.mov');
    });

    it('should return error when file not found', async () => {
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      jest.spyOn(fileStorageService, 'getFile').mockResolvedValue(null);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '192.168.1.2',
          fileId: 'nonexistent-file',
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('文件未找到');
      expect(testSocket.emit).toHaveBeenCalledWith(
        'multimediaMessageError',
        expect.objectContaining({
          code: 'FILE_NOT_FOUND',
        }),
      );
    });

    it('should maintain message status as sent', async () => {
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      const mockFileInfo = {
        fileId: 'file-123',
        originalName: 'test.jpg',
        fileName: 'test.jpg',
        filePath: '/uploads/file-123.jpg',
        fileSize: 102400,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '192.168.1.2',
          fileId: 'file-123',
        },
      );

      expect(result.message?.status).toBe('sent');
    });

    it('should generate correct download URL for multimedia message', async () => {
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      const mockFileInfo = {
        fileId: 'unique-file-id-456',
        originalName: 'document.pdf',
        fileName: 'document.pdf',
        filePath: '/uploads/unique-file-id-456.pdf',
        fileSize: 512000,
        mimeType: 'application/pdf',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      const result = await gateway.handleSendMultimediaMessage(
        testSocket as Socket,
        {
          targetIP: '192.168.1.2',
          fileId: 'unique-file-id-456',
        },
      );

      expect(result.message?.downloadUrl).toBe('/files/unique-file-id-456');
    });
  });

  describe('Message history with multimedia messages', () => {
    it('should include multimedia messages when getting user message history', async () => {
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      const mockFileInfo = {
        fileId: 'file-123',
        originalName: 'test.jpg',
        fileName: 'test.jpg',
        filePath: '/uploads/file-123.jpg',
        fileSize: 102400,
        mimeType: 'image/jpeg',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      // Send multimedia message
      await gateway.handleSendMultimediaMessage(testSocket as Socket, {
        targetIP: '192.168.1.2',
        fileId: 'file-123',
      });

      // Get all user messages
      const history = messageService.getUserMessageHistory('192.168.1.1');

      expect(history.length).toBeGreaterThan(0);
      const multimediaMsg = history.find((msg: any) => msg.fileId);
      expect(multimediaMsg).toBeDefined();
    });

    it('should include multimedia messages in conversation history', async () => {
      userService.registerUser('socket-1', '192.168.1.1');
      userService.registerUser('socket-2', '192.168.1.2');

      const mockFileInfo = {
        fileId: 'file-conv',
        originalName: 'shared.mp4',
        fileName: 'shared.mp4',
        filePath: '/uploads/file-conv.mp4',
        fileSize: 5242880,
        mimeType: 'video/mp4',
        uploadedAt: Date.now(),
      };

      jest
        .spyOn(fileStorageService, 'getFile')
        .mockResolvedValue(mockFileInfo);

      const testSocket = createMockSocket('socket-1', '192.168.1.1');

      // Send multimedia message
      await gateway.handleSendMultimediaMessage(testSocket as Socket, {
        targetIP: '192.168.1.2',
        fileId: 'file-conv',
      });

      // Get conversation history
      const conversation = messageService.getConversation(
        '192.168.1.1',
        '192.168.1.2',
      );

      expect(conversation.length).toBeGreaterThan(0);
      const multimediaMsg = conversation.find((msg: any) => msg.fileId);
      expect(multimediaMsg).toBeDefined();
      expect(multimediaMsg?.receiverIP).toBe('192.168.1.2');
    });
  });
});
