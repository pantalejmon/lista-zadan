import { randomUUID } from 'crypto';
import { MealType } from './recipe-ingredient';
import { MealParticipant } from './meal-participant';

export interface MealEntryResponse {
  id: string;
  weekStart: string;
  dayOfWeek: number;
  mealType: MealType;
  recipeId: string;
  cooked: boolean;
  participants: MealParticipant[];
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
    readonly participants: MealParticipant[] = [],
  ) {}

  static create(
    householdId: string,
    weekStart: string,
    dayOfWeek: number,
    mealType: MealType,
    recipeId: string,
    participants: MealParticipant[] = [],
  ): MealEntry {
    return new MealEntry(
      randomUUID(),
      householdId,
      weekStart,
      dayOfWeek,
      mealType,
      recipeId,
      false,
      participants,
    );
  }

  withRecipe(recipeId: string): MealEntry {
    // Changing the recipe resets the cooked flag. Uczestnicy zostają — to ten sam
    // slot i te same osoby, zmienia się tylko danie.
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      recipeId,
      false,
      this.participants,
    );
  }

  withCooked(cooked: boolean): MealEntry {
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      this.recipeId,
      cooked,
      this.participants,
    );
  }

  withParticipants(participants: MealParticipant[]): MealEntry {
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      this.recipeId,
      this.cooked,
      participants,
    );
  }

  toResponse(): MealEntryResponse {
    return {
      id: this.id,
      weekStart: this.weekStart,
      dayOfWeek: this.dayOfWeek,
      mealType: this.mealType,
      recipeId: this.recipeId,
      cooked: this.cooked,
      participants: this.participants,
    };
  }
}
