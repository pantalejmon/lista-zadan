import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { Transaction } from '../domain/transaction.model';

@Entity('finance_transaction')
export class TransactionEntity {
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

  @Column('bigint')
  occurredAt!: number;

  @Column('varchar', { nullable: true })
  recurringId!: string | null;

  @Column('bigint')
  createdAt!: number;

  toDomain(): Transaction {
    return new Transaction(
      this.id,
      this.householdId,
      this.walletId,
      Number(this.amount),
      this.description,
      this.category,
      Number(this.occurredAt),
      this.recurringId,
      Number(this.createdAt),
    );
  }

  static fromDomain(tx: Transaction): TransactionEntity {
    const entity = new TransactionEntity();
    entity.id = tx.id;
    entity.householdId = tx.householdId;
    entity.walletId = tx.walletId;
    entity.amount = tx.amount;
    entity.description = tx.description;
    entity.category = tx.category;
    entity.occurredAt = tx.occurredAt;
    entity.recurringId = tx.recurringId;
    entity.createdAt = tx.createdAt;
    return entity;
  }
}
