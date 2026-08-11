import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PantryItemRepositoryPort } from '../domain/pantry-item.repository.port';
import { PantryItem } from '../domain/pantry-item.model';
import { PantryItemEntity } from './pantry-item.entity';

@Injectable()
export class PantryItemRepositoryAdapter extends PantryItemRepositoryPort {
  constructor(
    @InjectRepository(PantryItemEntity)
    private readonly repo: Repository<PantryItemEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<PantryItem[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findByHouseholdAndProduct(householdId: string, productId: string): Promise<PantryItem | null> {
    const entity = await this.repo.findOne({ where: { householdId, productId } });
    return entity ? entity.toDomain() : null;
  }

  async findById(id: string): Promise<PantryItem | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(item: PantryItem): Promise<void> {
    await this.repo.save(PantryItemEntity.fromDomain(item));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
