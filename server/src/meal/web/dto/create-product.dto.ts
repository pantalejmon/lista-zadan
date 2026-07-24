import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, IsBoolean, Min } from 'class-validator';
import type { BaseUnit } from '../../domain/product.model';

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
}
