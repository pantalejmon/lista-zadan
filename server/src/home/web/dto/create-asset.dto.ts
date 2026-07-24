import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(60)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  installedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  warrantyUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
