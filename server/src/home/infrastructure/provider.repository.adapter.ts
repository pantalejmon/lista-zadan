import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderRepositoryPort } from '../domain/provider.repository.port';
import { Provider } from '../domain/provider.model';
import { ProviderEntity } from './provider.entity';

@Injectable()
export class ProviderRepositoryAdapter extends ProviderRepositoryPort {
  constructor(
    @InjectRepository(ProviderEntity)
    private readonly repo: Repository<ProviderEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<Provider[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<Provider | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(provider: Provider): Promise<void> {
    await this.repo.save(ProviderEntity.fromDomain(provider));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
