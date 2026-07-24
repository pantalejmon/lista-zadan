import { IsBoolean } from 'class-validator';

export class SetCookedDto {
  @IsBoolean()
  cooked!: boolean;
}
