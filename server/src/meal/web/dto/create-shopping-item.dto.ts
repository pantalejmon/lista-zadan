import { IsString, IsNotEmpty } from 'class-validator';

export class CreateShoppingItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
