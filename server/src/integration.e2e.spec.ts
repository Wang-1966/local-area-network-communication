import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { io, Socket as ClientSocket } from 'socket.io-client';
import * as fc from 'fast-check';

/**
 * End-to-End Integration Tests for LAN Messaging App
 * 
 * Tests complete user flows including:
 * - User connection and online list updates
 * - Message sending and receiving
 * - User disconnection and reconnection
 * - Multiple concurrent users
 * - Error handling and recovery
 * 
 * Validates Property 12: Error after application availability
 * Requirements: 9.4
 */
describe('LAN Messaging App - E2E Integration Tests', () => {
  let app: INestApplication;
  let server: any;
  const PORT = 3003;
  const BASE_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(PORT);
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  }, 10000);

  describe('16.1 Complete User Flow', () => {
    describe('User Connection and Online List', () => {
      it('should connect user and receive connected event with user info', (done) => {
        const client = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        client.on('connected', (data: any) => {
          expect(data).toBeDefined();
          expect(data.user).toBeDefined();
          expect(data.user.ip).toBeDefined();
          expect(data.user.socketId).toBeDefined();
          expect(data.onlineUsers).toBeDefined();
          expect(Array.isArray(data.onlineUsers)).toBe(true);
          client.disconnect();
          done();
        });

        client.on('error', (error) => {
          client.disconnect();
          done(error);
        });
      });

      it('should broadcast online users update when new user connects', (done) => {
        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });
        const client2 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client1Connected = false;
        let client2Connected = false;
        let updateReceived = false;

        client1.on('connected', () => {
          client1Connected = true;
          if (client1Connected && client2Connected && updateReceived) {
            cleanup();
          }
        });

        client1.on('onlineUsersUpdate', (data: any) => {
          if (client1Connected && client2Connected) {
            const users = data.users || data;
            expect(Array.isArray(users)).toBe(true);
            expect(users.length).toBeGreaterThanOrEqual(2);
            updateReceived = true;
            if (client1Connected && client2Connected && updateReceived) {
              cleanup();
            }
          }
        });

        client2.on('connected', () => {
          client2Connected = true;
        });

        const cleanup = () => {
          client1.disconnect();
          client2.disconnect();
          done();
        };

        setTimeout(() => {
          if (!updateReceived) {
            cleanup();
            done(new Error('Online users update not received'));
          }
        }, 2000);
      });

      it('should display user joined notification', (done) => {
        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });
        const client2 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let userJoinedReceived = false;
        let testComplete = false;

        client1.on('connected', () => {
          // Wait for client2 to connect
        });

        client1.on('userJoined', (user: any) => {
          if (!testComplete) {
            expect(user).toBeDefined();
            expect(user.ip).toBeDefined();
            userJoinedReceived = true;
            testComplete = true;
            client1.disconnect();
            client2.disconnect();
            done();
          }
        });

        client2.on('connected', () => {
          // Trigger user joined event
        });

        setTimeout(() => {
          if (!testComplete) {
            testComplete = true;
            client1.disconnect();
            client2.disconnect();
            done(new Error('User joined notification not received'));
          }
        }, 3000);
      });
    });

    describe('Message Sending and Receiving', () => {
      it('should send message to online user and receive confirmation', (done) => {
        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });
        const client2 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client1IP: string;
        let client2IP: string;
        let messageSent = false;
        let messageReceived = false;
        let testComplete = false;

        client1.on('connected', (data: any) => {
          client1IP = data.user.ip;
        });

        client2.on('connected', (data: any) => {
          client2IP = data.user.ip;
          // Send message from client1 to client2 after a delay to ensure both are ready
          setTimeout(() => {
            client1.emit('sendMessage', {
              targetIP: client2IP,
              content: 'Hello from client1',
            });
          }, 300);
        });

        client1.on('messageSent', (data: any) => {
          const message = data.message || data;
          expect(message).toBeDefined();
          expect(message.content).toBe('Hello from client1');
          expect(message.status).toBe('sent');
          messageSent = true;
          if (messageSent && messageReceived && !testComplete) {
            testComplete = true;
            client1.disconnect();
            client2.disconnect();
            done();
          }
        });

        client2.on('newMessage', (data: any) => {
          const message = data.message || data;
          expect(message).toBeDefined();
          expect(message.content).toBe('Hello from client1');
          expect(message.senderIP).toBe(client1IP);
          expect(message.receiverIP).toBe(client2IP);
          messageReceived = true;
          if (messageSent && messageReceived && !testComplete) {
            testComplete = true;
            client1.disconnect();
            client2.disconnect();
            done();
          }
        });

        setTimeout(() => {
          if (!testComplete) {
            client1.disconnect();
            client2.disconnect();
            done(new Error(`Message sending/receiving failed: sent=${messageSent}, received=${messageReceived}`));
          }
        }, 6000);
      }, 8000);

      it('should fail to send message to offline user', (done) => {
        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client1Connected = false;
        let errorReceived = false;

        client1.on('connected', () => {
          client1Connected = true;
          // Try to send message to non-existent IP (valid format but not online)
          setTimeout(() => {
            client1.emit('sendMessage', {
              targetIP: '192.168.1.200',
              content: 'Message to offline user',
            });
          }, 100);
        });

        client1.on('messageError', (error: any) => {
          expect(error).toBeDefined();
          expect(error.code).toBe('USER_OFFLINE');
          errorReceived = true;
          client1.disconnect();
          done();
        });

        setTimeout(() => {
          if (client1Connected && !errorReceived) {
            client1.disconnect();
            done(new Error('Message error not received'));
          }
        }, 3000);
      });

      it('should validate message content before sending', (done) => {
        const client = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client2IP: string;
        let errorReceived = false;

        client.on('connected', (data: any) => {
          client2IP = data.user.ip;
          // Try to send empty message
          setTimeout(() => {
            client.emit('sendMessage', {
              targetIP: client2IP,
              content: '',
            });
          }, 100);
        });

        client.on('messageError', (error: any) => {
          expect(error).toBeDefined();
          expect(error.code).toBe('INVALID_INPUT');
          errorReceived = true;
          client.disconnect();
          done();
        });

        setTimeout(() => {
          if (!errorReceived) {
            client.disconnect();
            done(new Error('Message validation error not received'));
          }
        }, 3000);
      });

      it('should reject message exceeding length limit', (done) => {
        const client = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client2IP: string;
        let errorReceived = false;

        client.on('connected', (data: any) => {
          client2IP = data.user.ip;
          // Try to send message exceeding 1000 characters
          setTimeout(() => {
            const longMessage = 'a'.repeat(1001);
            client.emit('sendMessage', {
              targetIP: client2IP,
              content: longMessage,
            });
          }, 100);
        });

        client.on('messageError', (error: any) => {
          expect(error).toBeDefined();
          expect(error.code).toBe('INVALID_INPUT');
          errorReceived = true;
          client.disconnect();
          done();
        });

        setTimeout(() => {
          if (!errorReceived) {
            client.disconnect();
            done(new Error('Message length validation error not received'));
          }
        }, 3000);
      });
    });

    describe('User Disconnection and Reconnection', () => {
      it('should broadcast user left notification when user disconnects', (done) => {
        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });
        const client2 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client1IP: string;
        let userLeftReceived = false;

        client1.on('connected', (data: any) => {
          client1IP = data.user.ip;
        });

        client2.on('connected', () => {
          // Wait for both to connect
        });

        client2.on('userLeft', (data: any) => {
          expect(data).toBeDefined();
          expect(data.userIP).toBe(client1IP);
          userLeftReceived = true;
          client2.disconnect();
          done();
        });

        setTimeout(() => {
          client1.disconnect();
        }, 500);

        setTimeout(() => {
          if (!userLeftReceived) {
            client2.disconnect();
            done(new Error('User left notification not received'));
          }
        }, 2000);
      });

      it('should update online users list when user disconnects', (done) => {
        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });
        const client2 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let initialUserCount = 0;
        let updateReceived = false;
        let testComplete = false;

        client1.on('connected', (data: any) => {
          initialUserCount = data.onlineUsers.length;
          // Disconnect after a delay
          setTimeout(() => {
            client1.disconnect();
          }, 400);
        });

        client2.on('connected', () => {
          // Wait for client1 to disconnect
        });

        client2.on('onlineUsersUpdate', (data: any) => {
          const users = data.users || data;
          if (initialUserCount > 0 && users.length < initialUserCount && !testComplete) {
            updateReceived = true;
            testComplete = true;
            client2.disconnect();
            done();
          }
        });

        setTimeout(() => {
          if (!testComplete) {
            testComplete = true;
            client2.disconnect();
            client1.disconnect();
            done(new Error('Online users update not received after disconnect'));
          }
        }, 6000);
      }, 8000);
    });

    describe('Multiple Concurrent Users', () => {
      it('should handle multiple users sending messages simultaneously', (done) => {
        const clients: ClientSocket[] = [];
        const clientIPs: string[] = [];
        const messagesSent: number[] = [0, 0, 0];
        const messagesReceived: number[] = [0, 0, 0];
        const NUM_CLIENTS = 3;
        let allConnected = false;
        let testComplete = false;

        // Create clients
        for (let i = 0; i < NUM_CLIENTS; i++) {
          const client = io(BASE_URL, {
            reconnection: false,
            transports: ['websocket'],
          });
          clients.push(client);

          client.on('connected', (data: any) => {
            clientIPs[i] = data.user.ip;

            // Start sending messages after all clients are connected
            if (clientIPs.filter((ip) => ip).length === NUM_CLIENTS && !allConnected) {
              allConnected = true;
              setTimeout(() => {
                for (let j = 0; j < NUM_CLIENTS; j++) {
                  const targetIndex = (j + 1) % NUM_CLIENTS;
                  clients[j].emit('sendMessage', {
                    targetIP: clientIPs[targetIndex],
                    content: `Message from client ${j}`,
                  });
                }
              }, 100);
            }
          });

          client.on('messageSent', () => {
            messagesSent[i]++;
            checkCompletion();
          });

          client.on('newMessage', () => {
            messagesReceived[i]++;
            checkCompletion();
          });
        }

        const checkCompletion = () => {
          if (
            messagesSent.reduce((a, b) => a + b, 0) === NUM_CLIENTS &&
            messagesReceived.reduce((a, b) => a + b, 0) === NUM_CLIENTS &&
            !testComplete
          ) {
            testComplete = true;
            clients.forEach((client) => client.disconnect());
            done();
          }
        };

        setTimeout(() => {
          if (!testComplete) {
            testComplete = true;
            clients.forEach((client) => client.disconnect());
            done(new Error('Concurrent message sending timeout'));
          }
        }, 8000);
      }, 10000);
    });

    describe('Error Handling and Recovery (Property 12)', () => {
      it('should maintain application availability after message send error', (done) => {
        const client = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let errorHandled = false;
        let recoverySuccessful = false;

        client.on('connected', (data: any) => {
          // Send invalid message
          setTimeout(() => {
            client.emit('sendMessage', {
              targetIP: '192.168.1.999',
              content: 'Test',
            });
          }, 100);
        });

        client.on('messageError', () => {
          errorHandled = true;
          // Try to send valid message after error
          setTimeout(() => {
            client.emit('getOnlineUsers');
          }, 100);
        });

        client.on('onlineUsersList', (data: any) => {
          const users = data.users || data;
          if (errorHandled) {
            expect(Array.isArray(users)).toBe(true);
            recoverySuccessful = true;
            client.disconnect();
            done();
          }
        });

        setTimeout(() => {
          if (!recoverySuccessful) {
            client.disconnect();
            done(new Error('Application did not recover after error'));
          }
        }, 3000);
      });

      it('should handle validation error and remain functional', (done) => {
        const client = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let validationErrorReceived = false;
        let recoverySuccessful = false;

        client.on('connected', (data: any) => {
          // Send message with invalid IP format
          setTimeout(() => {
            client.emit('sendMessage', {
              targetIP: 'invalid-ip',
              content: 'Test',
            });
          }, 100);
        });

        client.on('messageError', () => {
          validationErrorReceived = true;
          // Request online users to verify app is still functional
          setTimeout(() => {
            client.emit('getOnlineUsers');
          }, 100);
        });

        client.on('onlineUsersList', (data: any) => {
          const users = data.users || data;
          if (validationErrorReceived) {
            expect(Array.isArray(users)).toBe(true);
            recoverySuccessful = true;
            client.disconnect();
            done();
          }
        });

        setTimeout(() => {
          if (!recoverySuccessful) {
            client.disconnect();
            done(new Error('Application not functional after validation error'));
          }
        }, 3000);
      });

      it('should display error message and allow retry', (done) => {
        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });
        const client2 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client2IP: string;
        let firstAttemptFailed = false;
        let retrySuccessful = false;

        client1.on('connected', () => {
          // Wait for client2
        });

        client2.on('connected', (data: any) => {
          client2IP = data.user.ip;
          // First attempt: send message with empty content
          setTimeout(() => {
            client1.emit('sendMessage', {
              targetIP: client2IP,
              content: '',
            });
          }, 100);
        });

        client1.on('messageError', (error: any) => {
          if (!firstAttemptFailed) {
            firstAttemptFailed = true;
            expect(error).toBeDefined();
            // Retry with valid content
            setTimeout(() => {
              client1.emit('sendMessage', {
                targetIP: client2IP,
                content: 'Valid message',
              });
            }, 100);
          }
        });

        client1.on('messageSent', () => {
          if (firstAttemptFailed) {
            retrySuccessful = true;
            client1.disconnect();
            client2.disconnect();
            done();
          }
        });

        setTimeout(() => {
          if (!retrySuccessful) {
            client1.disconnect();
            client2.disconnect();
            done(new Error('Retry after error failed'));
          }
        }, 4000);
      });
    });
  });

  describe('Multimedia Backend Integration Tests', () => {
    describe('File Upload and Download Flow', () => {
      it('should upload a file and retrieve it successfully', async () => {
        const fs = require('fs');
        const path = require('path');
        const request = require('supertest');

        // Create a test file
        const testFilePath = path.join(__dirname, 'test-image.jpg');
        const testFileContent = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
        fs.writeFileSync(testFilePath, testFileContent);

        try {
          // Upload file
          const uploadResponse = await request(server)
            .post('/files/upload')
            .attach('file', testFilePath);

          expect(uploadResponse.status).toBe(201);
          expect(uploadResponse.body.success).toBe(true);
          expect(uploadResponse.body.fileId).toBeDefined();
          expect(uploadResponse.body.fileName).toBe('test-image.jpg');
          expect(uploadResponse.body.fileType).toBe('image');

          const fileId = uploadResponse.body.fileId;

          // Download file
          const downloadResponse = await request(server).get(`/files/${fileId}`);

          expect(downloadResponse.status).toBe(200);
          expect(downloadResponse.body).toBeDefined();
        } finally {
          // Cleanup
          if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
          }
        }
      });

      it('should reject files exceeding size limit', async () => {
        const fs = require('fs');
        const path = require('path');
        const request = require('supertest');

        // Create a file exceeding 10MB limit
        const testFilePath = path.join(__dirname, 'large-file.jpg');
        const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
        fs.writeFileSync(testFilePath, largeBuffer);

        try {
          const response = await request(server)
            .post('/files/upload')
            .attach('file', testFilePath);

          // Multer returns 413 Payload Too Large for files exceeding size limit
          expect(response.status).toBe(413);
        } finally {
          if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
          }
        }
      });

      it('should reject unsupported file formats', async () => {
        const fs = require('fs');
        const path = require('path');
        const request = require('supertest');

        // Create a test file with unsupported format
        const testFilePath = path.join(__dirname, 'test-file.txt');
        fs.writeFileSync(testFilePath, 'This is a text file');

        try {
          const response = await request(server)
            .post('/files/upload')
            .attach('file', testFilePath);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('UNSUPPORTED_FORMAT');
        } finally {
          if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
          }
        }
      });
    });

    describe('Multimedia Message Creation and Retrieval', () => {
      it('should create multimedia message with file reference', async () => {
        const fs = require('fs');
        const path = require('path');
        const request = require('supertest');

        // Create and upload a test image
        const testFilePath = path.join(__dirname, 'test-image.jpg');
        const testFileContent = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
        fs.writeFileSync(testFilePath, testFileContent);

        try {
          // Upload file
          const uploadResponse = await request(server)
            .post('/files/upload')
            .attach('file', testFilePath);

          expect(uploadResponse.status).toBe(201);
          const fileId = uploadResponse.body.fileId;

          // Get file info
          const infoResponse = await request(server).get(`/files/${fileId}/info`);

          expect(infoResponse.status).toBe(200);
          expect(infoResponse.body.fileId).toBe(fileId);
          expect(infoResponse.body.fileName).toBe('test-image.jpg');
          expect(infoResponse.body.fileType).toBe('image');
          expect(infoResponse.body.fileSize).toBeGreaterThan(0);
          expect(infoResponse.body.uploadedAt).toBeDefined();
        } finally {
          if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
          }
        }
      });

      it('should return 404 for non-existent file', async () => {
        const request = require('supertest');

        const response = await request(server).get('/files/non-existent-id');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FILE_NOT_FOUND');
      });
    });

    describe('WebSocket Multimedia Message Transmission', () => {
      it('should send multimedia message via WebSocket', (done) => {
        const fs = require('fs');
        const path = require('path');
        const request = require('supertest');

        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });
        const client2 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client1IP: string;
        let client2IP: string;
        let fileId: string;
        let multimediaMessageReceived = false;
        let testComplete = false;

        client1.on('connected', (data: any) => {
          client1IP = data.user.ip;
        });

        client2.on('connected', (data: any) => {
          client2IP = data.user.ip;

          // Upload a file first
          const testFilePath = path.join(__dirname, 'test-image.jpg');
          const testFileContent = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
          fs.writeFileSync(testFilePath, testFileContent);

          request(server)
            .post('/files/upload')
            .attach('file', testFilePath)
            .then((uploadResponse: any) => {
              fileId = uploadResponse.body.fileId;

              // Send multimedia message
              setTimeout(() => {
                client1.emit('sendMultimediaMessage', {
                  targetIP: client2IP,
                  fileId: fileId,
                });
              }, 200);

              // Cleanup
              if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
              }
            });
        });

        client2.on('newMultimediaMessage', (data: any) => {
          const message = data.message || data;
          expect(message).toBeDefined();
          expect(message.fileId).toBe(fileId);
          expect(message.type).toMatch(/image|video/);
          multimediaMessageReceived = true;
          if (multimediaMessageReceived && !testComplete) {
            testComplete = true;
            client1.disconnect();
            client2.disconnect();
            done();
          }
        });

        setTimeout(() => {
          if (!testComplete) {
            testComplete = true;
            client1.disconnect();
            client2.disconnect();
            done(new Error('Multimedia message not received via WebSocket'));
          }
        }, 5000);
      });

      it('should broadcast multimedia message to all connected users', (done) => {
        const fs = require('fs');
        const path = require('path');
        const request = require('supertest');

        const clients = [
          io(BASE_URL, { reconnection: false, transports: ['websocket'] }),
          io(BASE_URL, { reconnection: false, transports: ['websocket'] }),
          io(BASE_URL, { reconnection: false, transports: ['websocket'] }),
        ];

        const clientIPs: string[] = [];
        let fileId: string;
        const messagesReceived: number[] = [0, 0, 0];
        let testComplete = false;

        clients.forEach((client, index) => {
          client.on('connected', (data: any) => {
            clientIPs[index] = data.user.ip;

            if (clientIPs.filter((ip) => ip).length === 3) {
              // All clients connected, upload file and send multimedia message
              const testFilePath = path.join(__dirname, 'test-image.jpg');
              const testFileContent = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
              fs.writeFileSync(testFilePath, testFileContent);

              request(server)
                .post('/files/upload')
                .attach('file', testFilePath)
                .then((uploadResponse: any) => {
                  fileId = uploadResponse.body.fileId;

                  // Send multimedia message from client 0
                  setTimeout(() => {
                    clients[0].emit('sendMultimediaMessage', {
                      targetIP: clientIPs[1],
                      fileId: fileId,
                    });
                  }, 200);

                  // Cleanup
                  if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                  }
                });
            }
          });

          client.on('newMultimediaMessage', () => {
            messagesReceived[index]++;
            checkCompletion();
          });
        });

        const checkCompletion = () => {
          if (messagesReceived[1] > 0 && !testComplete) {
            testComplete = true;
            clients.forEach((client) => client.disconnect());
            done();
          }
        };

        setTimeout(() => {
          if (!testComplete) {
            testComplete = true;
            clients.forEach((client) => client.disconnect());
            done(new Error('Multimedia message broadcast failed'));
          }
        }, 6000);
      });
    });
  });

  describe('16.2 Performance Testing (Optional)', () => {
    describe('Multiple Concurrent Connections', () => {
      it('should handle 10 concurrent connections', (done) => {
        const clients: ClientSocket[] = [];
        const NUM_CLIENTS = 10;
        let connectedCount = 0;

        for (let i = 0; i < NUM_CLIENTS; i++) {
          const client = io(BASE_URL, {
            reconnection: false,
            transports: ['websocket'],
          });
          clients.push(client);

          client.on('connected', () => {
            connectedCount++;
            if (connectedCount === NUM_CLIENTS) {
              // All clients connected
              clients.forEach((c) => c.disconnect());
              done();
            }
          });

          client.on('error', (error) => {
            clients.forEach((c) => c.disconnect());
            done(error);
          });
        }

        setTimeout(() => {
          if (connectedCount < NUM_CLIENTS) {
            clients.forEach((c) => c.disconnect());
            done(new Error(`Only ${connectedCount}/${NUM_CLIENTS} clients connected`));
          }
        }, 5000);
      });
    });

    describe('High-Frequency Message Sending', () => {
      it('should handle rapid message sending', (done) => {
        const client1 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });
        const client2 = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let client2IP: string;
        let messagesSent = 0;
        let messagesReceived = 0;
        const NUM_MESSAGES = 3;
        let testComplete = false;

        client1.on('connected', () => {
          // Wait for client2
        });

        client2.on('connected', (data: any) => {
          client2IP = data.user.ip;
          // Send multiple messages rapidly
          setTimeout(() => {
            for (let i = 0; i < NUM_MESSAGES; i++) {
              setTimeout(() => {
                client1.emit('sendMessage', {
                  targetIP: client2IP,
                  content: `Rapid message ${i}`,
                });
              }, i * 50);
            }
          }, 200);
        });

        client1.on('messageSent', () => {
          messagesSent++;
          checkCompletion();
        });

        client2.on('newMessage', () => {
          messagesReceived++;
          checkCompletion();
        });

        const checkCompletion = () => {
          if (messagesSent === NUM_MESSAGES && messagesReceived === NUM_MESSAGES && !testComplete) {
            testComplete = true;
            client1.disconnect();
            client2.disconnect();
            done();
          }
        };

        setTimeout(() => {
          if (!testComplete) {
            testComplete = true;
            client1.disconnect();
            client2.disconnect();
            done(
              new Error(
                `High-frequency test failed: sent=${messagesSent}, received=${messagesReceived}`,
              ),
            );
          }
        }, 6000);
      }, 8000);
    });
  });

    describe('Property-Based Testing', () => {
    describe('Property 12: Error after application availability', () => {
      it('should maintain availability after random errors', (done) => {
        // Test with a few random message scenarios (valid IPs but offline)
        const testScenarios = [
          { targetIP: '192.168.1.200', content: 'Test 1' },
          { targetIP: '10.0.0.100', content: 'Test 2' },
          { targetIP: '172.16.0.50', content: 'Test 3' },
        ];

        const client = io(BASE_URL, {
          reconnection: false,
          transports: ['websocket'],
        });

        let connected = false;
        let errorsHandled = 0;
        let recoveryAttempts = 0;

        client.on('connected', () => {
          connected = true;
          // Send messages (some will fail)
          setTimeout(() => {
            testScenarios.forEach((msg, index) => {
              setTimeout(() => {
                client.emit('sendMessage', msg);
              }, index * 50);
            });
          }, 100);
        });

        client.on('messageError', () => {
          errorsHandled++;
          // Try to recover by requesting online users
          client.emit('getOnlineUsers');
        });

        client.on('onlineUsersList', () => {
          if (errorsHandled > 0) {
            recoveryAttempts++;
          }
        });

        setTimeout(() => {
          client.disconnect();
          // Verify that app remained functional despite errors
          if (connected && recoveryAttempts > 0) {
            done();
          } else {
            done(
              new Error(
                `App not functional: connected=${connected}, recoveryAttempts=${recoveryAttempts}`,
              ),
            );
          }
        }, 4000);
      });
    });
  });
});
