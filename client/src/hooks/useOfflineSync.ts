import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingCount, type SyncStatus } from '../lib/offlineQueue';
import { syncPendingOps } from '../lib/syncService';

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
  }, [enabled]);

  // Sync when coming back online
  useEffect(() => {
    if (!enabled || !online) {
      return;
    }

    const doSync = async () => {
      const count = await getPendingCount();
      if (count === 0) {
        return;
      }
      await syncPendingOps(setSyncStatus);
      await refreshPendingCount();
      onSyncedRef.current();
    };

    doSync();
  }, [enabled, online, refreshPendingCount]);

  // Periodically check pending count (to catch new queued ops)
  useEffect(() => {
    if (!enabled) {
      return;
    }
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 2000);
    return () => clearInterval(interval);
  }, [enabled, refreshPendingCount]);

  return { syncStatus, pendingCount, online };
}
