import { randomUUID } from 'crypto';
import { CreateWalletDto } from '../web/dto/create-wallet.dto';

export interface WalletResponse {
  id: string;
  name: string;
  balance: number;
  transactionCount: number;
  createdAt: number;
}

// A wallet (portfel) groups transactions within a household.
export class Wallet {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly name: string,
    readonly createdAt: number,
  ) {}

  static createFromDto(dto: CreateWalletDto, householdId: string): Wallet {
    return new Wallet(randomUUID(), householdId, dto.name.trim(), Date.now());
  }

  update(dto: CreateWalletDto): Wallet {
    return new Wallet(this.id, this.householdId, dto.name.trim(), this.createdAt);
  }

  toResponse(balance: number, transactionCount: number): WalletResponse {
    return {
      id: this.id,
      name: this.name,
      balance,
      transactionCount,
      createdAt: this.createdAt,
    };
  }
}
