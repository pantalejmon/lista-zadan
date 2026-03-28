import type { Todo, RecurrenceConfig, TodoList, ListMember, ListInvitation, ListRole } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

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

// --- Todos ---

export async function getTodosByDate(date: string, listId: string): Promise<Todo[]> {
  return request<Todo[]>(`/todos?date=${date}&listId=${listId}`);
}

export async function getAllTodos(listId: string): Promise<Todo[]> {
  return request<Todo[]>(`/todos?listId=${listId}`);
}

export async function addTodo(todo: Omit<Todo, 'id' | 'createdAt'> & { listId: string }): Promise<Todo> {
  return request<Todo>('/todos', {
    method: 'POST',
    body: JSON.stringify({ text: todo.text, date: todo.date, time: todo.time, month: todo.month, listId: todo.listId }),
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

export async function getDatesWithTodos(listId: string): Promise<Set<string>> {
  const dates = await request<string[]>(`/todos/dates-with-todos?listId=${listId}`);
  return new Set(dates);
}

// --- Lists ---

export async function getLists(): Promise<TodoList[]> {
  return request<TodoList[]>('/lists');
}

export async function createList(name: string): Promise<TodoList> {
  return request<TodoList>('/lists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateList(listId: string, name: string): Promise<TodoList> {
  return request<TodoList>(`/lists/${listId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function deleteList(listId: string): Promise<void> {
  return request(`/lists/${listId}`, { method: 'DELETE' });
}

export async function getListMembers(listId: string): Promise<ListMember[]> {
  return request<ListMember[]>(`/lists/${listId}/members`);
}

export async function removeListMember(listId: string, memberId: string): Promise<void> {
  return request(`/lists/${listId}/members/${memberId}`, { method: 'DELETE' });
}

export async function inviteToList(listId: string, email: string, role: ListRole): Promise<ListInvitation> {
  return request<ListInvitation>(`/lists/${listId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

// --- Invitations ---

export async function getPendingInvitations(): Promise<ListInvitation[]> {
  return request<ListInvitation[]>('/invitations/pending');
}

export async function acceptInvitation(id: string): Promise<void> {
  return request(`/invitations/${id}/accept`, { method: 'POST' });
}

export async function declineInvitation(id: string): Promise<void> {
  return request(`/invitations/${id}/decline`, { method: 'POST' });
}
