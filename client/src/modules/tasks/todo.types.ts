// Typy Zadań: sam todo, pozycje listy zakupów i konfiguracja cykliczności.
// Listy i gospodarstwa są osobną domeną — patrz `@platform/households/household.types`.

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
