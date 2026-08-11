import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealEntryRepositoryPort } from '../domain/meal-entry.repository.port';
import { MealEntry } from '../domain/meal-entry.model';
import { MealEntryEntity } from './meal-entry.entity';

@Injectable()
export class MealEntryRepositoryAdapter extends MealEntryRepositoryPort {
  constructor(
    @InjectRepository(MealEntryEntity)
    private readonly repo: Repository<MealEntryEntity>,
  ) {
    super();
  }

  async findByWeek(householdId: string, weekStart: string): Promise<MealEntry[]> {
    const entities = await this.repo.find({ where: { householdId, weekStart } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<MealEntry | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async findSlot(
    householdId: string,
    weekStart: string,
    dayOfWeek: number,
    mealType: string,
  ): Promise<MealEntry | null> {
    const entity = await this.repo.findOne({
      where: { householdId, weekStart, dayOfWeek, mealType: mealType as MealEntryEntity['mealType'] },
    });
    return entity ? entity.toDomain() : null;
  }

  async save(entry: MealEntry): Promise<void> {
    await this.repo.save(MealEntryEntity.fromDomain(entry));
  }

  async update(entry: MealEntry): Promise<void> {
    await this.repo.save(MealEntryEntity.fromDomain(entry));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByRecipe(recipeId: string): Promise<void> {
    await this.repo.delete({ recipeId });
  }
}
