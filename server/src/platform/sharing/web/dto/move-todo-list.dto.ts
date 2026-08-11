import { IsString, IsNotEmpty } from 'class-validator';

export class MoveTodoListDto {
  @IsString()
  @IsNotEmpty()
  householdId!: string;
}
