import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagingGateway } from './gateways/messaging.gateway';
import { MessageService } from './services/message.service';
import { UserService } from './services/user.service';
import { ValidationService } from './services/validation.service';
import { MessageRepository } from './repositories/message.repository';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    MessagingGateway,
    MessageService,
    UserService,
    ValidationService,
    MessageRepository,
    UserRepository,
  ],
})
export class AppModule {}
