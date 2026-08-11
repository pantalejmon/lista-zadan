import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletRepositoryPort } from '../domain/wallet.repository.port';
import { Wallet } from '../domain/wallet.model';
import { WalletEntity } from './wallet.entity';

@Injectable()
export class WalletRepositoryAdapter extends WalletRepositoryPort {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly repo: Repository<WalletEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<Wallet[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<Wallet | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(wallet: Wallet): Promise<void> {
    await this.repo.save(WalletEntity.fromDomain(wallet));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
