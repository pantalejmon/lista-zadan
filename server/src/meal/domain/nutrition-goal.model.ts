import { randomUUID } from 'crypto';
import { Nutrition } from './nutrition';

export interface NutritionGoalResponse {
  userId: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

// Dzienny cel odżywczy domownika. Trzymany **per gospodarstwo**, a nie
// w ustawieniach użytkownika: cel dziecku ustawia rodzic, a ta sama osoba
// w dwóch domach może mieć różne ustalenia.
export class NutritionGoal {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly userId: string,
    readonly kcal: number,
    readonly protein: number,
    readonly fat: number,
    readonly carbs: number,
  ) {}

  static create(householdId: string, userId: string, target: Nutrition): NutritionGoal {
    return new NutritionGoal(
      randomUUID(),
      householdId,
      userId,
      target.kcal,
      target.protein,
      target.fat,
      target.carbs,
    );
  }

  withTarget(target: Nutrition): NutritionGoal {
    return new NutritionGoal(
      this.id,
      this.householdId,
      this.userId,
      target.kcal,
      target.protein,
      target.fat,
      target.carbs,
    );
  }

  toResponse(): NutritionGoalResponse {
    return {
      userId: this.userId,
      kcal: this.kcal,
      protein: this.protein,
      fat: this.fat,
      carbs: this.carbs,
    };
  }
}
