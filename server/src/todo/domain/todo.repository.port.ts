import { Todo } from './todo.model';

export abstract class TodoRepositoryPort {
  abstract findById(id: string): Promise<Todo | null>;
  abstract findByDateAndList(date: string, listId: string): Promise<Todo[]>;
  abstract findAllByList(listId: string): Promise<Todo[]>;
  abstract save(todo: Todo): Promise<void>;
  abstract saveMany(todos: Todo[]): Promise<void>;
  abstract update(todo: Todo): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract findByRecurrenceGroupId(groupId: string): Promise<Todo[]>;
  abstract deleteByRecurrenceGroupId(groupId: string): Promise<void>;
  abstract findDistinctDatesByList(listId: string): Promise<string[]>;
  abstract findUnassignedByList(listId: string): Promise<Todo[]>;
}
