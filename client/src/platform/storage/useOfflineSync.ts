import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingCount, type SyncStatus } from './offlineQueue';
import { syncPendingOps } from './syncService';

interface UseOfflineSyncOptions {
  enabled: boolean;
  onSynced: () => void;
}

export function useOfflineSync({ enabled, onSynced }: UseOfflineSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled]);

  const refreshPendingCount = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const count = await getPendingCount();
    setPendingCount(count);
    // Nothing left to sync → a lingering 'error' is stale (the ops already
    // reached the server). Clear it so the UI stops showing "Błąd synchronizacji"
    // forever after the queue has actually drained.
    if (count === 0) {
      setSyncStatus((prev) => (prev === 'error' ? 'idle' : prev));
    }
  }, [enabled]);

  // Sync when coming back online
  useEffect(() => {
    if (!enabled || !online) {
      return;
    }

    const doSync = async () => {
      const count = await getPendingCount();
      if (count === 0) {
        setSyncStatus((prev) => (prev === 'error' ? 'idle' : prev));
        return;
      }
      await syncPendingOps(setSyncStatus);
      await refreshPendingCount();
      onSyncedRef.current();
    };

    doSync();
  }, [enabled, online, refreshPendingCount]);

  // Steady-state loop: refresh the pending count and retry queued ops every few
  // seconds. Retrying here means a transient failure self-heals instead of
  // freezing the status on 'error' until a reload — the queue drains, the count
  // hits zero, and refreshPendingCount clears the stale error.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const tick = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
      if (count === 0) {
        setSyncStatus((prev) => (prev === 'error' ? 'idle' : prev));
        return;
      }
      if (navigator.onLine) {
        await syncPendingOps(setSyncStatus);
        await refreshPendingCount();
        onSyncedRef.current();
      }
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => clearInterval(interval);
  }, [enabled, refreshPendingCount]);

  return { syncStatus, pendingCount, online };
}
