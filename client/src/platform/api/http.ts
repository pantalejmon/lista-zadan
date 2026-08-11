// Jedyny wrapper na fetch: bazowy URL, ciasteczka sesji i zamiana błędu HTTP
// na wyjątek. Domenowe moduły API budują się na nim, zamiast każdy powtarzać
// obsługę `credentials` i statusów.
const API_URL = import.meta.env.VITE_API_URL ?? '/api';

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
    throw new Error(`API error: ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

