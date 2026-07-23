import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, ValidateNested, Matches, IsIn, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { TodoKind } from '../../domain/todo.model';
import { ShoppingItemDto } from './shopping-item.dto';

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

  @IsOptional()
  @IsIn(['task', 'shopping'])
  kind?: TodoKind;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ShoppingItemDto)
  items?: ShoppingItemDto[] | null;
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
