import { useMemo } from 'react';
import type { MealStorage } from '../lib/meals';
import { createCloudMealStorage } from '../lib/mealsApi';

// Posiłki są cloud-only i zawsze per gospodarstwo (w trybie lokalnym dostępne
// są wyłącznie Zadania). Dopóki gospodarstwo się nie wczytało, nie ma czego
// pokazywać — zwracamy null, a sekcja czeka.
export function useMealStorage(householdId?: string): MealStorage | null {
  return useMemo(() => (householdId ? createCloudMealStorage(householdId) : null), [householdId]);
}
