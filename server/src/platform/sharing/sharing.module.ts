import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@platform/auth/auth.module';
import { TodoListEntity } from './infrastructure/todo-list.entity';
import { HouseholdEntity } from './infrastructure/household.entity';
import { HouseholdMemberEntity } from './infrastructure/household-member.entity';
import { HouseholdInvitationEntity } from './infrastructure/household-invitation.entity';
import { TodoListRepositoryPort } from './domain/todo-list.repository.port';
import { TodoListRepositoryAdapter } from './infrastructure/todo-list.repository.adapter';
import { HouseholdRepositoryPort } from './domain/household.repository.port';
import { HouseholdRepositoryAdapter } from './infrastructure/household.repository.adapter';
import { HouseholdMemberRepositoryPort } from './domain/household-member.repository.port';
import { HouseholdMemberRepositoryAdapter } from './infrastructure/household-member.repository.adapter';
import { HouseholdInvitationRepositoryPort } from './domain/household-invitation.repository.port';
import { HouseholdInvitationRepositoryAdapter } from './infrastructure/household-invitation.repository.adapter';
import { SharingService } from './domain/sharing.service';
import { SharingController, InvitationController } from './web/sharing.controller';
import { HouseholdController, ContactsController } from './web/household.controller';
import { AuthService } from '@platform/auth/domain/auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TodoListEntity,
      HouseholdEntity,
      HouseholdMemberEntity,
      HouseholdInvitationEntity,
    ]),
    AuthModule,
  ],
  controllers: [SharingController, InvitationController, HouseholdController, ContactsController],
  providers: [
    { provide: TodoListRepositoryPort, useClass: TodoListRepositoryAdapter },
    { provide: HouseholdRepositoryPort, useClass: HouseholdRepositoryAdapter },
    { provide: HouseholdMemberRepositoryPort, useClass: HouseholdMemberRepositoryAdapter },
    { provide: HouseholdInvitationRepositoryPort, useClass: HouseholdInvitationRepositoryAdapter },
    {
      provide: SharingService,
      useFactory: (
        listRepo: TodoListRepositoryPort,
        householdRepo: HouseholdRepositoryPort,
        memberRepo: HouseholdMemberRepositoryPort,
        invitationRepo: HouseholdInvitationRepositoryPort,
        authService: AuthService,
      ) => new SharingService(listRepo, householdRepo, memberRepo, invitationRepo, authService),
      inject: [
        TodoListRepositoryPort,
        HouseholdRepositoryPort,
        HouseholdMemberRepositoryPort,
        HouseholdInvitationRepositoryPort,
        AuthService,
      ],
    },
  ],
  exports: [SharingService],
})
export class SharingModule {}
