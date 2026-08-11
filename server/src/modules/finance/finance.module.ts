import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@platform/auth/auth.module';
import { SharingModule } from '@platform/sharing/sharing.module';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { WalletEntity } from './infrastructure/wallet.entity';
import { TransactionEntity } from './infrastructure/transaction.entity';
import { RecurringTransactionEntity } from './infrastructure/recurring-transaction.entity';
import { WalletRepositoryPort } from './domain/wallet.repository.port';
import { WalletRepositoryAdapter } from './infrastructure/wallet.repository.adapter';
import { TransactionRepositoryPort } from './domain/transaction.repository.port';
import { TransactionRepositoryAdapter } from './infrastructure/transaction.repository.adapter';
import { RecurringTransactionRepositoryPort } from './domain/recurring-transaction.repository.port';
import { RecurringTransactionRepositoryAdapter } from './infrastructure/recurring-transaction.repository.adapter';
import { FinanceService } from './domain/finance.service';
import { FinanceController } from './web/finance.controller';
import { FinanceGateway } from './web/finance.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletEntity, TransactionEntity, RecurringTransactionEntity]),
    AuthModule,
    SharingModule,
  ],
  controllers: [FinanceController],
  providers: [
    { provide: WalletRepositoryPort, useClass: WalletRepositoryAdapter },
    { provide: TransactionRepositoryPort, useClass: TransactionRepositoryAdapter },
    { provide: RecurringTransactionRepositoryPort, useClass: RecurringTransactionRepositoryAdapter },
    FinanceGateway,
    {
      provide: FinanceService,
      useFactory: (
        walletRepo: WalletRepositoryPort,
        transactionRepo: TransactionRepositoryPort,
        recurringRepo: RecurringTransactionRepositoryPort,
        sharingService: SharingService,
        gateway: FinanceGateway,
      ) => new FinanceService(walletRepo, transactionRepo, recurringRepo, sharingService, gateway),
      inject: [
        WalletRepositoryPort,
        TransactionRepositoryPort,
        RecurringTransactionRepositoryPort,
        SharingService,
        FinanceGateway,
      ],
    },
  ],
  exports: [FinanceService],
})
export class FinanceModule {}
