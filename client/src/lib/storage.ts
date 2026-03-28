import type { Todo, RecurrenceConfig } from './types';
import * as db from './db';
import * as api from './api';

export interface TodoStorage {
  getTodosByDate(date: string): Promise<Todo[]>;
  getAllTodos(): Promise<Todo[]>;
  addTodo(todo: Omit<Todo, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<void>;
  updateTodo(todo: Todo): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  deleteRecurrenceGroup(groupId: string): Promise<void>;
  addRecurringTodos(text: string, time: string | undefined, config: RecurrenceConfig): Promise<void>;
  getDatesWithTodos(): Promise<Set<string>>;
}

export type StorageMode = 'local' | 'cloud';

const localStorage: TodoStorage = {
  getTodosByDate: db.getTodosByDate,
  getAllTodos: db.getAllTodos,
  addTodo: db.addTodo,
  updateTodo: db.updateTodo,
  deleteTodo: db.deleteTodo,
  deleteRecurrenceGroup: db.deleteRecurrenceGroup,
  addRecurringTodos: db.addRecurringTodos,
  getDatesWithTodos: db.getDatesWithTodos,
};

const cloudStorage: TodoStorage = {
  getTodosByDate: api.getTodosByDate,
  getAllTodos: api.getAllTodos,
  addTodo: async (todo) => { await api.addTodo(todo); },
  updateTodo: async (todo) => { await api.updateTodo(todo); },
  deleteTodo: api.deleteTodo,
  deleteRecurrenceGroup: api.deleteRecurrenceGroup,
  addRecurringTodos: async (text, time, config) => { await api.addRecurringTodos(text, time, config); },
  getDatesWithTodos: api.getDatesWithTodos,
};

export function getStorage(mode: StorageMode): TodoStorage {
  return mode === 'cloud' ? cloudStorage : localStorage;
}
