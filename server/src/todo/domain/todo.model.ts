import { randomUUID } from 'crypto';
import { CreateTodoDto } from '../web/dto/create-todo.dto';
import { TodoResponse } from '../web/dto/todo.response';
import { UpdateTodoDto } from '../web/dto/update-todo.dto';

export class Todo {
  readonly id: string;
  readonly text: string;
  readonly completed: boolean;
  readonly date: string;
  readonly time: string | null;
  readonly createdAt: number;
  readonly recurrenceGroupId: string | null;
  readonly userId: string | null;

  constructor(
    id: string,
    text: string,
    completed: boolean,
    date: string,
    time: string | null,
    createdAt: number,
    recurrenceGroupId: string | null,
    userId: string | null,
  ) {
    this.id = id;
    this.text = text;
    this.completed = completed;
    this.date = date;
    this.time = time;
    this.createdAt = createdAt;
    this.recurrenceGroupId = recurrenceGroupId;
    this.userId = userId;
  }

  static createFromDto(dto: CreateTodoDto, userId: string | null): Todo {
    return new Todo(
      randomUUID(),
      dto.text,
      false,
      dto.date,
      dto.time ?? null,
      Date.now(),
      null,
      userId,
    );
  }

  static createRecurring(
    text: string,
    time: string | undefined,
    groupId: string,
    date: string,
    createdAt: number,
    userId: string | null,
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
    );
  }

  update(dto: UpdateTodoDto): Todo {
    return new Todo(
      this.id,
      dto.text ?? this.text,
      dto.completed ?? this.completed,
      dto.date ?? this.date,
      dto.time !== undefined ? dto.time : this.time,
      this.createdAt,
      this.recurrenceGroupId,
      this.userId,
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
    };
  }
}
