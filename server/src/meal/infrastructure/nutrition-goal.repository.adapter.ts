import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NutritionGoalRepositoryPort } from '../domain/nutrition-goal.repository.port';
import { NutritionGoal } from '../domain/nutrition-goal.model';
import { NutritionGoalEntity } from './nutrition-goal.entity';

@Injectable()
export class NutritionGoalRepositoryAdapter extends NutritionGoalRepositoryPort {
  constructor(
    @InjectRepository(NutritionGoalEntity)
    private readonly repo: Repository<NutritionGoalEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<NutritionGoal[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findByHouseholdAndUser(householdId: string, userId: string): Promise<NutritionGoal | null> {
    const entity = await this.repo.findOne({ where: { householdId, userId } });
    return entity ? entity.toDomain() : null;
  }

  async save(goal: NutritionGoal): Promise<void> {
    await this.repo.save(NutritionGoalEntity.fromDomain(goal));
  }
}
