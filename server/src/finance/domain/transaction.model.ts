import { randomUUID } from 'crypto';
import { roundMoney } from './finance-category';
import { CreateTransactionDto } from '../web/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../web/dto/update-transaction.dto';

export interface TransactionResponse {
  id: string;
  walletId: string;
  amount: number;
  description: string;
  category: string | null;
  occurredAt: number;
  recurringId: string | null;
  createdAt: number;
}

// A single money movement. Positive amount = income, negative = expense
// (same convention as the standalone finance app).
export class Transaction {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly walletId: string,
    readonly amount: number,
    readonly description: string,
    readonly category: string | null,
    readonly occurredAt: number,
    readonly recurringId: string | null,
    readonly createdAt: number,
  ) {}

  static createFromDto(dto: CreateTransactionDto, householdId: string): Transaction {
    return new Transaction(
      randomUUID(),
      householdId,
      dto.walletId,
      roundMoney(dto.amount),
      dto.description.trim(),
      clean(dto.category),
      dto.occurredAt ?? Date.now(),
      null,
      Date.now(),
    );
  }

  // Materialised from a recurring rule for a given due date.
  static createFromRecurring(
    householdId: string,
    walletId: string,
    amount: number,
    description: string,
    category: string | null,
    occurredAt: number,
    recurringId: string,
  ): Transaction {
    return new Transaction(
      randomUUID(),
      householdId,
      walletId,
      roundMoney(amount),
      description,
      category,
      occurredAt,
      recurringId,
      Date.now(),
    );
  }

  update(dto: UpdateTransactionDto): Transaction {
    return new Transaction(
      this.id,
      this.householdId,
      this.walletId,
      dto.amount === undefined ? this.amount : roundMoney(dto.amount),
      dto.description === undefined ? this.description : dto.description.trim(),
      dto.category === undefined ? this.category : clean(dto.category),
      dto.occurredAt ?? this.occurredAt,
      this.recurringId,
      this.createdAt,
    );
  }

  toResponse(): TransactionResponse {
    return {
      id: this.id,
      walletId: this.walletId,
      amount: this.amount,
      description: this.description,
      category: this.category,
      occurredAt: this.occurredAt,
      recurringId: this.recurringId,
      createdAt: this.createdAt,
    };
  }
}

function clean(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
