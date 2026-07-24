import { IsString, IsNotEmpty } from 'class-validator';

export class CreateHouseholdDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
