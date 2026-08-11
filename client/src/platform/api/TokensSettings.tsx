import { useState, useEffect } from 'react';
import type { Household } from './types';
import {
  getTokens,
  getScopes,
  createToken,
  revokeToken,
  type ApiTokenSummary,
  type ApiTokenCreated,
} from './tokensApi';

interface TokensSettingsProps {
  households: Household[];
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: '30 dni', value: 30 },
  { label: '90 dni', value: 90 },
  { label: '180 dni', value: 180 },
  { label: '1 rok', value: 365 },
  { label: 'Bez wygaśnięcia', value: 0 },
];

function fmtDate(ms: number | null): string {
  if (!ms) {
    return '—';
  }
  const d = new Date(ms);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function moduleOf(scope: string): string {
  return scope.split(':')[0];
}

export function TokensSettings({ households, onClose }: TokensSettingsProps) {
  const [tokens, setTokens] = useState<ApiTokenSummary[] | null>(null);
  const [allScopes, setAllScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<ApiTokenCreated | null>(null);
  const [copied, setCopied] = useState(false);

  // create-form state
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [householdId, setHouseholdId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(180);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Znacznik „teraz" ustawiany razem z listą, a nie liczony przy renderze:
  // `Date.now()` w renderze daje wynik zależny od tego, kiedy React akurat
  // przerysuje komponent.
  const [loadedAt, setLoadedAt] = useState(0);

  const load = () =>
    getTokens()
      .then((result) => {
        setTokens(result);
        setLoadedAt(Date.now());
      })
      .catch(() => setError('Nie udało się pobrać tokenów.'));

  useEffect(() => {
    load();
    getScopes().then(setAllScopes).catch(() => undefined);
  }, []);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedScopes.size === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createToken({
        name: name.trim(),
        scopes: [...selectedScopes],
        householdId: householdId || undefined,
        expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
      });
      setJustCreated(created);
      setName('');
      setSelectedScopes(new Set());
      setCreating(false);
      load();
    } catch {
      setError('Nie udało się utworzyć tokenu.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (token: ApiTokenSummary) => {
    if (!confirm(`Odwołać token „${token.name}"? Ta operacja jest nieodwracalna.`)) {
      return;
    }
    await revokeToken(token.id);
    load();
  };

  const copySecret = async () => {
    if (!justCreated) {
      return;
    }
    try {
      await navigator.clipboard.writeText(justCreated.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const scopeModules = [...new Set(allScopes.map(moduleOf))];
  const householdName = (id: string | null) =>
    id ? households.find((h) => h.id === id)?.name ?? 'inne gospodarstwo' : 'wszystkie';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 md:pb-0">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-semibold">Dostęp API / MCP</h2>
            <p className="text-xs text-gray-400">Tokeny dla agentów (np. Claude Cowork)</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Zamknij">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* One-time secret reveal */}
          {justCreated && (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 p-3">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">Token utworzony — skopiuj teraz</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mb-2">Sekret pokazujemy tylko raz. Wklej go do konfiguracji connectora.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 text-xs bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-2 py-1.5 overflow-x-auto whitespace-nowrap">{justCreated.token}</code>
                <button onClick={copySecret} className="shrink-0 text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600">
                  {copied ? 'Skopiowano' : 'Kopiuj'}
                </button>
              </div>
              <button onClick={() => setJustCreated(null)} className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 hover:underline">Ukryj</button>
            </div>
          )}

          {/* Existing tokens */}
          {tokens === null ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Brak tokenów. Utwórz pierwszy poniżej.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => {
                const expired = t.expiresAt !== null && t.expiresAt <= loadedAt;
                const inactive = t.revokedAt !== null || expired;
                return (
                  <li key={t.id} className={`rounded-xl border px-3 py-2.5 ${inactive ? 'border-gray-100 dark:border-gray-800 opacity-60' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{t.name}</span>
                      {t.revokedAt !== null ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400 shrink-0">odwołany</span>
                      ) : expired ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 shrink-0">wygasł</span>
                      ) : (
                        <button onClick={() => handleRevoke(t)} className="text-xs text-red-500 hover:underline shrink-0">Odwołaj</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.scopes.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">{s}</span>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {householdName(t.householdId)} · użyty: {fmtDate(t.lastUsedAt)} · wygasa: {t.expiresAt ? fmtDate(t.expiresAt) : 'nigdy'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Create form */}
          {creating ? (
            <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nazwa</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="np. Cowork laptop" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </label>

              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Uprawnienia (scope)</span>
                <div className="space-y-1.5">
                  {scopeModules.map((mod) => (
                    <div key={mod} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-300 w-24 shrink-0">{mod}</span>
                      {['read', 'write'].map((access) => {
                        const scope = `${mod}:${access}`;
                        if (!allScopes.includes(scope)) {
                          return <span key={scope} className="w-16" />;
                        }
                        return (
                          // Cały wiersz etykiety jest dotykalny — sam checkbox 14px był za mały na telefonie
                          <label key={scope} className="flex items-center gap-1.5 text-xs cursor-pointer px-2 py-2 -my-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                            <input type="checkbox" checked={selectedScopes.has(scope)} onChange={() => toggleScope(scope)} className="w-4 h-4 rounded" />
                            {access}
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gospodarstwo</span>
                  <select value={householdId} onChange={(e) => setHouseholdId(e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Wszystkie</option>
                    {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ważność</span>
                  <select value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2">
                <button type="button" onClick={() => setCreating(false)} className="flex-1 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Anuluj</button>
                <button type="submit" disabled={busy || !name.trim() || selectedScopes.size === 0} className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
                  {busy ? 'Tworzenie...' : 'Utwórz token'}
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => { setCreating(true); setJustCreated(null); }} className="w-full inline-flex items-center justify-center gap-1.5 text-sm bg-primary-500 text-white py-2.5 rounded-xl hover:bg-primary-600 active:scale-95 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
              </svg>
              Nowy token
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
