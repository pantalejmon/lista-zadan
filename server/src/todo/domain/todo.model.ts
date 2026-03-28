import { randomUUID } from 'crypto';
import { CreateTodoDto } from '../web/dto/create-todo.dto';
import { TodoResponse } from '../web/dto/todo.response';
import { UpdateTodoDto } from '../web/dto/update-todo.dto';

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
  ) {
    this.id = id;
    this.text = text;
    this.completed = completed;
    this.date = date;
    this.time = time;
    this.createdAt = createdAt;
    this.recurrenceGroupId = recurrenceGroupId;
    this.userId = userId;
    this.listId = listId;
    this.month = month;
    this.updatedAt = updatedAt;
  }

  static createFromDto(dto: CreateTodoDto, userId: string, listId: string): Todo {
    const now = Date.now();
    return new Todo(
      randomUUID(),
      dto.text,
      false,
      dto.date ?? null,
      dto.time ?? null,
      now,
      null,
      userId,
      listId,
      dto.date ? null : (dto.month ?? null),
      now,
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
    );
  }

  update(dto: UpdateTodoDto): Todo {
    const newDate = dto.date !== undefined ? dto.date : this.date;
    const newMonth = dto.month !== undefined ? dto.month : (newDate ? null : this.month);

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
    };
  }
}
