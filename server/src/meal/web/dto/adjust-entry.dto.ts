import { IsOptional, IsNumber, Min, Max, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { IngredientOverrideDto } from './ingredient-override.dto';

// Korekta wpisu planera. Oba pola są opcjonalne, ale podanie ich pustych ma
// znaczenie: `portionScale: 1` i `overrides: []` to powrót do przepisu.
export class AdjustEntryDto {
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(10)
  portionScale?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => IngredientOverrideDto)
  ingredientOverrides?: IngredientOverrideDto[];
}
