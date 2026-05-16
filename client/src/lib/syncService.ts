import { syncTodos, type SyncOperation } from './api';
import {
  getAllPendingOps,
  clearPendingOps,
  type SyncStatus,
} from './offlineQueue';

type StatusCallback = (status: SyncStatus) => void;

let syncing = false;

export async function syncPendingOps(onStatusChange: StatusCallback): Promise<void> {
  if (syncing || !navigator.onLine) {
    return;
  }
  syncing = true;
  onStatusChange('syncing');

  try {
    const ops = await getAllPendingOps();
    if (ops.length === 0) {
      onStatusChange('idle');
      syncing = false;
      return;
    }

    const syncOps: SyncOperation[] = ops.map((op) => {
      if (op.type === 'delete') {
        return {
          type: op.type,
          todo: { id: op.todoId, text: '', completed: false, createdAt: 0, listId: op.listId },
          timestamp: op.timestamp,
        };
      }
      return {
        type: op.type,
        todo: {
          id: op.todo.id,
          text: op.todo.text,
          completed: op.todo.completed,
          date: op.todo.date,
          time: op.todo.time,
          createdAt: op.todo.createdAt,
          updatedAt: op.todo.updatedAt,
          recurrenceGroupId: op.todo.recurrenceGroupId,
          month: op.todo.month,
          listId: op.todo.listId ?? (op.type === 'create' ? op.listId : ''),
          kind: op.todo.kind,
          items: op.todo.kind === 'shopping' ? (op.todo.items ?? []) : undefined,
        },
        timestamp: op.timestamp,
      };
    });

    await syncTodos(syncOps);
    await clearPendingOps();
    onStatusChange('idle');
  } catch {
    onStatusChange('error');
  } finally {
    syncing = false;
  }
}
