import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateTodoListDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
