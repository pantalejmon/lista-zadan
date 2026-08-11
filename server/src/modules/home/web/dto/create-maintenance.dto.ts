import { IsString, IsOptional, IsNumber, IsUUID, Min, MaxLength } from 'class-validator';

export class CreateMaintenanceDto {
  @IsUUID()
  assetId!: string;

  @IsString()
  @MaxLength(120)
  type!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  intervalMonths?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lastDoneAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  nextDueAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;
}
