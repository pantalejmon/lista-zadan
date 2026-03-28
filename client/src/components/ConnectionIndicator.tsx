import type { WsStatus } from '../hooks/useWebSocket';
import type { SyncStatus } from '../lib/offlineQueue';

interface ConnectionIndicatorProps {
  wsStatus: WsStatus;
  syncStatus: SyncStatus;
  pendingCount: number;
}

export function ConnectionIndicator({ wsStatus, syncStatus, pendingCount }: ConnectionIndicatorProps) {
  if (syncStatus === 'syncing') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        title="Synchronizacja..."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        sync
      </span>
    );
  }

  if (syncStatus === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
        title="Błąd synchronizacji"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        błąd
      </span>
    );
  }

  if (pendingCount > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
        title={`${pendingCount} zmian oczekuje na synchronizację`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {pendingCount}
      </span>
    );
  }

  if (wsStatus === 'connected') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
        title="Połączono — zmiany w czasie rzeczywistym"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        live
      </span>
    );
  }

  if (wsStatus === 'connecting') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
        title="Łączenie..."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
      </span>
    );
  }

  // disconnected in cloud mode
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
      title="Offline — zmiany zostaną zsynchronizowane"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      offline
    </span>
  );
}
