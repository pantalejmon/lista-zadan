import { IsString, IsOptional, IsNumber } from 'class-validator';

export class RecipeIngredientDto {
  @IsOptional()
  @IsString()
  ingredientId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}
