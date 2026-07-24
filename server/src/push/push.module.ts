import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscriptionEntity } from './infrastructure/push-subscription.entity';
import { PushSubscriptionRepositoryPort } from './domain/push-subscription.repository.port';
import { PushSubscriptionRepositoryAdapter } from './infrastructure/push-subscription.repository.adapter';
import { PushService } from './domain/push.service';
import { PushController } from './web/push.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscriptionEntity]), AuthModule],
  controllers: [PushController],
  providers: [
    { provide: PushSubscriptionRepositoryPort, useClass: PushSubscriptionRepositoryAdapter },
    PushService,
  ],
  exports: [PushService],
})
export class PushModule {}
