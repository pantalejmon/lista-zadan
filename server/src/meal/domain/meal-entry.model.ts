import { randomUUID } from 'crypto';
import { MealType } from './recipe-ingredient';
import { MealParticipant } from './meal-participant';
import { IngredientOverride } from './ingredient-override';

export interface MealEntryResponse {
  id: string;
  weekStart: string;
  dayOfWeek: number;
  mealType: MealType;
  recipeId: string;
  cooked: boolean;
  participants: MealParticipant[];
  portionScale: number;
  ingredientOverrides: IngredientOverride[];
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
    // Korekty zrobione w slocie — patrz `effective-ingredients.ts`.
    readonly portionScale: number = 1,
    readonly ingredientOverrides: IngredientOverride[] = [],
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
    // Zmiana przepisu w slocie kasuje `cooked` **oraz korekty ilości** — te
    // dotyczyły innego dania, a zostawione odjęłyby ze spiżarni ilości z
    // poprzedniego przepisu. Uczestnicy zostają: ten sam slot i te same osoby,
    // zmienia się tylko danie.
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      recipeId,
      false,
      this.participants,
      1,
      [],
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
      this.portionScale,
      this.ingredientOverrides,
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
      this.portionScale,
      this.ingredientOverrides,
    );
  }

  withAdjustments(portionScale: number, ingredientOverrides: IngredientOverride[]): MealEntry {
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      this.recipeId,
      this.cooked,
      this.participants,
      portionScale,
      ingredientOverrides,
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
      portionScale: this.portionScale,
      ingredientOverrides: this.ingredientOverrides,
    };
  }
}
