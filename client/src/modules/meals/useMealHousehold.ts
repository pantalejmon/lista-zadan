import { useState, useEffect, useCallback } from 'react';
import type { Household } from '@platform/households/household.types';

const STORAGE_KEY = 'lista-zadan:mealHouseholdId';

// Meals/pantry/shopping are per household, independent of the active todo list.
// Tracks which household the Posiłki section is currently showing.
export function useMealHousehold(households: Household[]) {
  const [mealHouseholdId, setIdRaw] = useState<string | null>(null);

  const setMealHouseholdId = useCallback((id: string | null) => {
    setIdRaw(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Keep the selection valid as households load/change; default to the first one.
  useEffect(() => {
    if (households.length === 0) {
      setIdRaw(null);
      return;
    }
    setIdRaw((prev) => {
      const saved = prev ?? localStorage.getItem(STORAGE_KEY);
      if (saved && households.some((h) => h.id === saved)) {
        return saved;
      }
      return households[0].id;
    });
  }, [households]);

  const mealHousehold = households.find((h) => h.id === mealHouseholdId) ?? null;

  return { mealHouseholdId, setMealHouseholdId, mealHousehold };
}
