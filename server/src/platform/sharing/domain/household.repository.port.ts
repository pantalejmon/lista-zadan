import { Household } from './household.model';

export abstract class HouseholdRepositoryPort {
  abstract findById(id: string): Promise<Household | null>;
  abstract findByIds(ids: string[]): Promise<Household[]>;
  abstract save(household: Household): Promise<void>;
  abstract update(household: Household): Promise<void>;
}
