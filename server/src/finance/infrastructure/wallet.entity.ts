import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { Wallet } from '../domain/wallet.model';

@Entity('finance_wallet')
export class WalletEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  name!: string;

  @Column('bigint')
  createdAt!: number;

  toDomain(): Wallet {
    return new Wallet(this.id, this.householdId, this.name, Number(this.createdAt));
  }

  static fromDomain(wallet: Wallet): WalletEntity {
    const entity = new WalletEntity();
    entity.id = wallet.id;
    entity.householdId = wallet.householdId;
    entity.name = wallet.name;
    entity.createdAt = wallet.createdAt;
    return entity;
  }
}
