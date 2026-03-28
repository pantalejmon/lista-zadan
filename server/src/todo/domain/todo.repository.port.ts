import { Todo } from './todo.model';

export abstract class TodoRepositoryPort {
  abstract findById(id: string): Promise<Todo | null>;
  abstract findByDate(date: string): Promise<Todo[]>;
  abstract findAll(): Promise<Todo[]>;
  abstract save(todo: Todo): Promise<void>;
  abstract saveMany(todos: Todo[]): Promise<void>;
  abstract update(todo: Todo): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByRecurrenceGroupId(groupId: string): Promise<void>;
  abstract findDistinctDates(): Promise<string[]>;
}
