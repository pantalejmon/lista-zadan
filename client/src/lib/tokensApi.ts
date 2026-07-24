// Client for machine-token administration (MCP access). Session-only endpoints.

export interface ApiTokenSummary {
  id: string;
  name: string;
  scopes: string[];
  householdId: string | null;
  createdAt: number;
  expiresAt: number | null;
  lastUsedAt: number | null;
  revokedAt: number | null;
}

export interface ApiTokenCreated extends ApiTokenSummary {
  token: string;
}

export interface CreateTokenInput {
  name: string;
  scopes: string[];
  householdId?: string;
  expiresInDays?: number;
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

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

export function getTokens(): Promise<ApiTokenSummary[]> {
  return request<ApiTokenSummary[]>('/tokens');
}

export function getScopes(): Promise<string[]> {
  return request<{ scopes: string[] }>('/tokens/scopes').then((r) => r.scopes);
}

export function createToken(input: CreateTokenInput): Promise<ApiTokenCreated> {
  return request<ApiTokenCreated>('/tokens', { method: 'POST', body: JSON.stringify(input) });
}

export function revokeToken(id: string): Promise<void> {
  return request<void>(`/tokens/${id}`, { method: 'DELETE' });
}
