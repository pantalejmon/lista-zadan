import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TodoService } from '../domain/todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { CreateRecurringTodosDto } from './dto/create-recurring-todos.dto';
import { TodoResponse } from './dto/todo.response';

@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  getAll(@Query('date') date?: string): Promise<TodoResponse[]> {
    if (date) {
      return this.todoService.getByDate(date);
    }
    return this.todoService.getAll();
  }

  @Post()
  create(@Body() dto: CreateTodoDto): Promise<TodoResponse> {
    return this.todoService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
  ): Promise<TodoResponse> {
    return this.todoService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<void> {
    return this.todoService.delete(id);
  }

  @Post('recurring')
  createRecurring(@Body() dto: CreateRecurringTodosDto): Promise<TodoResponse[]> {
    return this.todoService.createRecurring(dto);
  }

  @Delete('recurrence-group/:groupId')
  deleteRecurrenceGroup(@Param('groupId') groupId: string): Promise<void> {
    return this.todoService.deleteRecurrenceGroup(groupId);
  }

  @Get('dates-with-todos')
  getDatesWithTodos(): Promise<string[]> {
    return this.todoService.getDatesWithTodos();
  }
}
