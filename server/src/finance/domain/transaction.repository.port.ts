import { Transaction } from './transaction.model';

export abstract class TransactionRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<Transaction[]>;
  abstract findByWallet(walletId: string): Promise<Transaction[]>;
  abstract findById(id: string): Promise<Transaction | null>;
  abstract save(transaction: Transaction): Promise<void>;
  abstract saveMany(transactions: Transaction[]): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByWallet(walletId: string): Promise<void>;
}
