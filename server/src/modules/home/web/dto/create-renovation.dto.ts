import { IsString, IsOptional, IsNumber, IsIn, IsArray, IsBoolean, Min, MaxLength, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ChecklistItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(300)
  text!: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export class CreateRenovationDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsIn(['planned', 'in_progress', 'done'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];
}
