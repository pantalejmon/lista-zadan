// Jedyny wrapper na fetch: bazowy URL, ciasteczka sesji i zamiana błędu HTTP
// na wyjątek. Domenowe moduły API budują się na nim, zamiast każdy powtarzać
// obsługę `credentials` i statusów.
const API_URL = import.meta.env.VITE_API_URL ?? '/api';

// Status jest częścią błędu, bo wołający musi odróżnić „spróbuj ponownie"
// (sieć, 5xx) od „to nigdy nie przejdzie" (4xx). Bez tego synchronizacja offline
// ponawiała w nieskończoność operację, która nie miała szans się udać (#119).
export class ApiError extends Error {
  // Pole jawne, nie parametr konstruktora: klient ma `erasableSyntaxOnly`,
  // które zakazuje właściwości deklarowanych w liście parametrów.
  readonly status: number;

  constructor(status: number) {
    super(`API error: ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

