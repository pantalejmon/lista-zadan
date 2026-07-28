import { randomUUID } from 'crypto';
import { MealType } from './recipe-ingredient';
import { MealParticipant } from './meal-participant';
import { IngredientOverride } from './ingredient-override';
import { CustomMeal } from './custom-meal';

export interface MealEntryResponse {
  id: string;
  weekStart: string;
  dayOfWeek: number;
  mealType: MealType;
  // Wpis to **albo** przepis (`recipeId`), **albo** posiłek doraźny (`custom`).
  recipeId: string | null;
  custom: CustomMeal | null;
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
    readonly recipeId: string | null,
    readonly custom: CustomMeal | null = null,
    readonly cooked: boolean = false,
    readonly participants: MealParticipant[] = [],
    // Korekty zrobione w slocie — patrz `effective-ingredients.ts`.
    readonly portionScale: number = 1,
    readonly ingredientOverrides: IngredientOverride[] = [],
  ) {}

  static createFromRecipe(
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
      null,
      false,
      participants,
    );
  }

  // Posiłek doraźny — bez przepisu, ale ze składnikami, więc liczy się tak samo
  // do zakupów, spiżarni i bilansu.
  static createCustom(
    householdId: string,
    weekStart: string,
    dayOfWeek: number,
    mealType: MealType,
    custom: CustomMeal,
    participants: MealParticipant[] = [],
  ): MealEntry {
    return new MealEntry(
      randomUUID(),
      householdId,
      weekStart,
      dayOfWeek,
      mealType,
      null,
      custom,
      false,
      participants,
    );
  }

  // Tytuł do pokazania na kaflu: przepis nie jest tu dostępny, więc dla wpisów
  // przepisowych zwraca null i wołający dokleja tytuł przepisu.
  get title(): string | null {
    return this.custom?.title ?? null;
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
      null,
      false,
      this.participants,
      1,
      [],
    );
  }

  // Podmiana zawartości slotu na posiłek doraźny — jak `withRecipe`, kasuje
  // `cooked` i korekty (dotyczyły innego dania).
  withCustom(custom: CustomMeal): MealEntry {
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      null,
      custom,
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
      this.custom,
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
      this.custom,
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
      this.custom,
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
      custom: this.custom,
      cooked: this.cooked,
      participants: this.participants,
      portionScale: this.portionScale,
      ingredientOverrides: this.ingredientOverrides,
    };
  }
}
