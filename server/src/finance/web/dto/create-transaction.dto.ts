import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateTransactionDto {
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

  // Epoch ms; defaults to now.
  @IsOptional()
  @IsNumber()
  @Min(0)
  occurredAt?: number;
}
