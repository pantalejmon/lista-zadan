import { IsString, IsNotEmpty, Matches, IsOptional, ValidateIf } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time?: string;

  @ValidateIf((o) => !o.date)
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsString()
  @IsNotEmpty()
  listId!: string;
}
