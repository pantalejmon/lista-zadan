import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCategories,
  formatCurrency,
  formatMoment,
  type Transaction,
  type Wallet,
} from '../../lib/financeApi';

interface TransactionsViewProps {
  householdId: string;
  wallet: Wallet;
  liveKey: number;
  onChanged: () => void;
}

const inputClass =
  'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export function TransactionsView({ householdId, wallet, liveKey, onChanged }: TransactionsViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('');

  const load = useCallback(async () => {
    setTransactions(await getTransactions(householdId, wallet.id));
    setLoading(false);
  }, [householdId, wallet.id]);

  useEffect(() => { load(); }, [load, liveKey]);
  useEffect(() => { getCategories().then(setCategories).catch(() => undefined); }, []);

  const usedCategories = useMemo(() => {
    const used = new Set(transactions.map((t) => t.category).filter((c): c is string => Boolean(c)));
    return [...used].sort((a, b) => a.localeCompare(b, 'pl'));
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(q));
    }
    if (filterType === 'income') {
      result = result.filter((t) => t.amount > 0);
    } else if (filterType === 'expense') {
      result = result.filter((t) => t.amount < 0);
    }
    if (filterCategory) {
      result = result.filter((t) => t.category === filterCategory);
    }
    return result;
  }, [transactions, search, filterType, filterCategory]);

  const handleDelete = async (tx: Transaction) => {
    if (!confirm(`Usunąć „${tx.description}"?`)) {
      return;
    }
    await deleteTransaction(tx.id);
    load();
    onChanged();
  };

  const hasFilters = Boolean(search.trim()) || filterType !== 'all' || Boolean(filterCategory);

  return (
    <div className="space-y-4">
      <AddTransactionForm
        householdId={householdId}
        walletId={wallet.id}
        categories={categories}
        onAdded={() => { load(); onChanged(); }}
      />

      {transactions.length > 0 && (
        <div className="space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj transakcji..."
            className={inputClass}
          />
          <div className="flex gap-2">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)} className={inputClass}>
              <option value="all">Wszystkie</option>
              <option value="income">Przychody</option>
              <option value="expense">Wydatki</option>
            </select>
            {usedCategories.length > 0 && (
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inputClass}>
                <option value="">Wszystkie kategorie</option>
                {usedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
          {hasFilters ? 'Brak wyników — zmień filtry.' : 'Brak transakcji. Dodaj pierwszą powyżej.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              categories={categories}
              onSaved={() => { load(); onChanged(); }}
              onDelete={() => handleDelete(tx)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddTransactionForm({
  householdId,
  walletId,
  categories,
  onAdded,
}: {
  householdId: string;
  walletId: string;
  categories: string[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isExpense, setIsExpense] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0 || !description.trim()) {
      return;
    }
    setBusy(true);
    try {
      await createTransaction(householdId, {
        walletId,
        amount: isExpense ? -parsed : parsed,
        description: description.trim(),
        category: category || undefined,
      });
      setAmount('');
      setDescription('');
      setCategory('');
      setOpen(false);
      onAdded();
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => { setIsExpense(false); setOpen(true); }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-500/30 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
          Przychód
        </button>
        <button
          onClick={() => { setIsExpense(true); setOpen(true); }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-red-200 dark:border-red-500/30 text-sm font-medium text-red-500 dark:text-red-400 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-[0.98] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
          Wydatek
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 animate-fade-in">
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
      <input
        autoFocus
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Kwota (PLN)"
        className={inputClass}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Opis transakcji"
        className={inputClass}
      />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
        <option value="">Bez kategorii</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={busy || !amount.trim() || !description.trim()}
          className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 active:scale-95 transition-all"
        >
          {busy ? 'Dodawanie...' : 'Dodaj'}
        </button>
      </div>
    </form>
  );
}

function TransactionRow({
  transaction,
  categories,
  onSaved,
  onDelete,
}: {
  transaction: Transaction;
  categories: string[];
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(Math.abs(transaction.amount).toString());
  const [description, setDescription] = useState(transaction.description);
  const [category, setCategory] = useState(transaction.category ?? '');
  const [busy, setBusy] = useState(false);

  const isExpense = transaction.amount < 0;

  const save = async () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0 || !description.trim()) {
      return;
    }
    setBusy(true);
    try {
      await updateTransaction(transaction.id, {
        amount: isExpense ? -parsed : parsed,
        description: description.trim(),
        category: category || undefined,
      });
      setEditing(false);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <li className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={inputClass} />
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">Bez kategorii</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
            Anuluj
          </button>
          <button onClick={save} disabled={busy} className="flex-1 bg-primary-500 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
            Zapisz
          </button>
        </div>
      </li>
    );
  }

  return (
    // Dwa poziomy: opis + kwota, a niżej metadane i akcje. W jednym wierszu
    // kwota i dwie ikony zjadały opis („Biedronka duże zaku…") na telefonie.
    <li className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-2.5">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-medium break-words min-w-0 flex-1">{transaction.description}</span>
        <span className={`text-sm font-semibold tabular-nums shrink-0 ${
          isExpense ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {formatCurrency(transaction.amount)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-gray-400 shrink-0">{formatMoment(transaction.occurredAt)}</span>
        {transaction.category && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 truncate">
            {transaction.category}
          </span>
        )}
        {transaction.recurringId && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0" title="Z transakcji cyklicznej">
            cykliczna
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto shrink-0 -mr-2">
          <button onClick={() => setEditing(true)} className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Edytuj">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label="Usuń">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}
