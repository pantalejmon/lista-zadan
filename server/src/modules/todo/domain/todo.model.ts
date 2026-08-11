import { randomUUID } from 'crypto';
import { CreateTodoDto } from '../web/dto/create-todo.dto';
import { TodoResponse } from '../web/dto/todo.response';
import { UpdateTodoDto } from '../web/dto/update-todo.dto';
import { ShoppingItem, isShoppingComplete } from './shopping-item';

export type TodoKind = 'task' | 'shopping';

export class Todo {
  readonly id: string;
  readonly text: string;
  readonly completed: boolean;
  readonly date: string | null;
  readonly time: string | null;
  readonly createdAt: number;
  readonly recurrenceGroupId: string | null;
  readonly userId: string | null;
  readonly listId: string | null;
  readonly month: string | null;
  readonly updatedAt: number;
  readonly kind: TodoKind;
  readonly items: readonly ShoppingItem[] | null;

  constructor(
    id: string,
    text: string,
    completed: boolean,
    date: string | null,
    time: string | null,
    createdAt: number,
    recurrenceGroupId: string | null,
    userId: string | null,
    listId: string | null,
    month: string | null,
    updatedAt: number,
    kind: TodoKind = 'task',
    items: readonly ShoppingItem[] | null = null,
  ) {
    this.id = id;
    this.text = text;
    this.date = date;
    this.time = time;
    this.createdAt = createdAt;
    this.recurrenceGroupId = recurrenceGroupId;
    this.userId = userId;
    this.listId = listId;
    this.month = month;
    this.updatedAt = updatedAt;
    this.kind = kind;
    this.items = kind === 'shopping' ? (items ?? []) : null;
    this.completed = this.kind === 'shopping' ? isShoppingComplete(this.items ?? []) : completed;
  }

  static createFromDto(dto: CreateTodoDto, userId: string, listId: string): Todo {
    const now = Date.now();
    const kind: TodoKind = dto.kind ?? 'task';
    return new Todo(
      randomUUID(),
      dto.text,
      false,
      dto.date ?? null,
      kind === 'shopping' ? null : (dto.time ?? null),
      now,
      null,
      userId,
      listId,
      dto.date ? null : (dto.month ?? null),
      now,
      kind,
      kind === 'shopping' ? [] : null,
    );
  }

  static createRecurring(
    text: string,
    time: string | undefined,
    groupId: string,
    date: string,
    createdAt: number,
    userId: string,
    listId: string,
  ): Todo {
    return new Todo(
      randomUUID(),
      text,
      false,
      date,
      time ?? null,
      createdAt,
      groupId,
      userId,
      listId,
      null,
      createdAt,
      'task',
      null,
    );
  }

  update(dto: UpdateTodoDto): Todo {
    const newDate = dto.date !== undefined ? dto.date : this.date;
    const newMonth = dto.month !== undefined ? dto.month : (newDate ? null : this.month);
    const newItems = this.kind === 'shopping' && dto.items !== undefined ? dto.items : this.items;

    return new Todo(
      this.id,
      dto.text ?? this.text,
      dto.completed ?? this.completed,
      newDate,
      dto.time !== undefined ? dto.time : this.time,
      this.createdAt,
      this.recurrenceGroupId,
      this.userId,
      this.listId,
      newMonth,
      Date.now(),
      this.kind,
      newItems,
    );
  }

  toResponse(): TodoResponse {
    return {
      id: this.id,
      text: this.text,
      completed: this.completed,
      date: this.date,
      time: this.time,
      createdAt: this.createdAt,
      recurrenceGroupId: this.recurrenceGroupId,
      listId: this.listId,
      month: this.month,
      updatedAt: this.updatedAt,
      kind: this.kind,
      items: this.items === null ? null : [...this.items],
    };
  }
}
