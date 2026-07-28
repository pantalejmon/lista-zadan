import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, IsBoolean, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { BaseUnit } from '../../domain/product.model';
import { NutritionDto } from './nutrition.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsIn(['g', 'ml', 'szt'])
  baseUnit!: BaseUnit;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packageSize?: number;

  @IsOptional()
  @IsBoolean()
  trackInPantry?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionDto)
  nutrition?: NutritionDto;
}
