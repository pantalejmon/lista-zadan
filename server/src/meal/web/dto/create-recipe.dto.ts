import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RecipeIngredientDto } from './recipe-ingredient.dto';

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

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
}
