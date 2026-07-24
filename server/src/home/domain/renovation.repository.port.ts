import { Renovation } from './renovation.model';

export abstract class RenovationRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<Renovation[]>;
  abstract findById(id: string): Promise<Renovation | null>;
  abstract save(renovation: Renovation): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
