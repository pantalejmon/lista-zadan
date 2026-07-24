import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealShoppingItemRepositoryPort } from '../domain/meal-shopping-item.repository.port';
import { MealShoppingItem } from '../domain/meal-shopping-item.model';
import { MealShoppingItemEntity } from './meal-shopping-item.entity';

@Injectable()
export class MealShoppingItemRepositoryAdapter extends MealShoppingItemRepositoryPort {
  constructor(
    @InjectRepository(MealShoppingItemEntity)
    private readonly repo: Repository<MealShoppingItemEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<MealShoppingItem[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<MealShoppingItem | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(item: MealShoppingItem): Promise<void> {
    await this.repo.save(MealShoppingItemEntity.fromDomain(item));
  }

  async saveMany(items: MealShoppingItem[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    await this.repo.save(items.map((i) => MealShoppingItemEntity.fromDomain(i)));
  }

  async update(item: MealShoppingItem): Promise<void> {
    await this.repo.save(MealShoppingItemEntity.fromDomain(item));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
