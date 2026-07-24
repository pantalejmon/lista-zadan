import { useState, useEffect, useCallback } from 'react';
import {
  getRecurring,
  createRecurring,
  deleteRecurring,
  getCategories,
  formatCurrency,
  formatIsoDate,
  FREQUENCY_LABELS,
  type RecurringTransaction,
  type RecurrenceFrequency,
  type Wallet,
} from '../../lib/financeApi';

interface RecurringViewProps {
  householdId: string;
  wallet: Wallet;
  liveKey: number;
  onChanged: () => void;
}

const inputClass =
  'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export function RecurringView({ householdId, wallet, liveKey, onChanged }: RecurringViewProps) {
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const all = await getRecurring(householdId);
    setRules(all.filter((r) => r.walletId === wallet.id));
    setLoading(false);
  }, [householdId, wallet.id]);

  useEffect(() => { load(); }, [load, liveKey]);
  useEffect(() => { getCategories().then(setCategories).catch(() => undefined); }, []);

  const handleDelete = async (rule: RecurringTransaction) => {
    if (!confirm(`Usunąć regułę „${rule.description}"? Dotychczasowe transakcje zostaną nietknięte.`)) {
      return;
    }
    await deleteRecurring(rule.id);
    load();
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Rachunki, pensja, subskrypcje — dopisują się same, także zaległe.
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-1.5 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
            Dodaj
          </button>
        )}
      </div>

      {adding && (
        <RecurringForm
          householdId={householdId}
          walletId={wallet.id}
          categories={categories}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); onChanged(); }}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : rules.length === 0 && !adding ? (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
          Brak transakcji cyklicznych w tym portfelu.
        </p>
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{rule.description}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
                    {FREQUENCY_LABELS[rule.frequency]}
                  </span>
                  {rule.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      {rule.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">następna: {formatIsoDate(rule.nextDueAt)}</p>
              </div>
              <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                rule.amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {formatCurrency(rule.amount)}
              </span>
              <button
                onClick={() => handleDelete(rule)}
                className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
                aria-label="Usuń regułę"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecurringForm({
  householdId,
  walletId,
  categories,
  onClose,
  onSaved,
}: {
  householdId: string;
  walletId: string;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isExpense, setIsExpense] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [nextDueAt, setNextDueAt] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0 || !description.trim()) {
      return;
    }
    setBusy(true);
    try {
      await createRecurring(householdId, {
        walletId,
        amount: isExpense ? -parsed : parsed,
        description: description.trim(),
        category: category || undefined,
        frequency,
        nextDueAt: nextDueAt || undefined,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsExpense(false)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            !isExpense ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          + Przychód
        </button>
        <button
          type="button"
          onClick={() => setIsExpense(true)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            isExpense ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          − Wydatek
        </button>
      </div>
      <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Kwota (PLN)" className={inputClass} />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opis (np. Netflix, Pensja)" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)} className={inputClass}>
          <option value="daily">Codziennie</option>
          <option value="weekly">Co tydzień</option>
          <option value="monthly">Co miesiąc</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">Bez kategorii</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <label className="block">
        <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pierwsza/następna data (puste = od jutra)</span>
        <input type="date" value={nextDueAt} onChange={(e) => setNextDueAt(e.target.value)} className={inputClass} />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
          Anuluj
        </button>
        <button type="submit" disabled={busy || !amount.trim() || !description.trim()} className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
          {busy ? 'Zapisywanie...' : 'Zapisz'}
        </button>
      </div>
    </form>
  );
}
