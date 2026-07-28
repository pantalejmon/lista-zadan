import { IsNumber, IsOptional, Min } from 'class-validator';

// Wartości na 100 g / 100 ml, a dla produktów w `szt` — na 1 sztukę.
// kcal i makroskładniki są wymagane, gdy blok w ogóle zostanie podany:
// pół etykiety znaczy cicho zaniżone makro przepisu.
export class NutritionDto {
  @IsNumber()
  @Min(0)
  kcal!: number;

  @IsNumber()
  @Min(0)
  protein!: number;

  @IsNumber()
  @Min(0)
  fat!: number;

  @IsNumber()
  @Min(0)
  carbs!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salt?: number;
}
