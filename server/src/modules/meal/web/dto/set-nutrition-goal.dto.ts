import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

// Cel dzienny domownika. Górne limity są zdroworozsądkowe — chronią wykresy
// przed literówką („20000 kcal”), a nie oceniają czyjejś diety.
export class SetNutritionGoalDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber()
  @Min(1)
  @Max(10000)
  kcal!: number;

  @IsNumber()
  @Min(0)
  @Max(1000)
  protein!: number;

  @IsNumber()
  @Min(0)
  @Max(1000)
  fat!: number;

  @IsNumber()
  @Min(0)
  @Max(1000)
  carbs!: number;
}
