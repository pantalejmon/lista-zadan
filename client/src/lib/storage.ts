import type { Todo, RecurrenceConfig } from './types';
import * as db from './db';
import * as api from './api';
import { enqueueOperation, isOnline } from './offlineQueue';

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
  getTodosByDate: (date, listId) => {
    if (!isOnline()) {
      return Promise.resolve([]);
    }
    return api.getTodosByDate(date, listId!);
  },
  getAllTodos: (listId) => {
    if (!isOnline()) {
      return Promise.resolve([]);
    }
    return api.getAllTodos(listId!);
  },
  getUnassignedTodos: (listId) => {
    if (!isOnline()) {
      return Promise.resolve([]);
    }
    return api.getUnassignedTodos(listId!);
  },
  addTodo: async (todo) => {
    const fullTodo: Todo = {
      id: todo.id ?? crypto.randomUUID(),
      text: todo.text,
      completed: todo.completed,
      date: todo.date,
      time: todo.time,
      createdAt: todo.createdAt ?? Date.now(),
      recurrenceGroupId: todo.recurrenceGroupId,
      listId: todo.listId,
      month: todo.month,
      updatedAt: Date.now(),
    };
    if (!isOnline()) {
      await enqueueOperation({ type: 'create', todo: fullTodo, listId: todo.listId!, timestamp: Date.now() });
      return;
    }
    await api.addTodo({ ...fullTodo, listId: todo.listId! });
  },
  updateTodo: async (todo) => {
    if (!isOnline()) {
      await enqueueOperation({ type: 'update', todo: { ...todo, updatedAt: Date.now() }, timestamp: Date.now() });
      return;
    }
    await api.updateTodo(todo);
  },
  deleteTodo: async (id) => {
    if (!isOnline()) {
      await enqueueOperation({ type: 'delete', todoId: id, listId: '', timestamp: Date.now() });
      return;
    }
    await api.deleteTodo(id);
  },
  deleteRecurrenceGroup: async (groupId) => {
    // Recurrence group delete cannot be easily queued — require online
    if (!isOnline()) {
      throw new Error('Usunięcie grupy cyklicznych wymaga połączenia z internetem');
    }
    await api.deleteRecurrenceGroup(groupId);
  },
  addRecurringTodos: async (text, time, config, listId) => {
    // Recurring creation is server-side — require online
    if (!isOnline()) {
      throw new Error('Tworzenie zadań cyklicznych wymaga połączenia z internetem');
    }
    await api.addRecurringTodos(text, time, config, listId!);
  },
  getDatesWithTodos: (listId) => {
    if (!isOnline()) {
      return Promise.resolve(new Set<string>());
    }
    return api.getDatesWithTodos(listId!);
  },
};

export function getStorage(mode: StorageMode): TodoStorage {
  return mode === 'cloud' ? cloudStorage : localStorage;
}
