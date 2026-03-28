import { Todo } from './todo.model';

export abstract class TodoRepositoryPort {
  abstract findById(id: string): Promise<Todo | null>;
  abstract findByDateAndUser(date: string, userId: string): Promise<Todo[]>;
  abstract findAllByUser(userId: string): Promise<Todo[]>;
  abstract save(todo: Todo): Promise<void>;
  abstract saveMany(todos: Todo[]): Promise<void>;
  abstract update(todo: Todo): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByRecurrenceGroupId(groupId: string): Promise<void>;
  abstract findDistinctDatesByUser(userId: string): Promise<string[]>;
}
