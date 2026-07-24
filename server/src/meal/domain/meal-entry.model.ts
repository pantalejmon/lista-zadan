import { randomUUID } from 'crypto';
import { MealType } from './recipe-ingredient';

export interface MealEntryResponse {
  id: string;
  weekStart: string;
  dayOfWeek: number;
  mealType: MealType;
  recipeId: string;
  cooked: boolean;
}

export class MealEntry {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly weekStart: string,
    readonly dayOfWeek: number,
    readonly mealType: MealType,
    readonly recipeId: string,
    readonly cooked: boolean = false,
  ) {}

  static create(
    householdId: string,
    weekStart: string,
    dayOfWeek: number,
    mealType: MealType,
    recipeId: string,
  ): MealEntry {
    return new MealEntry(randomUUID(), householdId, weekStart, dayOfWeek, mealType, recipeId, false);
  }

  withRecipe(recipeId: string): MealEntry {
    // Changing the recipe resets the cooked flag.
    return new MealEntry(this.id, this.householdId, this.weekStart, this.dayOfWeek, this.mealType, recipeId, false);
  }

  withCooked(cooked: boolean): MealEntry {
    return new MealEntry(this.id, this.householdId, this.weekStart, this.dayOfWeek, this.mealType, this.recipeId, cooked);
  }

  toResponse(): MealEntryResponse {
    return {
      id: this.id,
      weekStart: this.weekStart,
      dayOfWeek: this.dayOfWeek,
      mealType: this.mealType,
      recipeId: this.recipeId,
      cooked: this.cooked,
    };
  }
}
