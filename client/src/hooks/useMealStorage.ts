import { useMemo } from 'react';
import { localMealStorage, type MealStorage } from '../lib/meals';
import { createCloudMealStorage } from '../lib/mealsApi';
import type { StorageMode } from '../lib/storage';

// Cloud mode persists meals to the active household (shared with all members);
// local mode keeps them in this browser's IndexedDB.
export function useMealStorage(mode: StorageMode, householdId?: string): MealStorage {
  return useMemo(() => {
    if (mode === 'cloud' && householdId) {
      return createCloudMealStorage(householdId);
    }
    return localMealStorage;
  }, [mode, householdId]);
}
