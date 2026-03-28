import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';

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
}
