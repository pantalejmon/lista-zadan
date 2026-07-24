import { TodoList } from './todo-list.model';

export abstract class TodoListRepositoryPort {
  abstract findById(id: string): Promise<TodoList | null>;
  abstract findByHouseholdIds(householdIds: string[]): Promise<TodoList[]>;
  abstract findDefaultByUser(userId: string): Promise<TodoList | null>;
  abstract save(list: TodoList): Promise<void>;
  abstract update(list: TodoList): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
