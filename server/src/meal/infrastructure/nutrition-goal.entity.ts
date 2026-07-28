import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { NutritionGoal } from '../domain/nutrition-goal.model';

@Entity('meal_nutrition_goal')
export class NutritionGoalEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  userId!: string;

  @Column('float')
  kcal!: number;

  @Column('float')
  protein!: number;

  @Column('float')
  fat!: number;

  @Column('float')
  carbs!: number;

  toDomain(): NutritionGoal {
    return new NutritionGoal(
      this.id,
      this.householdId,
      this.userId,
      Number(this.kcal),
      Number(this.protein),
      Number(this.fat),
      Number(this.carbs),
    );
  }

  static fromDomain(goal: NutritionGoal): NutritionGoalEntity {
    const entity = new NutritionGoalEntity();
    entity.id = goal.id;
    entity.householdId = goal.householdId;
    entity.userId = goal.userId;
    entity.kcal = goal.kcal;
    entity.protein = goal.protein;
    entity.fat = goal.fat;
    entity.carbs = goal.carbs;
    return entity;
  }
}
