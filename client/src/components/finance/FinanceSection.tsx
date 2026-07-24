import { useState, useEffect, useCallback } from 'react';
import {
  getWallets,
  createWallet,
  renameWallet,
  deleteWallet,
  formatCurrency,
  type Wallet,
} from '../../lib/financeApi';
import { useFinanceRealtime } from '../../hooks/useFinanceRealtime';
import { TransactionsView } from './TransactionsView';
import { RecurringView } from './RecurringView';
import { StatsView } from './StatsView';

interface FinanceSectionProps {
  householdId?: string;
}

type FinanceTab = 'transactions' | 'recurring' | 'stats';

const TABS: { id: FinanceTab; label: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  {
    id: 'transactions',
    label: 'Transakcje',
    Icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z" opacity="0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 10h10m0 0l-3-3m3 3l-3 3M17 14H7m0 0l3 3m-3-3l3-3" />
      </svg>
    ),
  },
  {
    id: 'recurring',
    label: 'Cykliczne',
    Icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-3m2 9a8 8 0 01-14 3" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'Statystyki',
    Icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6m4 6V5m4 14v-9M4 20h16" />
      </svg>
    ),
  },
];

export function FinanceSection({ householdId }: FinanceSectionProps) {
  const [tab, setTab] = useState<FinanceTab>('transactions');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveKey, setLiveKey] = useState(0);

  const load = useCallback(async () => {
    if (!householdId) {
      return;
    }
    const result = await getWallets(householdId);
    setWallets(result);
    setActiveWalletId((prev) => (prev && result.some((w) => w.id === prev) ? prev : result[0]?.id ?? null));
    setLoading(false);
  }, [householdId]);

  useEffect(() => { load(); }, [load]);
  useFinanceRealtime(householdId, Boolean(householdId), () => {
    load();
    setLiveKey((k) => k + 1);
  });

  const activeWallet = wallets.find((w) => w.id === activeWalletId) ?? null;

  const refresh = () => {
    load();
    setLiveKey((k) => k + 1);
  };

  return (
    <>
      {/* Sub-tab bar */}
      <div className="sticky top-14 z-10 backdrop-blur-xl bg-gray-50/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-lg mx-auto flex px-2">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-2.5 text-[11px] sm:text-xs font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto w-full px-4 py-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : wallets.length === 0 ? (
            <EmptyWallets householdId={householdId} onCreated={refresh} />
          ) : (
            <>
              <WalletBar
                wallets={wallets}
                activeWallet={activeWallet}
                householdId={householdId}
                onSelect={setActiveWalletId}
                onChanged={refresh}
              />

              {activeWallet && householdId && (
                <>
                  {tab === 'transactions' && (
                    <TransactionsView householdId={householdId} wallet={activeWallet} liveKey={liveKey} onChanged={refresh} />
                  )}
                  {tab === 'recurring' && (
                    <RecurringView householdId={householdId} wallet={activeWallet} liveKey={liveKey} onChanged={refresh} />
                  )}
                  {tab === 'stats' && (
                    <StatsView householdId={householdId} wallet={activeWallet} liveKey={liveKey} />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

function EmptyWallets({ householdId, onCreated }: { householdId?: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !householdId) {
      return;
    }
    setBusy(true);
    try {
      await createWallet(householdId, name.trim());
      setName('');
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-center py-12">
      <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 10a2 2 0 012-2h14a2 2 0 012 2m-18 0v8a2 2 0 002 2h14a2 2 0 002-2v-8m-5 4h2" />
      </svg>
      <p className="font-medium">Brak portfeli</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">
        Portfel to miejsce na transakcje — np. „Wspólny", „Gotówka", „Oszczędności".
      </p>
      <form onSubmit={submit} className="flex gap-2 max-w-sm mx-auto">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nazwa portfela..."
          className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="shrink-0 bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          Utwórz
        </button>
      </form>
    </div>
  );
}

function WalletBar({
  wallets,
  activeWallet,
  householdId,
  onSelect,
  onChanged,
}: {
  wallets: Wallet[];
  activeWallet: Wallet | null;
  householdId?: string;
  onSelect: (id: string) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || !householdId) {
      return;
    }
    const wallet = await createWallet(householdId, newName.trim());
    setNewName('');
    setCreating(false);
    setOpen(false);
    onSelect(wallet.id);
    onChanged();
  };

  const handleRename = async () => {
    if (!activeWallet) {
      return;
    }
    const name = prompt('Nowa nazwa portfela:', activeWallet.name);
    if (name?.trim()) {
      await renameWallet(activeWallet.id, name.trim());
      onChanged();
    }
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!activeWallet) {
      return;
    }
    if (!confirm(`Usunąć portfel „${activeWallet.name}" wraz z transakcjami i cyklicznymi?`)) {
      return;
    }
    await deleteWallet(activeWallet.id);
    setOpen(false);
    onChanged();
  };

  const balance = activeWallet?.balance ?? 0;

  return (
    <div className="mb-5">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 min-w-0 min-h-10 -my-1 text-left">
            <span className="text-sm font-semibold truncate">{activeWallet?.name ?? 'Portfel'}</span>
            <svg className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <span className={`text-xl font-bold tabular-nums shrink-0 ${
            balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          }`}>
            {formatCurrency(balance)}
          </span>
        </div>

        {open && (
          <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-2 space-y-1">
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => { onSelect(w.id); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-sm ${
                  w.id === activeWallet?.id
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="truncate">{w.name}</span>
                <span className="text-xs text-gray-400 tabular-nums shrink-0">{formatCurrency(w.balance)}</span>
              </button>
            ))}

            <div className="flex items-center gap-3 pt-1 px-2 text-xs">
              {creating ? (
                <div className="flex gap-2 flex-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleCreate(); } }}
                    placeholder="Nazwa portfela..."
                    className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button onClick={handleCreate} className="shrink-0 px-2 py-1 rounded-lg bg-primary-500 text-white">OK</button>
                </div>
              ) : (
                <>
                  <button onClick={() => setCreating(true)} className="text-primary-500 hover:underline">+ Nowy portfel</button>
                  <button onClick={handleRename} className="text-gray-500 dark:text-gray-400 hover:underline">Zmień nazwę</button>
                  <button onClick={handleDelete} className="text-red-500 hover:underline ml-auto">Usuń</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
