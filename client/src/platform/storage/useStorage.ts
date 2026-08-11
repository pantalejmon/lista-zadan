import { useMemo } from 'react';
import { getStorage, type TodoStorage, type StorageMode } from './storage';
import type { AuthUser } from '@platform/auth/useAuth';

const MODE_KEY = 'storage-mode';

export function getPersistedMode(): StorageMode {
  return (window.localStorage.getItem(MODE_KEY) as StorageMode) ?? 'local';
}

export function persistMode(mode: StorageMode): void {
  window.localStorage.setItem(MODE_KEY, mode);
}

export function useStorage(user: AuthUser | null): { storage: TodoStorage; mode: StorageMode } {
  const mode: StorageMode = user ? 'cloud' : 'local';

  const storage = useMemo(() => getStorage(mode), [mode]);

  return { storage, mode };
}
