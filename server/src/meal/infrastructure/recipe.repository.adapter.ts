import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecipeRepositoryPort } from '../domain/recipe.repository.port';
import { Recipe } from '../domain/recipe.model';
import { RecipeEntity } from './recipe.entity';

@Injectable()
export class RecipeRepositoryAdapter extends RecipeRepositoryPort {
  constructor(
    @InjectRepository(RecipeEntity)
    private readonly repo: Repository<RecipeEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string): Promise<Recipe[]> {
    const entities = await this.repo.find({ where: { householdId } });
    return entities.map((e) => e.toDomain());
  }

  async findById(id: string): Promise<Recipe | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async save(recipe: Recipe): Promise<void> {
    await this.repo.save(RecipeEntity.fromDomain(recipe));
  }

  async update(recipe: Recipe): Promise<void> {
    await this.repo.save(RecipeEntity.fromDomain(recipe));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
