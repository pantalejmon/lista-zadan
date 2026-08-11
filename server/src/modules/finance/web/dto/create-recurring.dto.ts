import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsIn, MaxLength } from 'class-validator';
import type { RecurrenceFrequency } from '../../domain/finance-category';

export class CreateRecurringDto {
  @IsUUID()
  walletId!: string;

  // Positive = income, negative = expense.
  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsIn(['daily', 'weekly', 'monthly'])
  frequency!: RecurrenceFrequency;

  // YYYY-MM-DD; defaults to tomorrow.
  @IsOptional()
  @IsString()
  @MaxLength(10)
  nextDueAt?: string;
}
