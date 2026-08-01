import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateShoppingItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  // Ilość i jednostka są opcjonalne, ale bez nich odhaczenie pozycji nie rusza
  // spiżarni — nie wiadomo, ile czego przybyło.
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;
}
