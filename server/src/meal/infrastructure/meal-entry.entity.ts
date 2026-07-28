import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { MealEntry } from '../domain/meal-entry.model';
import { MealType } from '../domain/recipe-ingredient';
import { MealParticipant } from '../domain/meal-participant';

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

  // Uczestnicy jako JSON — jak składniki przepisu. Dane są tygodniowej skali
  // i zawsze czytane razem z wpisem, więc osobna tabela nic by nie kupiła.
  @Column('text', { nullable: true })
  participants!: string | null;

  toDomain(): MealEntry {
    return new MealEntry(
      this.id,
      this.householdId,
      this.weekStart,
      this.dayOfWeek,
      this.mealType,
      this.recipeId,
      this.cooked,
      parseParticipants(this.participants),
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
    entity.participants = JSON.stringify(entry.participants);
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
