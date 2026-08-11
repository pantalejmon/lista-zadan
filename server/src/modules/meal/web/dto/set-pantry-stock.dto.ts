import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class SetPantryStockDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class AdjustPantryStockDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  delta!: number;
}
