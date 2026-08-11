import { TodoResponse } from './todo.response';

// Wynik pojedynczej operacji synchronizacji. Batch nie jest transakcją — jedna
// operacja nie może przewrócić pozostałych, bo klient trzyma je w kolejce
// w IndexedDB i po nieudanym żądaniu wysyła **tę samą** paczkę w kółko.
//
// - `applied`  — zapisane, klient usuwa wpis z kolejki,
// - `rejected` — nigdy się nie uda (brak listy, brak uprawnień, przekroczony
//                limit): klient usuwa wpis i mówi użytkownikowi, co przepadło,
// - `failed`   — błąd przejściowy (baza, 5xx): wpis zostaje w kolejce do ponowienia.
export type SyncOutcome = 'applied' | 'rejected' | 'failed';

export interface SyncOperationResultResponse {
  status: SyncOutcome;
  // Stan zadania po stronie serwera — tylko dla `applied`.
  todo?: TodoResponse;
  // Krótkie, zrozumiałe dla użytkownika uzasadnienie — dla `rejected` i `failed`.
  reason?: string;
}
