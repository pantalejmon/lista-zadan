// Stan połączenia i tryb pracy aplikacji — jedyne, co powłoka musi wiedzieć
// o synchronizacji. Sama synchronizacja i magazyn offline należą do Zadań
// (tryb lokalny obsługuje wyłącznie zadania), więc mieszkają w `modules/tasks/`.
// Te dwa typy zostają tutaj, żeby `ConnectionIndicator` i `ModeIndicator` nie
// musiały sięgać do domeny.

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type StorageMode = 'local' | 'cloud';

// Zmiana zrobiona offline, której serwer nigdy nie przyjmie. Kształt jest tutaj,
// bo pokazuje ją powłoka (`AppSidebar`), a wypełnia domena — powłoka nie może
// importować z `modules/`.
export interface RejectedChange {
  // Co przepadło, słowami użytkownika — zwykle treść zadania.
  description: string;
  // Dlaczego, w formie nadającej się na ekran, a nie kod HTTP.
  reason: string;
}

export function isOnline(): boolean {
  return navigator.onLine;
}
