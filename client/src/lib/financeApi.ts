// Finance module (Finanse) — cloud-only, scoped per household.
// Ported from the standalone „finansowy-notatnik" app; amounts are PLN with
// positive = income, negative = expense.

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  transactionCount: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  description: string;
  category: string | null;
  occurredAt: number;
  recurringId: string | null;
  createdAt: number;
}

export interface TransactionInput {
  walletId: string;
  amount: number;
  description: string;
  category?: string;
  occurredAt?: number;
}

export interface TransactionPatch {
  amount?: number;
  description?: string;
  category?: string;
  occurredAt?: number;
}

export interface RecurringTransaction {
  id: string;
  walletId: string;
  amount: number;
  description: string;
  category: string | null;
  frequency: RecurrenceFrequency;
  nextDueAt: string;
  createdAt: number;
}

export interface RecurringInput {
  walletId: string;
  amount: number;
  description: string;
  category?: string;
  frequency: RecurrenceFrequency;
  nextDueAt?: string;
}

export interface FinanceStats {
  income: number;
  expenses: number;
  balance: number;
  byCategory: { category: string; total: number }[];
  trend: { at: number; balance: number }[];
}

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  monthly: 'Co miesiąc',
};

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

const hh = (householdId: string) => encodeURIComponent(householdId);

export function getCategories(): Promise<string[]> {
  return request<{ categories: string[] }>('/finance/categories').then((r) => r.categories);
}

// ---- wallets ----

export function getWallets(householdId: string): Promise<Wallet[]> {
  return request<Wallet[]>(`/finance/wallets?householdId=${hh(householdId)}`);
}

export function createWallet(householdId: string, name: string): Promise<Wallet> {
  return request<Wallet>(`/finance/wallets?householdId=${hh(householdId)}`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function renameWallet(id: string, name: string): Promise<Wallet> {
  return request<Wallet>(`/finance/wallets/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
}

export function deleteWallet(id: string): Promise<void> {
  return request<void>(`/finance/wallets/${id}`, { method: 'DELETE' });
}

// ---- transactions ----

export function getTransactions(householdId: string, walletId?: string): Promise<Transaction[]> {
  const wallet = walletId ? `&walletId=${encodeURIComponent(walletId)}` : '';
  return request<Transaction[]>(`/finance/transactions?householdId=${hh(householdId)}${wallet}`);
}

export function createTransaction(householdId: string, input: TransactionInput): Promise<Transaction> {
  return request<Transaction>(`/finance/transactions?householdId=${hh(householdId)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTransaction(id: string, patch: TransactionPatch): Promise<Transaction> {
  return request<Transaction>(`/finance/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteTransaction(id: string): Promise<void> {
  return request<void>(`/finance/transactions/${id}`, { method: 'DELETE' });
}

// ---- recurring ----

export function getRecurring(householdId: string): Promise<RecurringTransaction[]> {
  return request<RecurringTransaction[]>(`/finance/recurring?householdId=${hh(householdId)}`);
}

export function createRecurring(householdId: string, input: RecurringInput): Promise<RecurringTransaction> {
  return request<RecurringTransaction>(`/finance/recurring?householdId=${hh(householdId)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteRecurring(id: string): Promise<void> {
  return request<void>(`/finance/recurring/${id}`, { method: 'DELETE' });
}

// ---- stats ----

export function getStats(householdId: string, walletId?: string): Promise<FinanceStats> {
  const wallet = walletId ? `&walletId=${encodeURIComponent(walletId)}` : '';
  return request<FinanceStats>(`/finance/stats?householdId=${hh(householdId)}${wallet}`);
}

// ---- formatting ----

const currencyFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
const dateTimeFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const dayFormatter = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' });

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatMoment(epochMs: number): string {
  return dateTimeFormatter.format(new Date(epochMs));
}

export function formatDay(epochMs: number): string {
  return dayFormatter.format(new Date(epochMs));
}

export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
