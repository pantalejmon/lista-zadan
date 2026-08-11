import { IsString, IsNotEmpty, IsBoolean, IsNumber, MaxLength } from 'class-validator';

export class ShoppingItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  text!: string;

  @IsBoolean()
  checked!: boolean;

  @IsNumber()
  order!: number;
}
