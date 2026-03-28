import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTodoListDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
