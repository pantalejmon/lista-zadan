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
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { TodoService } from '../domain/todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { CreateRecurringTodosDto } from './dto/create-recurring-todos.dto';
import { SyncTodosDto } from './dto/sync-todos.dto';
import { SyncOperationResultResponse } from './dto/sync-result.response';
import { TodoResponse } from './dto/todo.response';
import { JwtAuthGuard } from '@platform/auth/web/jwt-auth.guard';
import { User } from '@platform/auth/domain/user.model';
import { RateLimiterGuard } from './rate-limiter.guard';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodoController {
  constructor(
    private readonly todoService: TodoService,
  ) {}

  @Get()
  getAll(
    @Req() req: Request,
    @Query('date') date?: string,
    @Query('listId') listId?: string,
  ): Promise<TodoResponse[]> {
    const userId = (req.user as User).id;
    if (!listId) {
      throw new BadRequestException('listId query parameter is required');
    }
    if (date) {
      return this.todoService.getByDate(date, listId, userId);
    }
    return this.todoService.getAll(listId, userId);
  }

  @Post()
  @UseGuards(RateLimiterGuard)
  async create(@Req() req: Request, @Body() dto: CreateTodoDto): Promise<TodoResponse> {
    const userId = (req.user as User).id;
    return this.todoService.create(dto, userId);
  }

  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
  ): Promise<TodoResponse> {
    const userId = (req.user as User).id;
    return this.todoService.update(id, dto, userId);
  }

  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string): Promise<void> {
    const userId = (req.user as User).id;
    await this.todoService.delete(id, userId);
  }

  @Post('recurring')
  @UseGuards(RateLimiterGuard)
  async createRecurring(@Req() req: Request, @Body() dto: CreateRecurringTodosDto): Promise<TodoResponse[]> {
    const userId = (req.user as User).id;
    return this.todoService.createRecurring(dto, userId);
  }

  @Delete('recurrence-group/:groupId')
  async deleteRecurrenceGroup(
    @Req() req: Request,
    @Param('groupId') groupId: string,
  ): Promise<void> {
    const userId = (req.user as User).id;
    await this.todoService.getListIdForRecurrenceGroup(groupId, userId);
    await this.todoService.deleteRecurrenceGroup(groupId, userId);
  }

  @Post('sync')
  async sync(@Req() req: Request, @Body() dto: SyncTodosDto): Promise<SyncOperationResultResponse[]> {
    const userId = (req.user as User).id;
    return this.todoService.syncOperations(dto.operations, userId);
  }

  @Get('unassigned')
  getUnassigned(@Req() req: Request, @Query('listId') listId?: string): Promise<TodoResponse[]> {
    const userId = (req.user as User).id;
    if (!listId) {
      throw new BadRequestException('listId query parameter is required');
    }
    return this.todoService.getUnassigned(listId, userId);
  }

  @Get('dates-with-todos')
  getDatesWithTodos(@Req() req: Request, @Query('listId') listId?: string): Promise<string[]> {
    const userId = (req.user as User).id;
    if (!listId) {
      throw new BadRequestException('listId query parameter is required');
    }
    return this.todoService.getDatesWithTodos(listId, userId);
  }
}
