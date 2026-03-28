import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  parseISO,
  format,
  addDays,
} from 'date-fns';
import { Todo } from './todo.model';
import { TodoRepositoryPort } from './todo.repository.port';
import { CreateTodoDto } from '../web/dto/create-todo.dto';
import { UpdateTodoDto } from '../web/dto/update-todo.dto';
import { CreateRecurringTodosDto } from '../web/dto/create-recurring-todos.dto';
import { TodoResponse } from '../web/dto/todo.response';
import { SharingService } from '../../sharing/domain/sharing.service';

export class TodoService {
  constructor(
    private readonly repository: TodoRepositoryPort,
    private readonly sharingService: SharingService,
  ) {}

  async getByDate(date: string, listId: string, userId: string): Promise<TodoResponse[]> {
    await this.sharingService.assertPermission(listId, userId, ['owner', 'editor', 'viewer']);
    const todos = await this.repository.findByDateAndList(date, listId);
    return todos.map((t) => t.toResponse());
  }

  async getAll(listId: string, userId: string): Promise<TodoResponse[]> {
    await this.sharingService.assertPermission(listId, userId, ['owner', 'editor', 'viewer']);
    const todos = await this.repository.findAllByList(listId);
    return todos.map((t) => t.toResponse());
  }

  async create(dto: CreateTodoDto, userId: string): Promise<TodoResponse> {
    await this.sharingService.assertPermission(dto.listId, userId, ['owner', 'editor']);
    const todo = Todo.createFromDto(dto, userId, dto.listId);
    await this.repository.save(todo);
    return todo.toResponse();
  }

  async update(id: string, dto: UpdateTodoDto, userId: string): Promise<TodoResponse> {
    const todo = await this.findTodoWithPermission(id, userId, ['owner', 'editor']);
    const updated = todo.update(dto);
    await this.repository.update(updated);
    return updated.toResponse();
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findTodoWithPermission(id, userId, ['owner', 'editor']);
    await this.repository.delete(id);
  }

  async createRecurring(dto: CreateRecurringTodosDto, userId: string): Promise<TodoResponse[]> {
    await this.sharingService.assertPermission(dto.listId, userId, ['owner', 'editor']);
    const dates = this.generateRecurringDates(dto);
    const groupId = randomUUID();
    const now = Date.now();

    const todos = dates.map((date) =>
      Todo.createRecurring(dto.text, dto.time, groupId, date, now, userId, dto.listId),
    );

    await this.repository.saveMany(todos);
    return todos.map((t) => t.toResponse());
  }

  async deleteRecurrenceGroup(groupId: string): Promise<void> {
    await this.repository.deleteByRecurrenceGroupId(groupId);
  }

  async getUnassigned(listId: string, userId: string): Promise<TodoResponse[]> {
    await this.sharingService.assertPermission(listId, userId, ['owner', 'editor', 'viewer']);
    const todos = await this.repository.findUnassignedByList(listId);
    return todos.map((t) => t.toResponse());
  }

  async getDatesWithTodos(listId: string, userId: string): Promise<string[]> {
    await this.sharingService.assertPermission(listId, userId, ['owner', 'editor', 'viewer']);
    return this.repository.findDistinctDatesByList(listId);
  }

  private async findTodoWithPermission(
    id: string,
    userId: string,
    requiredRoles: ('owner' | 'editor' | 'viewer')[],
  ): Promise<Todo> {
    const todo = await this.repository.findById(id);
    if (!todo) {
      throw new NotFoundException(`Todo ${id} not found`);
    }
    if (todo.listId) {
      await this.sharingService.assertPermission(todo.listId, userId, requiredRoles);
    } else if (todo.userId !== userId) {
      throw new NotFoundException(`Todo ${id} not found`);
    }
    return todo;
  }

  private generateRecurringDates(dto: CreateRecurringTodosDto): string[] {
    const start = parseISO(dto.dateFrom);
    const end = parseISO(dto.dateTo);

    let dates: Date[];
    switch (dto.type) {
      case 'daily':
        dates = eachDayOfInterval({ start, end });
        break;
      case 'weekly': {
        const startDay = start.getDay();
        dates = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
          .map((d) => {
            const diff = (startDay - d.getDay() + 7) % 7;
            return addDays(d, diff);
          })
          .filter((d) => d >= start && d <= end);
        break;
      }
      case 'monthly':
        dates = eachMonthOfInterval({ start, end })
          .map((d) => {
            const day = start.getDate();
            const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            return new Date(d.getFullYear(), d.getMonth(), Math.min(day, maxDay));
          })
          .filter((d) => d >= start && d <= end);
        break;
    }

    return dates.map((d) => format(d, 'yyyy-MM-dd'));
  }
}
