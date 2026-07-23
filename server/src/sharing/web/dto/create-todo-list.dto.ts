import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTodoListDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  householdId?: string;
}
