import { Wallet } from './wallet.model';

export abstract class WalletRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<Wallet[]>;
  abstract findById(id: string): Promise<Wallet | null>;
  abstract save(wallet: Wallet): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
