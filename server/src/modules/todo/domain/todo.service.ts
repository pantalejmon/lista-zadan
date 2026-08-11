import { randomUUID } from 'crypto';
import { Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { SyncOperationDto } from '../web/dto/sync-todos.dto';
import { TodoResponse } from '../web/dto/todo.response';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { UserRepositoryPort } from '@platform/auth/domain/user.repository.port';
import { TodosGateway } from '../web/todos.gateway';

function todoStorageBytes(todo: Todo): number {
  const itemsBytes = todo.items
    ? todo.items.reduce((sum, i) => sum + Buffer.byteLength(i.text, 'utf8') + 80, 0)
    : 0;
  return Buffer.byteLength(todo.text, 'utf8') + 200 + itemsBytes;
}

// Powiadomienia WebSocket wychodzą **z serwisu**, nie z kontrolera: każda ścieżka
// zmiany — REST, narzędzia MCP, przyszłe integracje — musi odświeżać otwartych
// klientów tak samo. Gdy siedziały w kontrolerze, zmiany zrobione przez agenta
// były niewidoczne do czasu przeładowania strony (#97).
@Injectable()
export class TodoService {
  constructor(
    private readonly repository: TodoRepositoryPort,
    private readonly sharingService: SharingService,
    private readonly userRepository: UserRepositoryPort,
    private readonly configService: ConfigService,
    private readonly gateway: TodosGateway,
  ) {}

  private get maxStorageBytes(): number {
    return this.configService.get<number>('storage.maxBytesPerUser', 52_428_800);
  }

  private async assertQuota(userId: string, additionalBytes: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    const used = user?.usedStorageBytes ?? 0;
    if (used + additionalBytes > this.maxStorageBytes) {
      throw new PayloadTooLargeException('Storage quota exceeded');
    }
  }

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
    const bytes = todoStorageBytes(todo);
    await this.assertQuota(userId, bytes);
    await this.repository.save(todo);
    await this.userRepository.addStorageUsed(userId, bytes);
    const response = todo.toResponse();
    this.gateway.notifyTodoCreated(dto.listId, response);
    return response;
  }

  async update(id: string, dto: UpdateTodoDto, userId: string): Promise<TodoResponse> {
    const todo = await this.findTodoWithPermission(id, userId, ['owner', 'editor']);
    const updated = todo.update(dto);
    const delta = todoStorageBytes(updated) - todoStorageBytes(todo);
    if (delta > 0) {
      await this.assertQuota(userId, delta);
    }
    await this.repository.update(updated);
    if (delta !== 0) {
      await this.userRepository.addStorageUsed(userId, delta);
    }
    const response = updated.toResponse();
    if (response.listId) {
      this.gateway.notifyTodoUpdated(response.listId, response);
    }
    return response;
  }

  async findById(id: string): Promise<Todo | null> {
    return this.repository.findById(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const todo = await this.findTodoWithPermission(id, userId, ['owner', 'editor']);
    const bytes = todoStorageBytes(todo);
    await this.repository.delete(id);
    await this.userRepository.addStorageUsed(userId, -bytes);
    if (todo.listId) {
      this.gateway.notifyTodoDeleted(todo.listId, id);
    }
  }

  async createRecurring(dto: CreateRecurringTodosDto, userId: string): Promise<TodoResponse[]> {
    await this.sharingService.assertPermission(dto.listId, userId, ['owner', 'editor']);
    const dates = this.generateRecurringDates(dto);
    const groupId = randomUUID();
    const now = Date.now();

    const todos = dates.map((date) =>
      Todo.createRecurring(dto.text, dto.time, groupId, date, now, userId, dto.listId),
    );

    const totalBytes = todos.reduce((sum, t) => sum + todoStorageBytes(t), 0);
    await this.assertQuota(userId, totalBytes);
    await this.repository.saveMany(todos);
    await this.userRepository.addStorageUsed(userId, totalBytes);
    const responses = todos.map((t) => t.toResponse());
    this.gateway.notifyRecurrenceCreated(dto.listId, responses);
    return responses;
  }

  async getListIdForRecurrenceGroup(groupId: string, userId: string): Promise<string | null> {
    const todos = await this.repository.findByRecurrenceGroupId(groupId);
    if (todos.length === 0) {
      return null;
    }
    const listId = todos[0].listId;
    if (listId) {
      await this.sharingService.assertPermission(listId, userId, ['owner', 'editor']);
    }
    return listId;
  }

  async deleteRecurrenceGroup(groupId: string, userId: string): Promise<void> {
    const todos = await this.repository.findByRecurrenceGroupId(groupId);
    const totalBytes = todos.reduce((sum, t) => sum + todoStorageBytes(t), 0);
    const listId = todos[0]?.listId ?? null;
    await this.repository.deleteByRecurrenceGroupId(groupId);
    await this.userRepository.addStorageUsed(userId, -totalBytes);
    if (listId) {
      this.gateway.notifyRecurrenceDeleted(listId, groupId);
    }
  }

  async syncOperations(operations: SyncOperationDto[], userId: string): Promise<TodoResponse[]> {
    const results: TodoResponse[] = [];

    for (const op of operations) {
      const listId = op.todo.listId;
      await this.sharingService.assertPermission(listId, userId, ['owner', 'editor']);

      switch (op.type) {
        case 'create': {
          const existing = await this.repository.findById(op.todo.id);
          if (!existing) {
            const todo = new Todo(
              op.todo.id,
              op.todo.text,
              op.todo.completed,
              op.todo.date ?? null,
              op.todo.time ?? null,
              op.todo.createdAt,
              op.todo.recurrenceGroupId ?? null,
              userId,
              listId,
              op.todo.month ?? null,
              op.todo.updatedAt ?? op.timestamp,
              op.todo.kind ?? 'task',
              op.todo.items ?? null,
            );
            const bytes = todoStorageBytes(todo);
            await this.assertQuota(userId, bytes);
            await this.repository.save(todo);
            await this.userRepository.addStorageUsed(userId, bytes);
            results.push(todo.toResponse());
          } else {
            results.push(existing.toResponse());
          }
          break;
        }
        case 'update': {
          const existing = await this.repository.findById(op.todo.id);
          if (existing) {
            const clientUpdatedAt = op.todo.updatedAt ?? op.timestamp;
            if (clientUpdatedAt >= existing.updatedAt) {
              const updated = new Todo(
                existing.id,
                op.todo.text,
                op.todo.completed,
                op.todo.date ?? null,
                op.todo.time !== undefined ? op.todo.time : existing.time,
                existing.createdAt,
                existing.recurrenceGroupId,
                existing.userId,
                existing.listId,
                op.todo.month ?? null,
                clientUpdatedAt,
                existing.kind,
                existing.kind === 'shopping'
                  ? (op.todo.items !== undefined ? op.todo.items : existing.items)
                  : null,
              );
              const delta = todoStorageBytes(updated) - todoStorageBytes(existing);
              if (delta > 0) {
                await this.assertQuota(userId, delta);
              }
              await this.repository.update(updated);
              if (delta !== 0) {
                await this.userRepository.addStorageUsed(userId, delta);
              }
              results.push(updated.toResponse());
            } else {
              // Server version is newer — return server state
              results.push(existing.toResponse());
            }
          }
          break;
        }
        case 'delete': {
          const existing = await this.repository.findById(op.todo.id);
          if (existing) {
            const bytes = todoStorageBytes(existing);
            await this.repository.delete(op.todo.id);
            await this.userRepository.addStorageUsed(userId, -bytes);
          }
          break;
        }
      }
    }

    return results;
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
