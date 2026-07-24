import { RecurringTransaction } from './recurring-transaction.model';

export abstract class RecurringTransactionRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<RecurringTransaction[]>;
  abstract findById(id: string): Promise<RecurringTransaction | null>;
  abstract save(recurring: RecurringTransaction): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByWallet(walletId: string): Promise<void>;
}
