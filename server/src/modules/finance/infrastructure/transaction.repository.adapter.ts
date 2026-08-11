import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionRepositoryPort } from '../domain/transaction.repository.port';
import { Transaction } from '../domain/transaction.model';
import { TransactionEntity } from './transaction.entity';

@Injectable()
export class TransactionRepositoryAdapter extends TransactionRepositoryPort {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<Transaction[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findByWallet(walletId: string): Promise<Transaction[]> {
    const entities = await this.repo.find({ where: { walletId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<Transaction | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(transaction: Transaction): Promise<void> {
    await this.repo.save(TransactionEntity.fromDomain(transaction));
  }

  async saveMany(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) {
      return;
    }
    await this.repo.save(transactions.map((t) => TransactionEntity.fromDomain(t)));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByWallet(walletId: string): Promise<void> {
    await this.repo.delete({ walletId });
  }
}
