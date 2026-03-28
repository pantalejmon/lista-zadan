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

  constructor(
    id: string,
    text: string,
    completed: boolean,
    date: string,
    time: string | null,
    createdAt: number,
    recurrenceGroupId: string | null,
  ) {
    this.id = id;
    this.text = text;
    this.completed = completed;
    this.date = date;
    this.time = time;
    this.createdAt = createdAt;
    this.recurrenceGroupId = recurrenceGroupId;
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
    );
  }

  toResponse(): TodoResponse {
    return new TodoResponse(
      this.id,
      this.text,
      this.completed,
      this.date,
      this.time,
      this.createdAt,
      this.recurrenceGroupId,
    );
  }
}
