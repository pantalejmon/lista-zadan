import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@platform/auth/auth.module';
import { SharingModule } from '@platform/sharing/sharing.module';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { ApiTokenEntity } from './infrastructure/api-token.entity';
import { ApiTokenRepositoryPort } from './domain/api-token.repository.port';
import { ApiTokenRepositoryAdapter } from './infrastructure/api-token.repository.adapter';
import { ApiTokenService } from './domain/api-token.service';
import { ApiTokenController } from './web/api-token.controller';
import { MachineOrJwtAuthGuard } from './web/machine-or-jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiTokenEntity]),
    AuthModule,
    SharingModule,
  ],
  controllers: [ApiTokenController],
  providers: [
    { provide: ApiTokenRepositoryPort, useClass: ApiTokenRepositoryAdapter },
    {
      provide: ApiTokenService,
      useFactory: (repo: ApiTokenRepositoryPort, sharingService: SharingService) =>
        new ApiTokenService(repo, sharingService),
      inject: [ApiTokenRepositoryPort, SharingService],
    },
    MachineOrJwtAuthGuard,
  ],
  exports: [ApiTokenService, MachineOrJwtAuthGuard],
})
export class ApiTokenModule {}
