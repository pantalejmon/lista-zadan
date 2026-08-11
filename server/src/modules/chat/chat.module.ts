import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@platform/auth/auth.module';
import { SharingModule } from '@platform/sharing/sharing.module';
import { PushModule } from '@platform/push/push.module';
import { AuthService } from '@platform/auth/domain/auth.service';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { PushService } from '@platform/push/domain/push.service';
import { ChatMessageEntity } from './infrastructure/chat-message.entity';
import { ChatMessageRepositoryPort } from './domain/chat-message.repository.port';
import { ChatMessageRepositoryAdapter } from './infrastructure/chat-message.repository.adapter';
import { ChatService } from './domain/chat.service';
import { ChatController } from './web/chat.controller';
import { ChatGateway } from './web/chat.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageEntity]), AuthModule, SharingModule, PushModule],
  controllers: [ChatController],
  providers: [
    { provide: ChatMessageRepositoryPort, useClass: ChatMessageRepositoryAdapter },
    {
      provide: ChatService,
      useFactory: (
        repo: ChatMessageRepositoryPort,
        sharingService: SharingService,
        authService: AuthService,
        pushService: PushService,
      ) => new ChatService(repo, sharingService, authService, pushService),
      inject: [ChatMessageRepositoryPort, SharingService, AuthService, PushService],
    },
    ChatGateway,
  ],
})
export class ChatModule {}
