import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { ListRole } from '@platform/sharing/domain/list-role';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { Wallet, type WalletResponse } from './wallet.model';
import { Transaction, type TransactionResponse } from './transaction.model';
import {
  RecurringTransaction,
  advanceDue,
  toIsoDate,
  type RecurringTransactionResponse,
} from './recurring-transaction.model';
import { roundMoney } from './finance-category';
import { WalletRepositoryPort } from './wallet.repository.port';
import { TransactionRepositoryPort } from './transaction.repository.port';
import { RecurringTransactionRepositoryPort } from './recurring-transaction.repository.port';
import { FinanceGateway } from '../web/finance.gateway';
import { CreateWalletDto } from '../web/dto/create-wallet.dto';
import { CreateTransactionDto } from '../web/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../web/dto/update-transaction.dto';
import { CreateRecurringDto } from '../web/dto/create-recurring.dto';

const WRITE_ROLES: ListRole[] = ['owner', 'editor'];
const READ_ROLES: ListRole[] = ['owner', 'editor', 'viewer'];

// Safety cap on how many transactions a single stale recurring rule may generate
// in one catch-up run (a daily rule untouched for years shouldn't stall a request).
const MAX_CATCH_UP_PER_RULE = 500;

// Trend chart points returned to the client (most recent slice).
const MAX_TREND_POINTS = 200;

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface TrendPoint {
  at: number;
  balance: number;
}

export interface FinanceStatsResponse {
  income: number;
  expenses: number;
  balance: number;
  byCategory: CategoryTotal[];
  trend: TrendPoint[];
}

export class FinanceService {
  constructor(
    private readonly walletRepo: WalletRepositoryPort,
    private readonly transactionRepo: TransactionRepositoryPort,
    private readonly recurringRepo: RecurringTransactionRepositoryPort,
    private readonly sharingService: SharingService,
    private readonly gateway: FinanceGateway,
  ) {}

  // ---- wallets ----

