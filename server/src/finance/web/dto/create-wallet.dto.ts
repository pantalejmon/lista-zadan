import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}
