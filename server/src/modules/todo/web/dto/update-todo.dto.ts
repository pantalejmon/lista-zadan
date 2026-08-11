import { IsString, IsBoolean, IsOptional, Matches, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ShoppingItemDto } from './shopping-item.dto';

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ShoppingItemDto)
  items?: ShoppingItemDto[];
}
