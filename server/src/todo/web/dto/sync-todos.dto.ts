import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';

class SyncTodoData {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsBoolean()
  completed!: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time?: string | null;

  @IsNumber()
  createdAt!: number;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;

  @IsOptional()
  @IsString()
  recurrenceGroupId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string | null;

  @IsString()
  @IsNotEmpty()
  listId!: string;
}

export class SyncOperationDto {
  @IsEnum(['create', 'update', 'delete'])
  type!: 'create' | 'update' | 'delete';

  @ValidateNested()
  @Type(() => SyncTodoData)
  todo!: SyncTodoData;

  @IsNumber()
  timestamp!: number;
}

export class SyncTodosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}
