import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { RecurringTransaction } from '../domain/recurring-transaction.model';
import type { RecurrenceFrequency } from '../domain/finance-category';

@Entity('finance_recurring')
export class RecurringTransactionEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Index()
  @Column('varchar')
  walletId!: string;

  @Column('float')
  amount!: number;

  @Column('varchar')
  description!: string;

  @Column('varchar', { nullable: true })
  category!: string | null;

  @Column('varchar')
  frequency!: RecurrenceFrequency;

  @Column('varchar')
  nextDueAt!: string;

  @Column('bigint')
  createdAt!: number;

  toDomain(): RecurringTransaction {
    return new RecurringTransaction(
      this.id,
      this.householdId,
      this.walletId,
      Number(this.amount),
      this.description,
      this.category,
      this.frequency,
      this.nextDueAt,
      Number(this.createdAt),
    );
  }

  static fromDomain(rec: RecurringTransaction): RecurringTransactionEntity {
    const entity = new RecurringTransactionEntity();
    entity.id = rec.id;
    entity.householdId = rec.householdId;
    entity.walletId = rec.walletId;
    entity.amount = rec.amount;
    entity.description = rec.description;
    entity.category = rec.category;
    entity.frequency = rec.frequency;
    entity.nextDueAt = rec.nextDueAt;
    entity.createdAt = rec.createdAt;
    return entity;
  }
}
