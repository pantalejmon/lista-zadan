import { IsString, IsArray, IsOptional, IsNumber, IsUUID, ArrayNotEmpty, MaxLength, Min, Max } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];

  @IsOptional()
  @IsUUID()
  householdId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}
