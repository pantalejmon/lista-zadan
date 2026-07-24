// Home-service module (Serwis domu) — cloud-only, scoped per household.

export type MaintenanceStatus = 'ok' | 'soon' | 'overdue' | 'none';

export interface Maintenance {
  id: string;
  assetId: string;
  type: string;
  intervalMonths: number | null;
  lastDoneAt: string | null;
  nextDueAt: string | null;
  cost: number | null;
  notes: string | null;
  providerId: string | null;
  providerName: string | null;
  status: MaintenanceStatus;
  daysUntilDue: number | null;
  createdAt: number;
}

export interface Provider {
  id: string;
  name: string;
  trade: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: number;
}

export interface ProviderInput {
  name: string;
  trade?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type RenovationStatus = 'planned' | 'in_progress' | 'done';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Renovation {
  id: string;
  title: string;
  status: RenovationStatus;
  description: string | null;
  budget: number | null;
  cost: number | null;
  checklist: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
}

export interface RenovationInput {
  title: string;
  status?: RenovationStatus;
  description?: string;
  budget?: number;
  cost?: number;
  checklist?: { id?: string; text: string; done?: boolean }[];
}

export interface HomeAsset {
  id: string;
  name: string;
  type: string;
  location: string | null;
  installedAt: string | null;
  warrantyUntil: string | null;
  model: string | null;
  serial: string | null;
  notes: string | null;
  createdAt: number;
  maintenance: Maintenance[];
}

export interface AssetInput {
  name: string;
  type: string;
  location?: string;
  installedAt?: string;
  warrantyUntil?: string;
  model?: string;
  serial?: string;
  notes?: string;
}

export interface MaintenanceInput {
  assetId: string;
  type: string;
  intervalMonths?: number;
  lastDoneAt?: string;
  nextDueAt?: string;
  cost?: number;
  notes?: string;
  providerId?: string;
}

// Suggested asset types (freeform — the field accepts anything).
export const ASSET_TYPES = [
  'piec',
  'elektryka',
  'klimatyzacja',
  'wentylacja',
  'komin',
  'pompa ciepła',
  'fotowoltaika',
  'gaśnica',
  'woda / hydraulika',
  'inne',
];

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
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

export function getAssets(householdId: string): Promise<HomeAsset[]> {
  return request<HomeAsset[]>(`/home/assets?householdId=${encodeURIComponent(householdId)}`);
}

export function createAsset(householdId: string, input: AssetInput): Promise<HomeAsset> {
  return request<HomeAsset>(`/home/assets?householdId=${encodeURIComponent(householdId)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAsset(id: string, input: AssetInput): Promise<HomeAsset> {
  return request<HomeAsset>(`/home/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteAsset(id: string): Promise<void> {
  return request<void>(`/home/assets/${id}`, { method: 'DELETE' });
}

export function createMaintenance(householdId: string, input: MaintenanceInput): Promise<Maintenance> {
  return request<Maintenance>(`/home/maintenance?householdId=${encodeURIComponent(householdId)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateMaintenance(id: string, input: MaintenanceInput): Promise<Maintenance> {
  return request<Maintenance>(`/home/maintenance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function completeMaintenance(id: string, doneAt?: string, cost?: number): Promise<Maintenance> {
  return request<Maintenance>(`/home/maintenance/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ doneAt, cost }),
  });
}

export function deleteMaintenance(id: string): Promise<void> {
  return request<void>(`/home/maintenance/${id}`, { method: 'DELETE' });
}

// ---- providers (wykonawcy) ----

export function getProviders(householdId: string): Promise<Provider[]> {
  return request<Provider[]>(`/home/providers?householdId=${encodeURIComponent(householdId)}`);
}

export function createProvider(householdId: string, input: ProviderInput): Promise<Provider> {
  return request<Provider>(`/home/providers?householdId=${encodeURIComponent(householdId)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateProvider(id: string, input: ProviderInput): Promise<Provider> {
  return request<Provider>(`/home/providers/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteProvider(id: string): Promise<void> {
  return request<void>(`/home/providers/${id}`, { method: 'DELETE' });
}

// ---- renovations (remonty) ----

export function getRenovations(householdId: string): Promise<Renovation[]> {
  return request<Renovation[]>(`/home/renovations?householdId=${encodeURIComponent(householdId)}`);
}

export function createRenovation(householdId: string, input: RenovationInput): Promise<Renovation> {
  return request<Renovation>(`/home/renovations?householdId=${encodeURIComponent(householdId)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateRenovation(id: string, input: RenovationInput): Promise<Renovation> {
  return request<Renovation>(`/home/renovations/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteRenovation(id: string): Promise<void> {
  return request<void>(`/home/renovations/${id}`, { method: 'DELETE' });
}
