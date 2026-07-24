import { randomUUID } from 'crypto';
import { MealType } from './recipe-ingredient';

export interface MealEntryResponse {
  id: string;
  weekStart: string;
  dayOfWeek: number;
  mealType: MealType;
  recipeId: string;
}

export class MealEntry {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly weekStart: string,
    readonly dayOfWeek: number,
    readonly mealType: MealType,
    readonly recipeId: string,
  ) {}

  static create(
    householdId: string,
    weekStart: string,
    dayOfWeek: number,
    mealType: MealType,
    recipeId: string,
  ): MealEntry {
    return new MealEntry(randomUUID(), householdId, weekStart, dayOfWeek, mealType, recipeId);
  }

  withRecipe(recipeId: string): MealEntry {
    return new MealEntry(this.id, this.householdId, this.weekStart, this.dayOfWeek, this.mealType, recipeId);
  }

  toResponse(): MealEntryResponse {
    return {
      id: this.id,
      weekStart: this.weekStart,
      dayOfWeek: this.dayOfWeek,
      mealType: this.mealType,
      recipeId: this.recipeId,
    };
  }
}
