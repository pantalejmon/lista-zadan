import { MealShoppingItem } from './meal-shopping-item.model';

export abstract class MealShoppingItemRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<MealShoppingItem[]>;
  abstract findById(id: string): Promise<MealShoppingItem | null>;
  abstract save(item: MealShoppingItem): Promise<void>;
  abstract saveMany(items: MealShoppingItem[]): Promise<void>;
  abstract update(item: MealShoppingItem): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
