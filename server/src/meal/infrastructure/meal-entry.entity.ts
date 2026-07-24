import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { MealEntry } from '../domain/meal-entry.model';
import { MealType } from '../domain/recipe-ingredient';

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

  @Column('varchar')
  recipeId!: string;

  @Column('boolean', { default: false })
  cooked!: boolean;

  toDomain(): MealEntry {
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      this.recipeId,
      this.cooked,
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
    entity.cooked = entry.cooked;
    return entity;
  }
}
