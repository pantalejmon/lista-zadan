import { randomUUID } from 'crypto';
import { roundMoney, type RecurrenceFrequency } from './finance-category';
import { CreateRecurringDto } from '../web/dto/create-recurring.dto';

export interface RecurringTransactionResponse {
  id: string;
  walletId: string;
  amount: number;
  description: string;
  category: string | null;
  frequency: RecurrenceFrequency;
  nextDueAt: string;
  createdAt: number;
}

// A rule that materialises transactions on a schedule (rachunki, pensja…).
export class RecurringTransaction {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly walletId: string,
    readonly amount: number,
    readonly description: string,
    readonly category: string | null,
    readonly frequency: RecurrenceFrequency,
    readonly nextDueAt: string,
    readonly createdAt: number,
  ) {}

  static createFromDto(dto: CreateRecurringDto, householdId: string): RecurringTransaction {
    return new RecurringTransaction(
      randomUUID(),
      householdId,
      dto.walletId,
      roundMoney(dto.amount),
      dto.description.trim(),
      clean(dto.category),
      dto.frequency,
      dto.nextDueAt?.trim() || tomorrowIso(),
      Date.now(),
    );
  }

  update(dto: CreateRecurringDto): RecurringTransaction {
    return new RecurringTransaction(
      this.id,
      this.householdId,
      dto.walletId,
      roundMoney(dto.amount),
      dto.description.trim(),
      clean(dto.category),
      dto.frequency,
      dto.nextDueAt?.trim() || this.nextDueAt,
      this.createdAt,
    );
  }

  withNextDueAt(nextDueAt: string): RecurringTransaction {
    return new RecurringTransaction(
      this.id,
      this.householdId,
      this.walletId,
      this.amount,
      this.description,
      this.category,
      this.frequency,
      nextDueAt,
      this.createdAt,
    );
  }

  toResponse(): RecurringTransactionResponse {
    return {
      id: this.id,
      walletId: this.walletId,
      amount: this.amount,
      description: this.description,
      category: this.category,
      frequency: this.frequency,
      nextDueAt: this.nextDueAt,
      createdAt: this.createdAt,
    };
  }
}

function clean(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Advances a YYYY-MM-DD date by one period. Monthly keeps the day-of-month,
// clamping to the target month's length (31 Jan + 1 mies. → 28/29 Feb).
export function advanceDue(dateStr: string, frequency: RecurrenceFrequency): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  if (frequency === 'daily') {
    return toIsoDate(new Date(y, m - 1, d + 1));
  }
  if (frequency === 'weekly') {
    return toIsoDate(new Date(y, m - 1, d + 7));
  }
  // `m` (1-based) is already the 0-based index of the *next* month; Date handles
  // the year rollover for December.
  const daysInTarget = new Date(y, m + 1, 0).getDate();
  return toIsoDate(new Date(y, m, Math.min(d, daysInTarget)));
}
