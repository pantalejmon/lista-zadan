import { Recipe } from './recipe.model';

export abstract class RecipeRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<Recipe[]>;
  abstract findById(id: string): Promise<Recipe | null>;
  abstract save(recipe: Recipe): Promise<void>;
  abstract update(recipe: Recipe): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
