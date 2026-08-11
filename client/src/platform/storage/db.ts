import { openDB, type IDBPDatabase } from 'idb';
import type { Todo, RecurrenceConfig } from '@platform/api/types';
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
  addDays,
} from 'date-fns';

const DB_NAME = 'lista-zadan';
const DB_VERSION = 1;
const STORE = 'todos';

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      },
    });
  }
  return dbPromise;
}

export async function getTodosByDate(date: string): Promise<Todo[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE, 'date', date);
}

export async function getAllTodos(): Promise<Todo[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function addTodo(todo: Todo): Promise<void> {
  const db = await getDB();
  await db.add(STORE, todo);
}

export async function updateTodo(todo: Todo): Promise<void> {
  const db = await getDB();
  await db.put(STORE, todo);
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function deleteRecurrenceGroup(groupId: string): Promise<void> {
  const db = await getDB();
  const all = await db.getAll(STORE);
  const tx = db.transaction(STORE, 'readwrite');
  for (const todo of all) {
    if ((todo as Todo).recurrenceGroupId === groupId) {
      await tx.store.delete(todo.id);
    }
  }
  await tx.done;
}

export async function getDatesWithTodos(): Promise<Set<string>> {
  const db = await getDB();
  const todos = await db.getAll(STORE);
  return new Set(todos.map((t) => t.date));
}

export async function addRecurringTodos(
  text: string,
  time: string | undefined,
  config: RecurrenceConfig
): Promise<void> {
  const groupId = generateId();
  const start = parseISO(config.dateFrom);
  const end = parseISO(config.dateTo);

  let dates: Date[];
  switch (config.type) {
    case 'daily':
      dates = eachDayOfInterval({ start, end });
      break;
    case 'weekly':
      dates = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      // eachWeekOfInterval returns week starts, adjust to match the start day-of-week
      {
        const startDay = start.getDay();
        dates = dates.map((d) => {
          const weekStart = d.getDay();
          const diff = (startDay - weekStart + 7) % 7;
          return addDays(d, diff);
        }).filter((d) => d >= start && d <= end);
      }
      break;
    case 'monthly':
      dates = eachMonthOfInterval({ start, end }).map((d) => {
        // Keep the same day-of-month as start
        const day = start.getDate();
        const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return new Date(d.getFullYear(), d.getMonth(), Math.min(day, maxDay));
      }).filter((d) => d >= start && d <= end);
      break;
  }

  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const now = Date.now();

  for (const date of dates) {
    const todo: Todo = {
      id: generateId(),
      text,
      completed: false,
      date: format(date, 'yyyy-MM-dd'),
      time: time || undefined,
      createdAt: now,
      recurrenceGroupId: groupId,
    };
    await tx.store.add(todo);
  }
  await tx.done;
}
