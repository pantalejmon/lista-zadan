import { IsString, IsNotEmpty, Matches, IsInt, Min, Max, IsIn } from 'class-validator';
import { MealType } from '../../domain/recipe-ingredient';

export class CreateEntryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])
  mealType!: MealType;

  @IsString()
  @IsNotEmpty()
  recipeId!: string;
}
