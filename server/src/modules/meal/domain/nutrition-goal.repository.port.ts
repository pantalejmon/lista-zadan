import { NutritionGoal } from './nutrition-goal.model';

export abstract class NutritionGoalRepositoryPort {
  abstract findByHousehold(householdId: string): Promise<NutritionGoal[]>;
  abstract findByHouseholdAndUser(householdId: string, userId: string): Promise<NutritionGoal | null>;
  abstract save(goal: NutritionGoal): Promise<void>;
}
