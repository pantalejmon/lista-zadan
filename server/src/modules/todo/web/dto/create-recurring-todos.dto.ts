import { IsString, IsNotEmpty, IsOptional, IsIn, Matches } from 'class-validator';

export class CreateRecurringTodosDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time?: string;

  @IsString()
  @IsIn(['daily', 'weekly', 'monthly'])
  type!: 'daily' | 'weekly' | 'monthly';

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo!: string;

  @IsString()
  @IsNotEmpty()
  listId!: string;
}
