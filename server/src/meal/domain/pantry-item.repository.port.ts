import { PantryItem } from './pantry-item.model';

export abstract class PantryItemRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<PantryItem[]>;
  abstract findByHouseholdAndProduct(householdId: string, productId: string): Promise<PantryItem | null>;
  abstract findById(id: string): Promise<PantryItem | null>;
  abstract save(item: PantryItem): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
