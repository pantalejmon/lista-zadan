import type { Todo, RecurrenceConfig } from './types';
import * as db from './db';
import * as api from './api';

export interface TodoStorage {
  getTodosByDate(date: string, listId?: string): Promise<Todo[]>;
  getAllTodos(listId?: string): Promise<Todo[]>;
  getUnassignedTodos(listId?: string): Promise<Todo[]>;
  addTodo(todo: Omit<Todo, 'id' | 'createdAt'> & { id?: string; createdAt?: number; listId?: string }): Promise<void>;
  updateTodo(todo: Todo): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  deleteRecurrenceGroup(groupId: string): Promise<void>;
  addRecurringTodos(text: string, time: string | undefined, config: RecurrenceConfig, listId?: string): Promise<void>;
  getDatesWithTodos(listId?: string): Promise<Set<string>>;
}

export type StorageMode = 'local' | 'cloud';

const localStorage: TodoStorage = {
  getTodosByDate: db.getTodosByDate,
  getAllTodos: db.getAllTodos,
  getUnassignedTodos: async () => [],
  addTodo: db.addTodo,
  updateTodo: db.updateTodo,
  deleteTodo: db.deleteTodo,
  deleteRecurrenceGroup: db.deleteRecurrenceGroup,
  addRecurringTodos: db.addRecurringTodos,
  getDatesWithTodos: db.getDatesWithTodos,
};

const cloudStorage: TodoStorage = {
  getTodosByDate: (date, listId) => api.getTodosByDate(date, listId!),
  getAllTodos: (listId) => api.getAllTodos(listId!),
  getUnassignedTodos: (listId) => api.getUnassignedTodos(listId!),
  addTodo: async (todo) => { await api.addTodo({ ...todo, listId: todo.listId! }); },
  updateTodo: async (todo) => { await api.updateTodo(todo); },
  deleteTodo: api.deleteTodo,
  deleteRecurrenceGroup: api.deleteRecurrenceGroup,
  addRecurringTodos: async (text, time, config, listId) => { await api.addRecurringTodos(text, time, config, listId!); },
  getDatesWithTodos: (listId) => api.getDatesWithTodos(listId!),
};

export function getStorage(mode: StorageMode): TodoStorage {
  return mode === 'cloud' ? cloudStorage : localStorage;
}
