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

export class TodoService {
  constructor(private readonly repository: TodoRepositoryPort) {}

  async getByDate(date: string): Promise<TodoResponse[]> {
    const todos = await this.repository.findByDate(date);
    return todos.map((t) => t.toResponse());
  }

  async getAll(): Promise<TodoResponse[]> {
    const todos = await this.repository.findAll();
    return todos.map((t) => t.toResponse());
  }

  async create(dto: CreateTodoDto): Promise<TodoResponse> {
    const todo = new Todo(
      randomUUID(),
      dto.text,
      false,
      dto.date,
      dto.time ?? null,
      Date.now(),
      null,
    );
    await this.repository.save(todo);
    return todo.toResponse();
  }

  async update(id: string, dto: UpdateTodoDto): Promise<TodoResponse> {
    const todo = await this.repository.findById(id);
    if (!todo) {
      throw new NotFoundException(`Todo ${id} not found`);
    }
    const updated = todo.update(dto);
    await this.repository.update(updated);
    return updated.toResponse();
  }

  async delete(id: string): Promise<void> {
    const todo = await this.repository.findById(id);
    if (!todo) {
      throw new NotFoundException(`Todo ${id} not found`);
    }
    await this.repository.delete(id);
  }

  async createRecurring(dto: CreateRecurringTodosDto): Promise<TodoResponse[]> {
    const dates = this.generateRecurringDates(dto);
    const groupId = randomUUID();
    const now = Date.now();

    const todos = dates.map(
      (date) =>
        new Todo(
          randomUUID(),
          dto.text,
          false,
          date,
          dto.time ?? null,
          now,
          groupId,
        ),
    );

    await this.repository.saveMany(todos);
    return todos.map((t) => t.toResponse());
  }

  async deleteRecurrenceGroup(groupId: string): Promise<void> {
    await this.repository.deleteByRecurrenceGroupId(groupId);
  }

  async getDatesWithTodos(): Promise<string[]> {
    return this.repository.findDistinctDates();
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
