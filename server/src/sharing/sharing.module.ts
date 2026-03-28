import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TodoListEntity } from './infrastructure/todo-list.entity';
import { ListMemberEntity } from './infrastructure/list-member.entity';
import { ListInvitationEntity } from './infrastructure/list-invitation.entity';
import { TodoListRepositoryPort } from './domain/todo-list.repository.port';
import { TodoListRepositoryAdapter } from './infrastructure/todo-list.repository.adapter';
import { ListMemberRepositoryPort } from './domain/list-member.repository.port';
import { ListMemberRepositoryAdapter } from './infrastructure/list-member.repository.adapter';
import { ListInvitationRepositoryPort } from './domain/list-invitation.repository.port';
import { ListInvitationRepositoryAdapter } from './infrastructure/list-invitation.repository.adapter';
import { SharingService } from './domain/sharing.service';
import { SharingController, InvitationController } from './web/sharing.controller';
import { AuthService } from '../auth/domain/auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TodoListEntity, ListMemberEntity, ListInvitationEntity]),
    AuthModule,
  ],
  controllers: [SharingController, InvitationController],
  providers: [
    { provide: TodoListRepositoryPort, useClass: TodoListRepositoryAdapter },
    { provide: ListMemberRepositoryPort, useClass: ListMemberRepositoryAdapter },
    { provide: ListInvitationRepositoryPort, useClass: ListInvitationRepositoryAdapter },
    {
      provide: SharingService,
      useFactory: (
        listRepo: TodoListRepositoryPort,
        memberRepo: ListMemberRepositoryPort,
        invitationRepo: ListInvitationRepositoryPort,
        authService: AuthService,
      ) => new SharingService(listRepo, memberRepo, invitationRepo, authService),
      inject: [TodoListRepositoryPort, ListMemberRepositoryPort, ListInvitationRepositoryPort, AuthService],
    },
  ],
  exports: [SharingService],
})
export class SharingModule {}
