import type { Todo, RecurrenceConfig } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export async function getTodosByDate(date: string): Promise<Todo[]> {
  return request<Todo[]>(`/todos?date=${date}`);
}

export async function getAllTodos(): Promise<Todo[]> {
  return request<Todo[]>('/todos');
}

export async function addTodo(todo: Omit<Todo, 'id' | 'createdAt'>): Promise<Todo> {
  return request<Todo>('/todos', {
    method: 'POST',
    body: JSON.stringify({ text: todo.text, date: todo.date, time: todo.time }),
  });
}

export async function updateTodo(todo: Todo): Promise<Todo> {
  return request<Todo>(`/todos/${todo.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      text: todo.text,
      completed: todo.completed,
      date: todo.date,
      time: todo.time,
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
): Promise<Todo[]> {
  return request<Todo[]>('/todos/recurring', {
    method: 'POST',
    body: JSON.stringify({
      text,
      time,
      type: config.type,
      dateFrom: config.dateFrom,
      dateTo: config.dateTo,
    }),
  });
}

export async function getDatesWithTodos(): Promise<Set<string>> {
  const dates = await request<string[]>('/todos/dates-with-todos');
  return new Set(dates);
}
