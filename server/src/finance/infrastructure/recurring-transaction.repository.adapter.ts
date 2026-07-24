import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTransactionRepositoryPort } from '../domain/recurring-transaction.repository.port';
import { RecurringTransaction } from '../domain/recurring-transaction.model';
import { RecurringTransactionEntity } from './recurring-transaction.entity';

@Injectable()
export class RecurringTransactionRepositoryAdapter extends RecurringTransactionRepositoryPort {
  constructor(
    @InjectRepository(RecurringTransactionEntity)
    private readonly repo: Repository<RecurringTransactionEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<RecurringTransaction[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<RecurringTransaction | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(recurring: RecurringTransaction): Promise<void> {
    await this.repo.save(RecurringTransactionEntity.fromDomain(recurring));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByWallet(walletId: string): Promise<void> {
    await this.repo.delete({ walletId });
  }
}
