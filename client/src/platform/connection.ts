// Stan połączenia i tryb pracy aplikacji — jedyne, co powłoka musi wiedzieć
// o synchronizacji. Sama synchronizacja i magazyn offline należą do Zadań
// (tryb lokalny obsługuje wyłącznie zadania), więc mieszkają w `modules/tasks/`.
// Te dwa typy zostają tutaj, żeby `ConnectionIndicator` i `ModeIndicator` nie
// musiały sięgać do domeny.

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type StorageMode = 'local' | 'cloud';

export function isOnline(): boolean {
  return navigator.onLine;
}
