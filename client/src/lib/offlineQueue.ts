import { openDB, type IDBPDatabase } from 'idb';
import type { Todo } from './types';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type OfflineOperation =
  | { type: 'create'; todo: Todo; listId: string; timestamp: number }
  | { type: 'update'; todo: Todo; timestamp: number }
  | { type: 'delete'; todoId: string; listId: string; timestamp: number };

const DB_NAME = 'lista-zadan-sync';
const DB_VERSION = 1;
const STORE = 'pending-ops';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      },
    });
  }
  return dbPromise;
}

export async function enqueueOperation(op: OfflineOperation): Promise<void> {
  const db = await getDB();
  await db.add(STORE, op);
}

export async function getAllPendingOps(): Promise<(OfflineOperation & { id: number })[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function clearPendingOps(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE);
}

export async function removePendingOp(id: number): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE);
}

export function isOnline(): boolean {
  return navigator.onLine;
}
