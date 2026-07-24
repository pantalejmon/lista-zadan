const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export interface ChatMessage {
  id: string;
  householdId: string;
  userId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export function getMessages(householdId: string, before?: number): Promise<ChatMessage[]> {
  const q = before ? `?before=${before}` : '';
  return request<ChatMessage[]>(`/households/${householdId}/messages${q}`);
}

export function sendMessage(householdId: string, text: string): Promise<ChatMessage> {
  return request<ChatMessage>(`/households/${householdId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}
