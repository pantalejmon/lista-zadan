import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class IngredientOverrideDto {
  @IsString()
  @IsNotEmpty()
  ingredientId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;
}
