import { syncTodos, type SyncOperation } from './tasksApi';
import { getAllPendingOps, removePendingOp, type OfflineOperation } from './offlineQueue';
import { ApiError } from '@platform/api/http';
import type { SyncStatus, RejectedChange } from '@platform/connection';

type StatusCallback = (status: SyncStatus) => void;

let syncing = false;

// Operacja bez listy jest niesynchronizowalna z definicji — wcześniej klient
// wysyłał wtedy `listId: ''`, walidacja serwera odrzucała **całe** żądanie na
// 400, a kolejka nie miała jak się opróżnić (#119).
function listIdOf(op: OfflineOperation): string | undefined {
  if (op.type === 'delete') {
    return op.listId || undefined;
  }
  if (op.type === 'create') {
    return op.todo.listId || op.listId || undefined;
  }
  return op.todo.listId || undefined;
}

function describe(op: OfflineOperation): string {
  return op.type === 'delete' ? 'Usunięcie zadania' : (op.todo.text || 'Zadanie bez treści');
}

function toSyncOperation(op: OfflineOperation, listId: string): SyncOperation {
  if (op.type === 'delete') {
    return {
      type: op.type,
      todo: { id: op.todoId, text: '', completed: false, createdAt: 0, listId },
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
      listId,
      kind: op.todo.kind,
      items: op.todo.kind === 'shopping' ? (op.todo.items ?? []) : undefined,
    },
    timestamp: op.timestamp,
  };
}

// Wysyła kolejkę i **usuwa wpisy pojedynczo**, zależnie od wyniku każdego z nich.
// Wcześniej kolejka czyściła się wyłącznie po pełnym sukcesie, więc jedna zmiana
// nie do zapisania blokowała wszystkie pozostałe na zawsze — a IndexedDB
// przeżywa przeinstalowanie PWA, więc użytkownik nie miał jak tego odkręcić.
export async function syncPendingOps(onStatusChange: StatusCallback): Promise<RejectedChange[]> {
  if (syncing || !navigator.onLine) {
    return [];
  }
  syncing = true;
  onStatusChange('syncing');
  const rejected: RejectedChange[] = [];

  try {
    const ops = await getAllPendingOps();
    if (ops.length === 0) {
      onStatusChange('idle');
      return [];
    }

    const sendable: { op: OfflineOperation & { id: number }; payload: SyncOperation }[] = [];
    for (const op of ops) {
      const listId = listIdOf(op);
      if (!listId) {
        rejected.push({ description: describe(op), reason: 'Zmiana nie wskazuje żadnej listy.' });
        await removePendingOp(op.id);
        continue;
      }
      sendable.push({ op, payload: toSyncOperation(op, listId) });
    }

    if (sendable.length === 0) {
      onStatusChange(rejected.length > 0 ? 'error' : 'idle');
      return rejected;
    }

    const results = await syncTodos(sendable.map((s) => s.payload));

    for (const [index, entry] of sendable.entries()) {
      const result = results[index];
      // Brak wyniku traktujemy jak przejściowy — wpis zostaje do ponowienia.
      if (!result || result.status === 'failed') {
        continue;
      }
      if (result.status === 'rejected') {
        rejected.push({
          description: describe(entry.op),
          reason: result.reason ?? 'Serwer odrzucił tę zmianę.',
        });
      }
      await removePendingOp(entry.op.id);
    }

    onStatusChange(rejected.length > 0 ? 'error' : 'idle');
    return rejected;
  } catch (error) {
    // Odrzucamy paczkę **wyłącznie** przy 400: to znaczy, że jej kształt jest
    // nie do przyjęcia i kolejne próby nic nie zmienią.
    //
    // Świadomie NIE przy 401/403 — wygasła sesja naprawia się ponownym
    // zalogowaniem, a wyrzucenie wtedy kolejki skasowałoby zmiany, które
    // użytkownik zrobił offline i uznał za zapisane. Lepszy uporczywy błąd
    // (z przyciskiem „odrzuć") niż cicha utrata danych.
    if (error instanceof ApiError && error.status === 400) {
      for (const op of await getAllPendingOps()) {
        rejected.push({ description: describe(op), reason: 'Serwer odrzucił tę zmianę.' });
        await removePendingOp(op.id);
      }
    }
    onStatusChange('error');
    return rejected;
  } finally {
    syncing = false;
  }
}