  async getWallets(householdId: string, userId: string): Promise<WalletResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    // Reading the section is what advances the schedule (same as the standalone
    // app did on load) — idempotent, so repeated reads are safe.
    await this.materialiseDue(householdId);
    const [wallets, transactions] = await Promise.all([
      this.walletRepo.findByHousehold(householdId),
      this.transactionRepo.findByHousehold(householdId),
    ]);
    const totals = new Map<string, { balance: number; count: number }>();
    for (const tx of transactions) {
      const current = totals.get(tx.walletId) ?? { balance: 0, count: 0 };
      current.balance += tx.amount;
      current.count += 1;
      totals.set(tx.walletId, current);
    }
    return wallets
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((w) => {
        const t = totals.get(w.id);
        return w.toResponse(roundMoney(t?.balance ?? 0), t?.count ?? 0);
      });
  }

  async createWallet(householdId: string, userId: string, dto: CreateWalletDto): Promise<WalletResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const wallet = Wallet.createFromDto(dto, householdId);
    await this.walletRepo.save(wallet);
    this.gateway.notifyChanged(householdId);
    return wallet.toResponse(0, 0);
  }

  async updateWallet(id: string, userId: string, dto: CreateWalletDto): Promise<WalletResponse> {
    const wallet = await this.findWalletOrThrow(id);
    await this.sharingService.assertHouseholdPermission(wallet.householdId, userId, WRITE_ROLES);
    const updated = wallet.update(dto);
    await this.walletRepo.save(updated);
    this.gateway.notifyChanged(wallet.householdId);
    const transactions = await this.transactionRepo.findByWallet(id);
    return updated.toResponse(roundMoney(sumAmounts(transactions)), transactions.length);
  }

  async deleteWallet(id: string, userId: string): Promise<void> {
    const wallet = await this.findWalletOrThrow(id);
    await this.sharingService.assertHouseholdPermission(wallet.householdId, userId, WRITE_ROLES);
    // Removing a wallet removes its transactions and recurring rules.
    await this.transactionRepo.deleteByWallet(id);
    await this.recurringRepo.deleteByWallet(id);
    await this.walletRepo.delete(id);
    this.gateway.notifyChanged(wallet.householdId);
  }

  // ---- transactions ----

  async getTransactions(householdId: string, userId: string, walletId?: string): Promise<TransactionResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    await this.materialiseDue(householdId);
    const transactions = walletId
      ? await this.transactionsOfWallet(walletId, householdId)
      : await this.transactionRepo.findByHousehold(householdId);
    return transactions.sort((a, b) => b.occurredAt - a.occurredAt).map((t) => t.toResponse());
  }

  async createTransaction(
    householdId: string,
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    await this.assertWalletInHousehold(dto.walletId, householdId);
    if (dto.amount === 0) {
      throw new BadRequestException('Amount must not be zero');
    }
    const transaction = Transaction.createFromDto(dto, householdId);
    await this.transactionRepo.save(transaction);
    this.gateway.notifyChanged(householdId);
    return transaction.toResponse();
  }

  async updateTransaction(id: string, userId: string, dto: UpdateTransactionDto): Promise<TransactionResponse> {
    const transaction = await this.findTransactionOrThrow(id);
    await this.sharingService.assertHouseholdPermission(transaction.householdId, userId, WRITE_ROLES);
    if (dto.amount === 0) {
      throw new BadRequestException('Amount must not be zero');
    }
    const updated = transaction.update(dto);
    await this.transactionRepo.save(updated);
    this.gateway.notifyChanged(transaction.householdId);
    return updated.toResponse();
  }

  async deleteTransaction(id: string, userId: string): Promise<void> {
    const transaction = await this.findTransactionOrThrow(id);
    await this.sharingService.assertHouseholdPermission(transaction.householdId, userId, WRITE_ROLES);
    await this.transactionRepo.delete(id);
    this.gateway.notifyChanged(transaction.householdId);
  }

  // ---- recurring ----

  async getRecurring(householdId: string, userId: string): Promise<RecurringTransactionResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const rules = await this.recurringRepo.findByHousehold(householdId);
    return rules.sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt)).map((r) => r.toResponse());
  }

  async createRecurring(
    householdId: string,
    userId: string,
    dto: CreateRecurringDto,
  ): Promise<RecurringTransactionResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    await this.assertWalletInHousehold(dto.walletId, householdId);
    if (dto.amount === 0) {
      throw new BadRequestException('Amount must not be zero');
    }
    const recurring = RecurringTransaction.createFromDto(dto, householdId);
    await this.recurringRepo.save(recurring);
    this.gateway.notifyChanged(householdId);
    return recurring.toResponse();
  }

  async updateRecurring(id: string, userId: string, dto: CreateRecurringDto): Promise<RecurringTransactionResponse> {
    const recurring = await this.findRecurringOrThrow(id);
    await this.sharingService.assertHouseholdPermission(recurring.householdId, userId, WRITE_ROLES);
    await this.assertWalletInHousehold(dto.walletId, recurring.householdId);
    const updated = recurring.update(dto);
    await this.recurringRepo.save(updated);
    this.gateway.notifyChanged(recurring.householdId);
    return updated.toResponse();
  }

  async deleteRecurring(id: string, userId: string): Promise<void> {
    const recurring = await this.findRecurringOrThrow(id);
    await this.sharingService.assertHouseholdPermission(recurring.householdId, userId, WRITE_ROLES);
    await this.recurringRepo.delete(id);
    this.gateway.notifyChanged(recurring.householdId);
  }

  // ---- stats ----

  async getStats(householdId: string, userId: string, walletId?: string): Promise<FinanceStatsResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    await this.materialiseDue(householdId);
    const transactions = walletId
      ? await this.transactionsOfWallet(walletId, householdId)
      : await this.transactionRepo.findByHousehold(householdId);

    let income = 0;
    let expenses = 0;
    const byCategory = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.amount >= 0) {
        income += tx.amount;
      } else {
        expenses += Math.abs(tx.amount);
        const key = tx.category ?? 'Inne';
        byCategory.set(key, (byCategory.get(key) ?? 0) + Math.abs(tx.amount));
      }
    }

    // Running balance over time, oldest → newest; only the latest slice is sent.
    const chronological = [...transactions].sort((a, b) => a.occurredAt - b.occurredAt);
    const trend: TrendPoint[] = [];
    let running = 0;
    for (const tx of chronological) {
      running += tx.amount;
      trend.push({ at: tx.occurredAt, balance: roundMoney(running) });
    }

    return {
      income: roundMoney(income),
      expenses: roundMoney(expenses),
      balance: roundMoney(income - expenses),
      byCategory: [...byCategory.entries()]
        .map(([category, total]) => ({ category, total: roundMoney(total) }))
        .sort((a, b) => b.total - a.total),
      trend: trend.slice(-MAX_TREND_POINTS),
    };
  }

  // ---- internals ----

  // Generates the transactions every due recurring rule owes, then rolls its
  // nextDueAt past today. Idempotent: a rule whose nextDueAt is in the future
  // produces nothing.
  private async materialiseDue(householdId: string): Promise<void> {
    const rules = await this.recurringRepo.findByHousehold(householdId);
    if (rules.length === 0) {
      return;
    }
    const today = toIsoDate(new Date());
    const created: Transaction[] = [];

    for (const rule of rules) {
      if (rule.nextDueAt > today) {
        continue;
      }
      let due = rule.nextDueAt;
      let generated = 0;
      while (due <= today && generated < MAX_CATCH_UP_PER_RULE) {
        created.push(
          Transaction.createFromRecurring(
            householdId,
            rule.walletId,
            rule.amount,
            rule.description,
            rule.category,
            Date.parse(`${due}T12:00:00`),
            rule.id,
          ),
        );
        due = advanceDue(due, rule.frequency);
        generated += 1;
      }
      if (generated > 0) {
        await this.recurringRepo.save(rule.withNextDueAt(due));
      }
    }

    await this.transactionRepo.saveMany(created);
    if (created.length > 0) {
      this.gateway.notifyChanged(householdId);
    }
  }

  private async transactionsOfWallet(walletId: string, householdId: string): Promise<Transaction[]> {
    await this.assertWalletInHousehold(walletId, householdId);
    return this.transactionRepo.findByWallet(walletId);
  }

  private async assertWalletInHousehold(walletId: string, householdId: string): Promise<void> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet || wallet.householdId !== householdId) {
      throw new BadRequestException('Wallet does not belong to this household');
    }
  }

  private async findWalletOrThrow(id: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findById(id);
    if (!wallet) {
      throw new NotFoundException(`Wallet ${id} not found`);
    }
    return wallet;
  }

  private async findTransactionOrThrow(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return transaction;
  }

  private async findRecurringOrThrow(id: string): Promise<RecurringTransaction> {
    const recurring = await this.recurringRepo.findById(id);
    if (!recurring) {
      throw new NotFoundException(`Recurring transaction ${id} not found`);
    }
    return recurring;
  }
}

function sumAmounts(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}
