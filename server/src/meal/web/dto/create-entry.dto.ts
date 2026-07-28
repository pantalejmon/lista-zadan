import { IsString, IsNotEmpty, Matches, IsInt, Min, Max, IsIn, IsOptional, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { MealType } from '../../domain/recipe-ingredient';
import { MealParticipantDto } from './meal-participant.dto';
import { CustomMealDto } from './custom-meal.dto';

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

  // Wpis to albo przepis, albo posiłek doraźny — walidacja „dokładnie jedno z nich"
  // siedzi w serwisie, bo dotyczy relacji między polami, nie pojedynczego pola.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  recipeId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomMealDto)
  custom?: CustomMealDto;

  // Kto je ten posiłek — opcjonalnie już przy planowaniu, żeby nie trzeba było
  // drugiego żądania.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MealParticipantDto)
  participants?: MealParticipantDto[];
}
