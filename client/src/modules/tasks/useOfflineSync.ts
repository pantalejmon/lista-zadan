import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingCount, clearPendingOps } from './offlineQueue';
import type { SyncStatus, RejectedChange } from '@platform/connection';
import { syncPendingOps } from './syncService';

interface UseOfflineSyncOptions {
  enabled: boolean;
  onSynced: () => void;
}

// Odstęp między próbami rośnie po każdej nieudanej: 2 s, 4 s, 8 s… do minuty.
// Stałe 2 s oznaczało żądanie co dwie sekundy w nieskończoność, gdy kolejka była
// zablokowana — na baterii telefonu i na serwerze (#119).
const FIRST_RETRY_MS = 2000;
const MAX_RETRY_MS = 60000;

export function useOfflineSync({ enabled, onSynced }: UseOfflineSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [rejected, setRejected] = useState<RejectedChange[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const onSyncedRef = useRef(onSynced);
  const delayRef = useRef(FIRST_RETRY_MS);
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

  // Ostatnia deska ratunku: wyrzuć kolejkę i przestań próbować. Bez tego jedynym
  // wyjściem z zablokowanej synchronizacji było ręczne czyszczenie danych
  // witryny — IndexedDB przeżywa nawet przeinstalowanie PWA, więc użytkownik
  // nie miał żadnego sposobu, żeby sobie pomóc.
  const discardPending = useCallback(async () => {
    await clearPendingOps();
    setPendingCount(0);
    setRejected([]);
    setSyncStatus('idle');
    delayRef.current = FIRST_RETRY_MS;
  }, []);

  const dismissRejected = useCallback(() => {
    setRejected([]);
    setSyncStatus('idle');
  }, []);

  // Jedna próba synchronizacji: aktualizuje licznik, status i listę odrzuconych.
  const attempt = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
    if (count === 0) {
      // Kolejka pusta → ewentualny stary błąd jest nieaktualny.
      setSyncStatus((prev) => (prev === 'error' ? 'idle' : prev));
      delayRef.current = FIRST_RETRY_MS;
      return;
    }
    if (!navigator.onLine) {
      return;
    }

    const justRejected = await syncPendingOps(setSyncStatus);
    if (justRejected.length > 0) {
      setRejected((prev) => [...prev, ...justRejected]);
    }

    const left = await getPendingCount();
    setPendingCount(left);
    // Kolejka drgnęła → problem był przejściowy, wracamy do krótkiego odstępu.
    delayRef.current = left < count ? FIRST_RETRY_MS : Math.min(delayRef.current * 2, MAX_RETRY_MS);
    onSyncedRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const loop = async () => {
      await attempt();
      if (!stopped) {
        timer = setTimeout(loop, delayRef.current);
      }
    };
    loop();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // `online` w zależnościach: powrót sieci ma od razu wywołać próbę,
    // zamiast czekać na wygaśnięcie odstępu.
  }, [enabled, online, attempt]);

  return { syncStatus, pendingCount, rejected, online, discardPending, dismissRejected };
}
