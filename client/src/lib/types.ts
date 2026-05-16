export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export type TodoKind = 'task' | 'shopping';

export interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date?: string; // YYYY-MM-DD (null for unassigned todos)
  time?: string; // HH:mm
  createdAt: number;
  recurrenceGroupId?: string; // links all instances of a recurring todo
  listId?: string;
  month?: string; // YYYY-MM (set on unassigned todos)
  updatedAt?: number;
  kind?: TodoKind; // defaults to 'task' when missing
  items?: ShoppingItem[] | null; // populated when kind === 'shopping'
}

export interface RecurrenceConfig {
  type: RecurrenceType;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

export type ListRole = 'owner' | 'editor' | 'viewer';

export interface TodoList {
  id: string;
  name: string;
  ownerId: string;
  isDefault: boolean;
  role: ListRole;
  createdAt: number;
}

export interface ListMember {
  id: string;
  listId: string;
  userId: string;
  email: string;
  displayName: string;
  role: ListRole;
  joinedAt: number;
}

export interface ListInvitation {
  id: string;
  listId: string;
  listName: string;
  invitedByName: string;
  invitedEmail: string;
  role: ListRole;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export function isShoppingComplete(items: ShoppingItem[] | null | undefined): boolean {
  if (!items || items.length === 0) {
    return false;
  }
  return items.every((i) => i.checked);
}

export function shoppingProgress(items: ShoppingItem[] | null | undefined): { done: number; total: number; ratio: number } {
  const total = items?.length ?? 0;
  const done = items?.filter((i) => i.checked).length ?? 0;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}
