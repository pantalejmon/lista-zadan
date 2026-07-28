import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, MaxLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RecipeIngredientDto } from './recipe-ingredient.dto';

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  instructions!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  recipeIngredients?: RecipeIngredientDto[];

  // Na ile porcji jest przepis — dzielnik dla wartości „na porcję". Domyślnie 1.
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;
}
