import type {
  Todo,
  RecurrenceConfig,
  TodoList,
  Household,
  HouseholdMember,
  HouseholdInvitation,
  ContactSuggestion,
  ListRole,
} from './types';

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

export async function syncTodos(operations: SyncOperation[]): Promise<Todo[]> {
  return request<Todo[]>('/todos/sync', {
    method: 'POST',
    body: JSON.stringify({ operations }),
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

export async function createList(name: string, householdId?: string): Promise<TodoList> {
  return request<TodoList>('/lists', {
    method: 'POST',
    body: JSON.stringify({ name, householdId }),
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

// --- Households ---

export async function getHouseholds(): Promise<Household[]> {
  return request<Household[]>('/households');
}

export async function createHousehold(name: string): Promise<Household> {
  return request<Household>('/households', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function renameHousehold(householdId: string, name: string): Promise<Household> {
  return request<Household>(`/households/${householdId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  return request<HouseholdMember[]>(`/households/${householdId}/members`);
}

export async function removeHouseholdMember(householdId: string, memberId: string): Promise<void> {
  return request(`/households/${householdId}/members/${memberId}`, { method: 'DELETE' });
}

export async function inviteToHousehold(
  householdId: string,
  email: string,
  role: ListRole,
): Promise<HouseholdInvitation> {
  return request<HouseholdInvitation>(`/households/${householdId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function getContactSuggestions(): Promise<ContactSuggestion[]> {
  return request<ContactSuggestion[]>('/contacts/suggestions');
}

// --- Invitations ---

export async function getPendingInvitations(): Promise<HouseholdInvitation[]> {
  return request<HouseholdInvitation[]>('/invitations/pending');
}

export async function acceptInvitation(id: string): Promise<void> {
  return request(`/invitations/${id}/accept`, { method: 'POST' });
}

export async function declineInvitation(id: string): Promise<void> {
  return request(`/invitations/${id}/decline`, { method: 'POST' });
}
