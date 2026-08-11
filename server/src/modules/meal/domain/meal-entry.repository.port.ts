import { MealEntry } from './meal-entry.model';

export abstract class MealEntryRepositoryPort {
  abstract findByWeek(householdId: string, weekStart: string): Promise<MealEntry[]>;
  abstract findById(id: string): Promise<MealEntry | null>;
  abstract findSlot(
    householdId: string,
    weekStart: string,
    dayOfWeek: number,
    mealType: string,
  ): Promise<MealEntry | null>;
  abstract save(entry: MealEntry): Promise<void>;
  abstract update(entry: MealEntry): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByRecipe(recipeId: string): Promise<void>;
}
