import { IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class CompleteMaintenanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  doneAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
