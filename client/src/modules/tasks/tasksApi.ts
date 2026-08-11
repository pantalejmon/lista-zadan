import type { Todo, RecurrenceConfig } from './todo.types';
import { request } from '@platform/api/http';

// REST Zadań: todo, cykliczność i synchronizacja trybu offline.
// `TodoList` przychodzi z gospodarstw — zadanie zawsze należy do jakiejś listy.

export async function getTodosByDate(date: string, listId: string): Promise<Todo[]> {
  return request<Todo[]>(`/todos?date=${date}&listId=${listId}`);
}

export async function getAllTodos(listId: string): Promise<Todo[]> {
  return request<Todo[]>(`/todos?listId=${listId}`);
}

export async function addTodo(todo: Omit<Todo, 'id' | 'createdAt'> & { listId: string }): Promise<Todo> {
  return request<Todo>('/todos', {
    method: 'POST',
    body: JSON.stringify({
      text: todo.text,
      date: todo.date,
      time: todo.time,
      month: todo.month,
      listId: todo.listId,
      kind: todo.kind,
    }),
  });
}

export async function getUnassignedTodos(listId: string): Promise<Todo[]> {
  return request<Todo[]>(`/todos/unassigned?listId=${listId}`);
}

export async function updateTodo(todo: Todo): Promise<Todo> {
  return request<Todo>(`/todos/${todo.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      text: todo.text,
      completed: todo.completed,
      date: todo.date ?? null,
      time: todo.time,
      month: todo.month ?? null,
      items: todo.kind === 'shopping' ? (todo.items ?? []) : undefined,
    }),
  });
}

export async function deleteTodo(id: string): Promise<void> {
  return request(`/todos/${id}`, { method: 'DELETE' });
}

export async function deleteRecurrenceGroup(groupId: string): Promise<void> {
  return request(`/todos/recurrence-group/${groupId}`, { method: 'DELETE' });
}

export async function addRecurringTodos(
  text: string,
  time: string | undefined,
  config: RecurrenceConfig,
  listId: string,
): Promise<Todo[]> {
  return request<Todo[]>('/todos/recurring', {
    method: 'POST',
    body: JSON.stringify({
      text,
      time,
      type: config.type,
      dateFrom: config.dateFrom,
      dateTo: config.dateTo,
      listId,
    }),
  });
}

export interface SyncOperation {
  type: string;
  todo: {
    id: string;
    text: string;
    completed: boolean;
    date?: string | null;
    time?: string | null;
    createdAt: number;
    updatedAt?: number;
    recurrenceGroupId?: string | null;
    month?: string | null;
    listId: string;
    kind?: 'task' | 'shopping';
    items?: { id: string; text: string; checked: boolean; order: number }[] | null;
  };
  timestamp: number;
}

// Wynik **per operacja**, w kolejności wysłania. Batch nie jest transakcją:
// serwer nie przewraca całej paczki przez jedną zepsutą zmianę (#119).
export interface SyncOperationResult {
  status: 'applied' | 'rejected' | 'failed';
  todo?: Todo;
  reason?: string;
}

export async function syncTodos(operations: SyncOperation[]): Promise<SyncOperationResult[]> {
  return request<SyncOperationResult[]>('/todos/sync', {
    method: 'POST',
    body: JSON.stringify({ operations }),
  });
}

export async function getDatesWithTodos(listId: string): Promise<Set<string>> {
  const dates = await request<string[]>(`/todos/dates-with-todos?listId=${listId}`);
  return new Set(dates);
}

