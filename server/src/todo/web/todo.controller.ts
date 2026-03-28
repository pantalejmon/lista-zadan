import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TodoService } from '../domain/todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { CreateRecurringTodosDto } from './dto/create-recurring-todos.dto';
import { TodoResponse } from './dto/todo.response';
import { JwtAuthGuard } from '../../auth/web/jwt-auth.guard';
import { User } from '../../auth/domain/user.model';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  getAll(@Req() req: Request, @Query('date') date?: string): Promise<TodoResponse[]> {
    const userId = (req.user as User).id;
    if (date) {
      return this.todoService.getByDate(date, userId);
    }
    return this.todoService.getAll(userId);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateTodoDto): Promise<TodoResponse> {
    const userId = (req.user as User).id;
    return this.todoService.create(dto, userId);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
  ): Promise<TodoResponse> {
    const userId = (req.user as User).id;
    return this.todoService.update(id, dto, userId);
  }

  @Delete(':id')
  delete(@Req() req: Request, @Param('id') id: string): Promise<void> {
    const userId = (req.user as User).id;
    return this.todoService.delete(id, userId);
  }

  @Post('recurring')
  createRecurring(@Req() req: Request, @Body() dto: CreateRecurringTodosDto): Promise<TodoResponse[]> {
    const userId = (req.user as User).id;
    return this.todoService.createRecurring(dto, userId);
  }

  @Delete('recurrence-group/:groupId')
  deleteRecurrenceGroup(@Param('groupId') groupId: string): Promise<void> {
    return this.todoService.deleteRecurrenceGroup(groupId);
  }

  @Get('dates-with-todos')
  getDatesWithTodos(@Req() req: Request): Promise<string[]> {
    const userId = (req.user as User).id;
    return this.todoService.getDatesWithTodos(userId);
  }
}
