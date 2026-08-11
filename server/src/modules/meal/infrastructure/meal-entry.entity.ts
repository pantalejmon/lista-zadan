import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { MealEntry } from '../domain/meal-entry.model';
import { MealType } from '../domain/recipe-ingredient';
import { MealParticipant } from '../domain/meal-participant';
import { IngredientOverride } from '../domain/ingredient-override';
import { RecipeIngredient } from '../domain/recipe-ingredient';

@Entity('meal_entry')
export class MealEntryEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  weekStart!: string;

  @Column('int')
  dayOfWeek!: number;

  @Column('varchar')
  mealType!: MealType;

  // Wpis to albo przepis, albo posiłek doraźny — stąd oba pola nullable.
  @Column('varchar', { nullable: true })
  recipeId!: string | null;

  @Column('varchar', { nullable: true })
  customTitle!: string | null;

  @Column('text', { nullable: true })
  customIngredients!: string | null;

  @Column('boolean', { default: false })
  cooked!: boolean;

  // Uczestnicy jako JSON — jak składniki przepisu. Dane są tygodniowej skali
  // i zawsze czytane razem z wpisem, więc osobna tabela nic by nie kupiła.
  @Column('text', { nullable: true })
  participants!: string | null;

  // Korekty zrobione w slocie: mnożnik porcji i bezwzględne nadpisania ilości.
  @Column('float', { default: 1 })
  portionScale!: number;

  @Column('text', { nullable: true })
  ingredientOverrides!: string | null;

  toDomain(): MealEntry {
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      this.recipeId,
      this.customTitle === null
        ? null
        : { title: this.customTitle, ingredients: parseIngredients(this.customIngredients) },
      this.cooked,
      parseParticipants(this.participants),
      this.portionScale === null || this.portionScale === undefined ? 1 : Number(this.portionScale),
      parseOverrides(this.ingredientOverrides),
    );
  }

  static fromDomain(entry: MealEntry): MealEntryEntity {
    const entity = new MealEntryEntity();
    entity.id = entry.id;
    entity.householdId = entry.householdId;
    entity.weekStart = entry.weekStart;
    entity.dayOfWeek = entry.dayOfWeek;
    entity.mealType = entry.mealType;
    entity.recipeId = entry.recipeId;
    entity.customTitle = entry.custom?.title ?? null;
    entity.customIngredients = entry.custom ? JSON.stringify(entry.custom.ingredients) : null;
    entity.cooked = entry.cooked;
    entity.participants = JSON.stringify(entry.participants);
    entity.portionScale = entry.portionScale;
    entity.ingredientOverrides = JSON.stringify(entry.ingredientOverrides);
    return entity;
  }
}

function parseParticipants(raw: string | null): MealParticipant[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (p): p is MealParticipant =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as MealParticipant).userId === 'string' &&
        typeof (p as MealParticipant).portions === 'number',
    );
  } catch {
    return [];
  }
}

function parseOverrides(raw: string | null): IngredientOverride[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (o): o is IngredientOverride =>
        typeof o === 'object' &&
        o !== null &&
        typeof (o as IngredientOverride).ingredientId === 'string' &&
        typeof (o as IngredientOverride).quantity === 'number',
    );
  } catch {
    return [];
  }
}

function parseIngredients(raw: string | null): RecipeIngredient[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (i): i is RecipeIngredient =>
        typeof i === 'object' &&
        i !== null &&
        typeof (i as RecipeIngredient).name === 'string' &&
        typeof (i as RecipeIngredient).unit === 'string',
    );
  } catch {
    return [];
  }
}
