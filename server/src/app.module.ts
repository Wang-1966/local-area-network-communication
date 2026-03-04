import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagingGateway } from './gateways/messaging.gateway';
import { MessageService } from './services/message.service';
import { UserService } from './services/user.service';
import { ValidationService } from './services/validation.service';
import { FileValidationService } from './services/file-validation.service';
import { FileStorageService } from './services/file-storage.service';
import { MultimediaMessageService } from './services/multimedia-message.service';
import { MessageRepository } from './repositories/message.repository';
import { UserRepository } from './repositories/user.repository';
import { FileUploadController } from './controllers/file-upload.controller';

@Module({
  imports: [],
  controllers: [AppController, FileUploadController],
  providers: [
    AppService,
    MessagingGateway,
    MessageService,
    UserService,
    ValidationService,
    FileValidationService,
    FileStorageService,
    MultimediaMessageService,
    MessageRepository,
    UserRepository,
  ],
})
export class AppModule {}
