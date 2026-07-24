// Suggested transaction categories (ported from the standalone finance app).
// Freeform on the API — this list only drives UI hints and chart colours.
export const FINANCE_CATEGORIES = [
  'Jedzenie',
  'Transport',
  'Rozrywka',
  'Rachunki',
  'Zdrowie',
  'Zakupy',
  'Dom',
  'Edukacja',
  'Praca',
  'Inne',
] as const;

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly'];

// Money is kept as PLN with 2 decimals; every write rounds to grosze so stored
// values stay exact and sums don't drift.
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
